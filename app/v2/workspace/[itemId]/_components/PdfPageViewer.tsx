"use client"

/**
 * PdfPageViewer — Phase 1B 가운데 hero PDF 렌더 (react-pdf wrapper).
 *
 * 13 lock #6: 원본 PDF 페이지 렌더 (종이 + serif). 텍스트 추출은 백엔드 메타로만.
 * 13 lock #7: Phase 4에서 펜슬 캔버스 오버레이 — 본 컴포넌트 위에 absolute layer 추가 예정.
 *
 * Phase 1B 한계:
 *   - 단일 페이지 한 장씩 (next/prev 버튼)
 *   - 반응형 width (컨테이너 폭 기반)
 *   - 펜 오버레이 X (Phase 4)
 *
 * Worker source (Phase 3 self-host): public/pdf.worker.min.mjs — pdfjs-dist 의 worker 빌드를
 * `cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/` 로 복사. 버전은 pdfjs 와 자동 정합.
 * CDN 다운/지역 차단 시에도 동작.
 */

import { useEffect, useRef, useState, type ReactNode } from "react"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

export interface PdfPageViewerProps {
  signedUrl: string
  title: string
  initialPage?: number
  /**
   * 펜슬 오버레이 등 PDF 페이지 본문 위에 absolute 로 얹을 layer (lock #7, Phase 4).
   * body 컨테이너 안에 `absolute inset-0` 으로 배치된다. caller 는 자체 pointer-events 처리 필요.
   */
  overlay?: ReactNode
}

export function PdfPageViewer({
  signedUrl,
  title,
  initialPage = 1,
  overlay,
}: PdfPageViewerProps) {
  const [pageNumber, setPageNumber] = useState(initialPage)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [width, setWidth] = useState<number>(600)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth - 32
        if (w > 200) setWidth(w)
      }
    }
    update()
    window.addEventListener("resize", update)
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => {
      window.removeEventListener("resize", update)
      ro.disconnect()
    }
  }, [])

  const total = numPages ?? 0
  const canPrev = pageNumber > 1
  const canNext = total > 0 && pageNumber < total

  return (
    <div
      className="flex h-full flex-col bg-white"
      data-testid="pdf-page-viewer"
    >
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
            disabled={!canPrev}
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
            disabled={!canNext}
            className="rounded px-2 py-0.5 text-black/55 hover:bg-black/[0.05] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            다음 ›
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex flex-1 items-start justify-center overflow-y-auto bg-zinc-100/60 py-4"
      >
        <Document
          file={signedUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="py-8 text-xs text-black/45">PDF 불러오는 중…</div>
          }
          error={
            <div className="py-8 text-xs text-rose-600">
              PDF 로드 실패. 새로고침해 주세요.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            width={width}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          />
        </Document>
        {/* 펜슬 등 absolute 레이어 — 본문 컨테이너 기준.
            E2E 수정: pointer-events-auto 로 변경. 이전 pointer-events-none + 자식 auto 조합이
            tldraw 캔버스 wheel/pointer 이벤트를 못 받게 만들어 펜 그리기 차단됐음.
            textLayer 도 비활성 (펜 캔버스와 이벤트 충돌). */}
        {overlay && (
          <div className="pointer-events-auto absolute inset-0">{overlay}</div>
        )}
      </div>
    </div>
  )
}
