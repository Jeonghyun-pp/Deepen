/**
 * WeakNodesReducedCard ⭐ M3.5 의 핵심 retention 카피.
 * Spec: 09-q3-build.md M3.5 ("지난주 N개 → 이번주 N-2개"). 음수 표현 회피.
 */
import type { StatsOverviewResponse } from "@/lib/api/schemas/stats"

interface Props {
  data: StatsOverviewResponse["weakNodesReduced"]
}

export function WeakNodesReducedCard({ data }: Props) {
  const { before, after, reduced } = data
  const delta = before - after
  const positive = delta > 0
  const flat = delta === 0

  return (
    <div
      className={`rounded-xl border p-5 ${positive ? "border-emerald-300 bg-emerald-50" : flat ? "border-black/10 bg-white" : "border-amber-200 bg-amber-50"}`}
      data-testid="weak-nodes-reduced"
    >
      <h2 className="text-[11px] uppercase tracking-widest text-black/55">
        약점 패턴
      </h2>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-black/85">
          {after}
        </span>
        <span className="text-sm text-black/55">개</span>
        {!flat && (
          <span
            className={`ml-2 text-sm font-medium tabular-nums ${
              positive ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {positive ? `↓ ${delta}개 감소` : `↑ ${-delta}개 증가`}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-black/55">
        지난주 <span className="tabular-nums">{before}</span>개 → 이번주{" "}
        <span className="tabular-nums">{after}</span>개
      </p>

      {reduced.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] uppercase tracking-widest text-emerald-700">
            벗어난 유형
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {reduced.slice(0, 5).map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 text-sm text-emerald-900"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {r.label}
              </li>
            ))}
            {reduced.length > 5 && (
              <li className="text-[11px] text-emerald-700/80">
                외 {reduced.length - 5}개
              </li>
            )}
          </ul>
        </div>
      )}

      {flat && before === 0 && (
        <p className="mt-3 text-[11px] text-black/45">
          아직 약점 진단이 시작되지 않았습니다 — 한 주 학습 후 다시 와 주세요.
        </p>
      )}
    </div>
  )
}
