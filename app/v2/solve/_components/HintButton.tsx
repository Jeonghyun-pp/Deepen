"use client"

/**
 * 힌트 버튼 — Q1 엔 카운터만 증가. 실제 힌트는 M1.5 코치 패널.
 * Spec: docs/build-spec/07-q1-build.md M1.3.
 */

import { useSolveStore } from "@/app/v2/_components/store/solve-store"

export function HintButton() {
  const hintsUsed = useSolveStore((s) => s.hintsUsed)
  const bumpHints = useSolveStore((s) => s.bumpHints)

  return (
    <button
      type="button"
      onClick={bumpHints}
      data-testid="hint-button"
      className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/[0.02] transition"
      aria-label={`힌트. 현재 ${hintsUsed}회 사용`}
    >
      <span>힌트</span>
      <span className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-black/55">
        {hintsUsed}
      </span>
    </button>
  )
}
