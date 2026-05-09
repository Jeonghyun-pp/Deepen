"use client"

/**
 * ChallengeProgress — 풀이 화면 상단 streak 표시.
 * Spec: 09-q3-build.md M3.2.
 */
import { CHALLENGE_LEVEL_UP_STREAK } from "@/lib/session/challenge-machine"

interface ChallengeProgressProps {
  streak: number
  patternLabel: string
  consecutiveWrong: number
  difficulty: number
  onAbort: () => void
}

export function ChallengeProgress({
  streak,
  patternLabel,
  consecutiveWrong,
  difficulty,
  onAbort,
}: ChallengeProgressProps) {
  const target = CHALLENGE_LEVEL_UP_STREAK
  const dots = Array.from({ length: target }, (_, i) => i < streak)

  return (
    <div
      className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"
      data-testid="challenge-progress"
      role="status"
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
        챌린지
      </span>
      <span className="text-sm font-medium text-emerald-900">
        {patternLabel}
      </span>
      <div
        className="flex items-center gap-1"
        aria-label={`${streak} / ${target} 연속 정답`}
      >
        {dots.map((on, i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${
              on ? "bg-emerald-500" : "border border-emerald-300 bg-white"
            }`}
          />
        ))}
        <span className="ml-2 text-xs tabular-nums text-emerald-900/80">
          {streak}/{target}
        </span>
      </div>
      <span className="ml-auto flex items-center gap-3 text-[11px] text-emerald-900/70">
        <span>난이도 {(difficulty * 100).toFixed(0)}%</span>
        {consecutiveWrong > 0 && (
          <span className="text-rose-700">오답 {consecutiveWrong}/2</span>
        )}
        <button
          type="button"
          onClick={onAbort}
          data-testid="challenge-abort"
          className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-emerald-800 hover:bg-emerald-100"
        >
          종료
        </button>
      </span>
    </div>
  )
}
