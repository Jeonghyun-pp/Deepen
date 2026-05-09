/**
 * MasteryDeltaCard — 평균 theta 주간 변화.
 * Spec: 09-q3-build.md M3.5.
 */
import type { StatsOverviewResponse } from "@/lib/api/schemas/stats"

interface Props {
  data: StatsOverviewResponse["weeklyMasteryDelta"]
}

export function MasteryDeltaCard({ data }: Props) {
  const arrow =
    data.delta > 0.01 ? "up" : data.delta < -0.01 ? "down" : "flat"
  const color =
    arrow === "up"
      ? "border-emerald-300 bg-emerald-50"
      : arrow === "down"
        ? "border-amber-200 bg-amber-50"
        : "border-black/10 bg-white"

  return (
    <div
      className={`rounded-xl border p-5 ${color}`}
      data-testid="mastery-delta"
    >
      <h2 className="text-[11px] uppercase tracking-widest text-black/55">
        평균 마스터리
      </h2>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-black/85">
          {(data.thisWeek * 100).toFixed(1)}%
        </span>
        {arrow !== "flat" && (
          <span
            className={`text-sm font-medium tabular-nums ${arrow === "up" ? "text-emerald-700" : "text-amber-700"}`}
          >
            {arrow === "up" ? "↑" : "↓"} {Math.abs(data.delta * 100).toFixed(1)}p
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-black/55">
        지난주 {(data.lastWeek * 100).toFixed(1)}% → 이번주{" "}
        {(data.thisWeek * 100).toFixed(1)}%
      </p>

      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-black/[0.05]">
        <div
          className={`h-full ${arrow === "up" ? "bg-emerald-500" : arrow === "down" ? "bg-amber-500" : "bg-black/30"}`}
          style={{
            width: `${Math.max(2, Math.min(100, data.thisWeek * 100))}%`,
          }}
        />
      </div>
      <p className="mt-2 text-[11px] text-black/45">
        실시간 patternState 평균 · 0% ~ 100% 척도
      </p>
    </div>
  )
}
