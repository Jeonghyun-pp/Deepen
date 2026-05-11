"use client"

/**
 * PencilPanel — 풀이 화면 펜슬 영역.
 * Spec: docs/build-spec/08-q2-build.md M2.1.
 *
 * 흐름:
 *   1. mount 시 Storage 에서 snapshot 로드 → editor.loadSnapshot 으로 복원
 *   2. PencilToolbar 토글 → editor.setStyleForNextShapes (Q2 polish)
 *   3. drawing 변경 시 debounce 2s → Storage 자동 저장
 *   4. "풀이 첨부" → exportDrawingToPng → onExport(base64)
 *   5. SolveClient 가 attempts payload.ocrImageBase64 에 담아 제출
 *
 * 새로고침 후 같은 itemId 진입 → 자동 복원. 다른 사용자는 RLS 로 격리.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { Editor, TLEditorSnapshot } from "tldraw"
import { getSnapshot } from "tldraw"
import { PencilCanvasHost } from "@/lib/pencil/canvas-host"
import {
  exportDrawingToPng,
  ExportEmptyError,
  ExportTooLargeError,
} from "@/lib/pencil/export-png"
import {
  loadDrawingSnapshot,
  saveDrawingSnapshot,
  deleteDrawingSnapshot,
} from "@/lib/pencil/persistence"
import {
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  type PenColorKey,
  type PenSizeKey,
} from "@/lib/pencil/tools-config"
import { PencilToolbar } from "./PencilToolbar"

const AUTOSAVE_DEBOUNCE_MS = 2000

export interface PencilPanelProps {
  itemId: string
  userId: string
  /** "풀이 첨부" 클릭 시 PNG base64 를 SolveClient 가 받는다. */
  onExport: (pngBase64: string | null) => void
  /** 빈 캔버스로 첨부 해제. */
  onClearAttachment?: () => void
  /**
   * 레이아웃 변종 (lock #7, Phase 4):
   *   - 'panel' (default): 자체 카드 (border + h-[420px]). standalone /v2/solve.
   *   - 'overlay': absolute inset-0. 워크스페이스의 PDF body 위에 얹어 직접 그림.
   */
  variant?: "panel" | "overlay"
}

type LoadStatus = "idle" | "loading" | "loaded" | "error"

export function PencilPanel({
  itemId,
  userId,
  onExport,
  onClearAttachment,
  variant = "panel",
}: PencilPanelProps) {
  const editorRef = useRef<Editor | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [color, setColor] = useState<PenColorKey>(DEFAULT_COLOR)
  const [size, setSize] = useState<PenSizeKey>(DEFAULT_SIZE)
  const [exporting, setExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [attached, setAttached] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // 1) mount 시 1회 Storage 로드 (initialSnapshot prop 으로 host 에 전달)
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle")
  const [initialSnapshot, setInitialSnapshot] =
    useState<TLEditorSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoadStatus("loading")
    ;(async () => {
      try {
        const snap = await loadDrawingSnapshot({ userId, itemId })
        if (!cancelled) {
          setInitialSnapshot(snap)
          setLoadStatus("loaded")
        }
      } catch {
        if (!cancelled) setLoadStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, itemId])

  // 2) 변경 시 debounced autosave
  const handleChange = useCallback(
    (editor: Editor) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const snap = getSnapshot(editor.store)
        void saveDrawingSnapshot({ userId, itemId, snapshot: snap }).then(
          () => setSavedAt(Date.now()),
        )
      }, AUTOSAVE_DEBOUNCE_MS)
    },
    [userId, itemId],
  )

  // unmount 시 timer cleanup
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    // 색·굵기 실 적용은 Q2 polish (setStyleForNextShapes API 변동).
  }, [])

  const handleClear = () => {
    const editor = editorRef.current
    if (!editor) return
    const ids = editor.getCurrentPageShapeIds()
    if (ids.size > 0) editor.deleteShapes([...ids])
    setAttached(false)
    setErrorMsg(null)
    onClearAttachment?.()
    // Storage 의 stored snapshot 도 정리
    void deleteDrawingSnapshot({ userId, itemId })
    setSavedAt(null)
  }

  const handleExport = async () => {
    const editor = editorRef.current
    if (!editor) return
    setExporting(true)
    setErrorMsg(null)
    try {
      const dataUrl = await exportDrawingToPng(editor)
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

  if (variant === "overlay") {
    // PDF 위 absolute 오버레이: 풀-블리드 + 툴바/footer 는 반투명 chip 으로 띄움
    return (
      <section
        className="absolute inset-0 flex flex-col pointer-events-auto"
        data-testid="pencil-panel"
      >
        <div className="bg-white/85 backdrop-blur-sm">
          <PencilToolbar
            color={color}
            size={size}
            busy={exporting}
            onColorChange={setColor}
            onSizeChange={setSize}
            onClear={handleClear}
            onExport={handleExport}
          />
        </div>
        <div className="relative flex-1 min-h-0">
          {loadStatus === "loaded" && (
            <PencilCanvasHost
              onMount={handleMount}
              onChange={handleChange}
              initialSnapshot={initialSnapshot}
            />
          )}
          {loadStatus === "loading" && (
            <div className="flex h-full items-center justify-center text-xs text-black/45">
              이전 풀이 불러오는 중…
            </div>
          )}
          {loadStatus === "error" && (
            <div className="flex h-full items-center justify-center text-xs text-rose-700">
              풀이 데이터 로드 실패. 새로 시작합니다.
            </div>
          )}
        </div>
        {(attached || errorMsg || savedAt) && (
          <footer className="flex flex-wrap items-center justify-between gap-2 bg-white/85 backdrop-blur-sm px-3 py-1.5 text-[11px] text-black/55">
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

  return (
    <section
      className="overflow-hidden rounded-lg border border-black/10 bg-white"
      data-testid="pencil-panel"
    >
      <PencilToolbar
        color={color}
        size={size}
        busy={exporting}
        onColorChange={setColor}
        onSizeChange={setSize}
        onClear={handleClear}
        onExport={handleExport}
      />
      <div className="relative h-[420px] w-full">
        {loadStatus === "loaded" && (
          <PencilCanvasHost
            onMount={handleMount}
            onChange={handleChange}
            initialSnapshot={initialSnapshot}
          />
        )}
        {loadStatus === "loading" && (
          <div className="flex h-full items-center justify-center text-xs text-black/45">
            이전 풀이 불러오는 중…
          </div>
        )}
        {loadStatus === "error" && (
          <div className="flex h-full items-center justify-center text-xs text-rose-700">
            풀이 데이터 로드 실패. 새로 시작합니다.
          </div>
        )}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-zinc-50 px-3 py-2 text-[11px] text-black/55">
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
          <span className="text-rose-700" role="alert" data-testid="pencil-error">
            {errorMsg}
          </span>
        )}
      </footer>
    </section>
  )
}
