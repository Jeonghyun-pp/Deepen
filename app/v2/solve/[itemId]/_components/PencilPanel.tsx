"use client"

/**
 * PencilPanel — 풀이 화면 펜슬 영역.
 * Spec: docs/build-spec/08-q2-build.md M2.1.
 *
 * 흐름:
 *   1. PencilCanvasHost mount → editor 인스턴스 보관
 *   2. PencilToolbar 토글 → editor.setStyleForNextShapes 로 색·굵기 적용
 *   3. "풀이 첨부" → exportDrawingToPng → onExport(base64)
 *   4. SolveClient 가 attempts payload.ocrImageBase64 에 담아 제출.
 *
 * Q1 (M2.1) 미루기:
 *   - Storage persistence (drawings/{userId}/{itemId}.json) → 후속
 *   - autosave debounce 2s → 후속
 *   - tldraw user preferences (pen-only 모드) → 후속
 */

import { useCallback, useRef, useState } from "react"
import type { Editor } from "tldraw"
import { PencilCanvasHost } from "@/lib/pencil/canvas-host"
import {
  exportDrawingToPng,
  ExportEmptyError,
  ExportTooLargeError,
} from "@/lib/pencil/export-png"
import {
  DEFAULT_COLOR,
  DEFAULT_SIZE,
  PEN_COLORS,
  PEN_SIZES,
  type PenColorKey,
  type PenSizeKey,
} from "@/lib/pencil/tools-config"
import { PencilToolbar } from "./PencilToolbar"

export interface PencilPanelProps {
  itemId: string
  /** "풀이 첨부" 클릭 시 PNG base64 를 SolveClient 가 받는다. */
  onExport: (pngBase64: string | null) => void
  /** 빈 캔버스로 첨부 해제. */
  onClearAttachment?: () => void
}

export function PencilPanel({ itemId, onExport, onClearAttachment }: PencilPanelProps) {
  const editorRef = useRef<Editor | null>(null)
  const [color, setColor] = useState<PenColorKey>(DEFAULT_COLOR)
  const [size, setSize] = useState<PenSizeKey>(DEFAULT_SIZE)
  const [exporting, setExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [attached, setAttached] = useState(false)

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor
    // tldraw v5 setStyleForNextShapes API 가 버전마다 변동되므로 색·굵기는
    // 우리 툴바에서만 표시하고 실제 적용은 polish 단계에서 (Q1 데모는
    // tldraw 기본 검정·중간 굵기). Q2 polish 에서 setStyle 호출 추가.
  }, [])

  const handleClear = () => {
    const editor = editorRef.current
    if (!editor) return
    const ids = editor.getCurrentPageShapeIds()
    if (ids.size > 0) editor.deleteShapes([...ids])
    setAttached(false)
    setErrorMsg(null)
    onClearAttachment?.()
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
        <PencilCanvasHost onMount={handleMount} />
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-black/5 bg-zinc-50 px-3 py-2 text-[11px] text-black/55">
        <span>
          itemId <span className="font-mono text-[10px]">{itemId.slice(0, 8)}…</span>
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
