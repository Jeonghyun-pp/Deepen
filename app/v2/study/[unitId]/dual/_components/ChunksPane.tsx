"use client"

/**
 * Chunks Pane — PDF 직접 렌더 대신 chunks ordinal list (Q2 단순화).
 * Spec: docs/build-spec/08-q2-build.md M2.6 (B) PDF pane simplification.
 *
 * 핵심: 텍스트 드래그 → onTextSelect callback → 코치 패널 prefill.
 * window.getSelection() 으로 단순 받음. chunk 매핑은 가장 가까운 ordinal.
 *
 * Q3 계획: react-pdf + bbox 좌표 매핑.
 */

import { useCallback, useEffect, useRef, useState } from "react"

interface Chunk {
  id: string
  ordinal: number
  sectionTitle: string | null
  pageStart: number | null
  content: string
}

export interface ChunksPaneProps {
  chunks: Chunk[]
  hasDocument: boolean
  onTextSelect: (text: string, source: { ordinal: number }) => void
}

export function ChunksPane({
  chunks,
  hasDocument,
  onTextSelect,
}: ChunksPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [activeSelection, setActiveSelection] = useState<string | null>(null)
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [activeOrdinal, setActiveOrdinal] = useState<number | null>(null)

  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      setActiveSelection(null)
      setPopupPos(null)
      return
    }
    const text = sel.toString().trim()
    if (text.length < 2) {
      setActiveSelection(null)
      setPopupPos(null)
      return
    }
    const range = sel.getRangeAt(0)
    const container = containerRef.current
    if (!container || !container.contains(range.commonAncestorContainer)) {
      setActiveSelection(null)
      setPopupPos(null)
      return
    }

    // selection 이 속한 chunk ordinal 찾기 (data-ordinal 가장 가까운 ancestor)
    let node: Node | null = range.commonAncestorContainer
    let ordinal: number | null = null
    while (node) {
      if (node instanceof HTMLElement && node.dataset?.ordinal) {
        ordinal = Number(node.dataset.ordinal)
        break
      }
      node = node.parentNode
    }

    const rect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setActiveSelection(text)
    setActiveOrdinal(ordinal)
    setPopupPos({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.bottom - containerRect.top + 6,
    })
  }, [])

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange)
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange)
  }, [handleSelectionChange])

  const handleAskCoach = () => {
    if (!activeSelection) return
    onTextSelect(activeSelection, { ordinal: activeOrdinal ?? 0 })
    setActiveSelection(null)
    setPopupPos(null)
    window.getSelection()?.removeAllRanges()
  }

  if (!hasDocument || chunks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-xs text-black/45">
        업로드된 PDF 의 chunks 가 여기 표시됩니다.
        <br />
        텍스트 드래그 → "코치에게 묻기" 인터랙션이 핵심.
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col overflow-y-auto bg-white px-4 py-4 sm:px-6"
      data-testid="chunks-pane"
    >
      <p className="mb-2 text-[10px] uppercase tracking-widest text-black/45">
        텍스트 드래그 → AI 코치에게 묻기
      </p>
      <ul className="flex flex-col gap-3">
        {chunks.map((c) => (
          <li
            key={c.id}
            data-ordinal={c.ordinal}
            className="rounded-lg border border-black/5 bg-zinc-50 px-3 py-2"
          >
            <header className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-black/45">
              <span className="font-mono">#{c.ordinal}</span>
              {c.pageStart !== null && <span>p.{c.pageStart}</span>}
              {c.sectionTitle && (
                <span className="truncate text-[11px] normal-case text-black/65">
                  · {c.sectionTitle}
                </span>
              )}
            </header>
            <p
              className="whitespace-pre-wrap text-sm leading-6 text-black/80 select-text"
              data-testid={`chunk-${c.ordinal}`}
            >
              {c.content}
            </p>
          </li>
        ))}
      </ul>

      {activeSelection && popupPos && (
        <button
          type="button"
          onClick={handleAskCoach}
          className="absolute z-10 -translate-x-1/2 rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-black/85"
          style={{ left: popupPos.x, top: popupPos.y }}
          data-testid="drag-to-coach"
        >
          코치에게 묻기 →
        </button>
      )}
    </div>
  )
}
