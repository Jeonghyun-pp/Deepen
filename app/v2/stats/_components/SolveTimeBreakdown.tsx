/**
 * SolveTimeBreakdown — easy/mid/hard 평균 시간 + 정답률.
 * Spec: 09-q3-build.md M3.5 (오르조 C.2 패턴).
 */
import type { StatsOverviewResponse } from "@/lib/api/schemas/stats"

interface Props {
  rows: StatsOverviewResponse["solveTimeBreakdown"]
}

const LABEL: Record<"easy" | "mid" | "hard", string> = {
  easy: "쉬움",
  mid: "중간",
  hard: "어려움",
}

const COLOR: Record<"easy" | "mid" | "hard", string> = {
  easy: "bg-emerald-500",
  mid: "bg-amber-400",
  hard: "bg-rose-400",
}

export function SolveTimeBreakdown({ rows }: Props) {
  const hasAny = rows.some((r) => r.attempts > 0)

  return (
    <div
      className="rounded-xl border border-black/10 bg-white p-5"
      data-testid="solve-time-breakdown"
    >
      <h2 className="text-sm font-semibold text-black/80">
        난이도별 풀이 시간 + 정답률
      </h2>
      <p className="mt-1 text-[11px] text-black/45">지난 7일 기준</p>

      {!hasAny && (
        <p className="mt-4 text-sm text-black/55">
          이번 주 풀이 기록이 없습니다.
        </p>
      )}

      {hasAny && (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((r) => {
            const minutes = r.avgMs / 60000
            const pct = (r.correctRate * 100).toFixed(0)
            return (
              <li key={r.difficulty} data-testid={`stb-${r.difficulty}`}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-black/80">
                    {LABEL[r.difficulty]}
                    <span className="ml-1.5 text-black/45">
                      {r.attempts}문제
                    </span>
                  </span>
                  <span className="font-mono text-black/70 tabular-nums">
                    {minutes.toFixed(1)}분 · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/[0.05]">
                  <div
                    className={`h-full ${COLOR[r.difficulty]}`}
                    style={{ width: `${Math.min(100, r.correctRate * 100)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
