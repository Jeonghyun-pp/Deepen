"use client"

/**
 * 힌트 버튼 — 클릭 시 카운터 증가 + AI 코치 패널 자동 open (P1-5 폴리싱).
 * Spec: docs/build-spec/07-q1-build.md M1.3.
 */

import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"

export function HintButton() {
  const hintsUsed = useSolveStore((s) => s.hintsUsed)
  const bumpHints = useSolveStore((s) => s.bumpHints)
  const setCoachOpen = useCoachStore((s) => s.setOpen)
  const setInputPrefill = useCoachStore((s) => s.setInputPrefill)

  const handleClick = () => {
    bumpHints()
    setCoachOpen(true)
    // 코치 input 을 "힌트" 톤으로 prefill — 사용자가 검토 후 Enter
    setInputPrefill("이 문제 풀이의 첫 한 줄만 힌트로 알려 주세요.")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="hint-button"
      className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 hover:bg-black/[0.02] transition"
      aria-label={`힌트. 현재 ${hintsUsed}회 사용. AI 코치 자동 open`}
    >
      <span>힌트</span>
      <span className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-black/55">
        {hintsUsed}
      </span>
    </button>
  )
}
