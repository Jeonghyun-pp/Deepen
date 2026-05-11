"use client"

/**
 * PdfPenCanvas — PDF + 펜 잉크가 **단일 tldraw 캔버스** 안에서 동작.
 *
 * 근본 원인 (이전 구현 = "absolute overlay" 패턴):
 *   - react-pdf 의 <Page> 캔버스 + tldraw 의 캔버스를 형제 노드로 stacking
 *   - 두 GPU 컴포지터 레이어 → 페인트 클럭이 다르고 (1~2 프레임 지연)
 *   - DPR 라운딩이 sub-px drift 를 만들어 잉크가 "떠 있는" 느낌
 *   - 두 layer 가 자기 transform 을 갖기 때문에 스크롤·줌이 분리됨
 *
 * 새 패턴 (Goodnotes Web · tldraw PDF editor):
 *   - pdfjs 로 페이지 → 비트맵 PNG → tldraw image asset / locked image shape 으로 캔버스 안에 배치
 *   - 펜 잉크 (draw shape) 는 같은 카메라 위에 stack
 *   - 한 transform · 한 paint frame · 한 z-stack → "종이 위에 쓰는" 느낌 복원
 *   - 카메라는 페이지 bounds 로 contain — 사용자가 패닝/줌 해도 PDF 가 같이 따라옴
 *
 * 추가 정보:
 *   - tldraw 의 draw 도구는 perfect-freehand (가변 폭 Catmull-Rom) — 압력 입력 자동 활용
 *   - hideUi=true 로 tldraw 자체 UI 숨김 + 우리 PencilToolbar 만 노출
 *   - autosave 는 store.listen 으로 debounce 2s. 잉크만 저장 (PDF image 는 다시 렌더하므로 stale 방지)
 */

import { useCallback, useEffect, useRef, useState } from "react"
import {
  type Editor,
  type TLAssetId,
  type TLEditorSnapshot,
  type TLShapeId,
  DefaultColorStyle,
  DefaultSizeStyle,
  Tldraw,
  getSnapshot,
  loadSnapshot,
} from "tldraw"
import { AssetRecordType, createShapeId } from "tldraw"
import "tldraw/tldraw.css"
import {
  exportDrawingToPng,
  ExportEmptyError,
  ExportTooLargeError,
} from "@/lib/pencil/export-png"
import {
  deleteDrawingSnapshot,
  loadDrawingSnapshot,
  saveDrawingSnapshot,
} from "@/lib/pencil/persistence"
import {
  renderPdfPageBitmap,
  type PdfPageBitmap,
} from "@/lib/pencil/pdf-to-asset"
import {
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  type PenColorKey,
  type PenSizeKey,
} from "@/lib/pencil/tools-config"
import { PencilToolbar } from "@/app/v2/solve/[itemId]/_components/PencilToolbar"

const AUTOSAVE_DEBOUNCE_MS = 2000
// tldraw 카메라 좌표계에서 PDF 한 페이지가 차지할 폭 (CSS px).
// 잉크 좌표 정밀도와 메모리 사이의 trade-off — 1200 은 A4 페이지 비율과 좌표 정밀도 균형.
const PDF_PAGE_WIDTH = 1200

const COLOR_MAP: Record<PenColorKey, "black" | "blue" | "red"> = {
  black: "black",
  blue: "blue",
  red: "red",
}
const SIZE_MAP: Record<PenSizeKey, "s" | "m" | "l"> = {
  thin: "s",
  mid: "m",
  thick: "l",
}

export interface PdfPenCanvasProps {
  itemId: string
  userId: string
  signedUrl: string
  title: string
  onExport: (pngBase64: string | null) => void
  onClearAttachment?: () => void
}

export function PdfPenCanvas({
  itemId,
  userId,
  signedUrl,
  title,
  onExport,
  onClearAttachment,
}: PdfPenCanvasProps) {
  const editorRef = useRef<Editor | null>(null)
  const pdfShapeIdRef = useRef<TLShapeId | null>(null)
  const pdfAssetIdRef = useRef<TLAssetId | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tldraw onMount 도착 신호 — render effect 가 editorRef 의 null 체크만으로는
  // mount 이후 한 번 더 실행되지 않으므로 boolean state 로 dep 에 노출.
  const [editorReady, setEditorReady] = useState(false)

  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pdfLoading, setPdfLoading] = useState(true)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const [color, setColor] = useState<PenColorKey>(DEFAULT_COLOR)
  const [size, setSize] = useState<PenSizeKey>(DEFAULT_SIZE)
  const [exporting, setExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [attached, setAttached] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // 이전 풀이 snapshot 1회 로드 — mount 전 준비.
  const [initialSnapshot, setInitialSnapshot] =
    useState<TLEditorSnapshot | null>(null)
  const [snapshotReady, setSnapshotReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const snap = await loadDrawingSnapshot({ userId, itemId })
        if (!cancelled) {
          setInitialSnapshot(snap)
          setSnapshotReady(true)
        }
      } catch {
        if (!cancelled) setSnapshotReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, itemId])

  // PDF 페이지 → tldraw image asset + locked shape 으로 swap. 기존 PDF shape 는 정리.
  // 잉크 shape 는 보존.
  const replacePdfPage = useCallback(
    async (editor: Editor, bitmap: PdfPageBitmap) => {
      if (pdfShapeIdRef.current) {
        try {
          editor.deleteShapes([pdfShapeIdRef.current])
        } catch {
          /* already gone */
        }
        pdfShapeIdRef.current = null
      }

      const assetId = AssetRecordType.createId() as TLAssetId
      editor.createAssets([
        {
          id: assetId,
          typeName: "asset",
          type: "image",
          props: {
            name: `pdf-page-${pageNumber}`,
            src: bitmap.dataUrl,
            w: bitmap.width,
            h: bitmap.height,
            mimeType: "image/png",
            isAnimated: false,
          },
          meta: {},
        },
      ])

      const shapeId = createShapeId() as TLShapeId
      editor.createShape({
        id: shapeId,
        type: "image",
        x: 0,
        y: 0,
        isLocked: true,
        props: {
          assetId,
          w: bitmap.width,
          h: bitmap.height,
        },
      })
      // 잉크가 위에 보이도록 PDF 는 맨 뒤
      editor.sendToBack([shapeId])

      pdfShapeIdRef.current = shapeId
      pdfAssetIdRef.current = assetId

      // 카메라를 페이지에 fit. behavior=contain → 줌 아웃해도 페이지가 화면 안에 남음.
      editor.setCameraOptions({
        isLocked: false,
        panSpeed: 1,
        zoomSpeed: 1,
        zoomSteps: [0.5, 1, 2, 3, 5],
        wheelBehavior: "pan",
        constraints: {
          initialZoom: "fit-max-100",
          baseZoom: "default",
          bounds: { x: 0, y: 0, w: bitmap.width, h: bitmap.height },
          padding: { x: 16, y: 16 },
          origin: { x: 0.5, y: 0.5 },
          behavior: "contain",
        },
      })
      // 새 옵션 적용 + 페이지에 맞춰 리셋
      editor.setCamera(editor.getCamera(), { reset: true })
    },
    [pageNumber],
  )

  // 페이지 또는 signedUrl 변경 시 PDF 렌더
  useEffect(() => {
    if (!snapshotReady || !editorReady) return
    const editor = editorRef.current
    if (!editor) return
    let cancelled = false
    setPdfLoading(true)
    setPdfError(null)
    ;(async () => {
      try {
        const bitmap = await renderPdfPageBitmap({
          signedUrl,
          pageNumber,
          targetWidthCss: PDF_PAGE_WIDTH,
        })
        if (cancelled || !editorRef.current) return
        setNumPages(bitmap.numPages)
        await replacePdfPage(editorRef.current, bitmap)
      } catch (e) {
        if (!cancelled) {
          setPdfError((e as Error).message ?? "render_error")
          console.warn("[PdfPenCanvas] PDF 렌더 실패", e)
        }
      } finally {
        if (!cancelled) setPdfLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [signedUrl, pageNumber, snapshotReady, editorReady, replacePdfPage])

  const applyStyle = useCallback(
    (editor: Editor, c: PenColorKey, s: PenSizeKey) => {
      editor.setStyleForNextShapes(DefaultColorStyle, COLOR_MAP[c])
      editor.setStyleForNextShapes(DefaultSizeStyle, SIZE_MAP[s])
    },
    [],
  )

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor
      editor.setCurrentTool("draw")

      // 이전 세션 snapshot 복원 (잉크 + 혹시 모를 stale image shape)
      if (initialSnapshot) {
        try {
          loadSnapshot(editor.store, initialSnapshot)
        } catch (e) {
          console.warn("[PdfPenCanvas] snapshot 복원 실패", e)
        }
      }
      // stale PDF image shape 제거 — fresh dataURL 로 다시 렌더한다.
      const staleImages = editor
        .getCurrentPageShapes()
        .filter((s) => s.type === "image")
        .map((s) => s.id)
      if (staleImages.length > 0) editor.deleteShapes(staleImages)

      applyStyle(editor, color, size)

      // autosave 구독 — debounce 2s
      editor.store.listen(
        () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(() => {
            const snap = getSnapshot(editor.store)
            void saveDrawingSnapshot({ userId, itemId, snapshot: snap }).then(
              () => setSavedAt(Date.now()),
            )
          }, AUTOSAVE_DEBOUNCE_MS)
        },
        { scope: "document", source: "user" },
      )

      // 렌더 effect 트리거
      setEditorReady(true)
    },
    // applyStyle/color/size 는 별도 effect 에서 동기화하므로 mount cb 에서 빠짐
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialSnapshot, userId, itemId],
  )

  // color/size 변경 → editor 에 즉시 반영
  useEffect(() => {
    const editor = editorRef.current
    if (editor) applyStyle(editor, color, size)
  }, [applyStyle, color, size])

  // unmount cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleUndo = () => editorRef.current?.undo()
  const handleRedo = () => editorRef.current?.redo()

  const handleClear = () => {
    const editor = editorRef.current
    if (!editor) return
    // 잉크만 삭제 — PDF image shape 는 유지.
    const inkIds = editor
      .getCurrentPageShapes()
      .filter((s) => s.type !== "image")
      .map((s) => s.id)
    if (inkIds.length > 0) editor.deleteShapes(inkIds)
    setAttached(false)
    setErrorMsg(null)
    onClearAttachment?.()
    void deleteDrawingSnapshot({ userId, itemId })
    setSavedAt(null)
  }

  const handleExport = async () => {
    const editor = editorRef.current
    if (!editor) return
    setExporting(true)
    setErrorMsg(null)
    try {
      // 잉크 shape 만 export — PDF image 가 함께 잡히면 OCR 이 PDF 글자까지 읽음.
      const inkIds = editor
        .getCurrentPageShapes()
        .filter((s) => s.type !== "image")
        .map((s) => s.id)
      const dataUrl = await exportDrawingToPng(editor, inkIds)
      onExport(dataUrl)
      setAttached(true)
    } catch (e) {
      if (e instanceof ExportEmptyError) {
        setErrorMsg("풀이가 비어 있어요. 한 줄이라도 적어 보세요.")
      } else if (e instanceof ExportTooLargeError) {
        setErrorMsg("이미지가 너무 커요. 풀이를 줄이고 다시 시도해 주세요.")
      } else {
        setErrorMsg("내보내기 실패. 다시 시도해 주세요.")
      }
    } finally {
      setExporting(false)
    }
  }

  const total = numPages ?? 0
  const canPrev = pageNumber > 1
  const canNext = total > 0 && pageNumber < total

  return (
    <section
      className="flex h-full flex-col bg-white"
      data-testid="pdf-pen-canvas"
    >
      {/* 헤더 — 페이지 nav + 문서명 */}
      <div className="flex items-center justify-between border-b border-black/8 px-4 py-2 text-[11px] text-black/55 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <span>📄</span>
          <span className="truncate">{title}</span>
          <span className="text-black/25">·</span>
          <span className="font-mono">
            p. {pageNumber}
            {total > 0 ? ` / ${total}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={!canPrev || pdfLoading}
            className="rounded px-2 py-0.5 text-black/55 hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ‹ 이전
          </button>
          <button
            type="button"
            onClick={() =>
              setPageNumber((p) =>
                total > 0 ? Math.min(total, p + 1) : p + 1,
              )
            }
            disabled={!canNext || pdfLoading}
            className="rounded px-2 py-0.5 text-black/55 hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음 ›
          </button>
        </div>
      </div>

      {/* 펜슬 툴바 — 색/굵기/undo/redo/clear/export */}
      <PencilToolbar
        color={color}
        size={size}
        busy={exporting}
        onColorChange={setColor}
        onSizeChange={setSize}
        onClear={handleClear}
        onExport={handleExport}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 캔버스 — PDF + 펜 잉크가 같은 tldraw 카메라 안에 stack */}
      <div className="relative flex-1 min-h-0 bg-zinc-100/60">
        {snapshotReady && (
          <Tldraw
            hideUi
            onMount={handleMount}
          />
        )}
        {pdfLoading && (
          <div
            className="pointer-events-none absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-white/85 px-3 py-1 text-[11px] text-black/55 backdrop-blur-sm"
            aria-live="polite"
          >
            PDF 페이지 렌더 중…
          </div>
        )}
        {pdfError && (
          <div
            className="absolute inset-x-4 top-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-800"
            role="alert"
          >
            PDF 로드 실패: {pdfError}
          </div>
        )}
      </div>

      {/* 풋터 — 저장 / 첨부 / 에러 상태 */}
      {(attached || errorMsg || savedAt) && (
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-zinc-50 px-3 py-1.5 text-[11px] text-black/55 shrink-0">
          <span>
            {savedAt
              ? `자동 저장됨 ${new Date(savedAt).toLocaleTimeString("ko-KR", { hour12: false })}`
              : "자동 저장 대기"}
          </span>
          {attached && (
            <span
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
              data-testid="pencil-attached"
            >
              풀이 첨부됨
            </span>
          )}
          {errorMsg && (
            <span
              className="text-rose-700"
              role="alert"
              data-testid="pencil-error"
            >
              {errorMsg}
            </span>
          )}
        </footer>
      )}
    </section>
  )
}
