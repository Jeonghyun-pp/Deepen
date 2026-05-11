"use client"

/**
 * CoverageBadge — 강의안 헤더의 커버리지 배지.
 * Spec: docs/north-star-spec-2026-05-11.md §4.2 핵심 surface 1.
 *
 * 100% 만 emerald (완결 증명). 그 외는 amber (정직성 원칙: "94%" 그대로 표시).
 */

import type { CoverageReport } from "@/lib/north-star/coverage"

export interface CoverageBadgeProps {
  report: CoverageReport
  onClick?: () => void
  active?: boolean
}

export function CoverageBadge({ report, onClick, active }: CoverageBadgeProps) {
  const complete = report.totalChunks > 0 && report.unmappedChunkIds.length === 0
  const tone = complete
    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
    : "border-amber-300 bg-amber-50 text-amber-900"
  const ringTone = active
    ? complete
      ? "ring-2 ring-emerald-300"
      : "ring-2 ring-amber-300"
    : ""

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid="coverage-badge"
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-black/[0.03] ${tone} ${ringTone}`}
      title={
        complete
          ? "강의안 모든 chunk 가 노드로 매핑됨"
          : `미매핑 ${report.unmappedChunkIds.length}개 — 클릭해 검수`
      }
    >
      <span className="text-[10px]">📊</span>
      <span className="font-mono tabular-nums">{report.coveragePct.toFixed(0)}%</span>
      {!complete && (
        <span className="text-[10px] opacity-75">
          · 미매핑 {report.unmappedChunkIds.length}
        </span>
      )}
      {complete && <span className="text-[10px]">완결</span>}
    </button>
  )
}
