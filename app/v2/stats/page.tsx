/**
 * /v2/stats — 학생 본인 통계 대시보드.
 * Spec: 09-q3-build.md M3.5.
 *
 * 4 카드:
 *   - WeakNodesReducedCard (⭐ 핵심 — "지난주 N개 → 이번주 N-2개")
 *   - MasteryDeltaCard
 *   - SolveTimeBreakdown
 *   - WeeklyComparisonChart (custom SVG)
 */
import Link from "next/link"
import { requireUser } from "@/lib/auth/require-user"
import { buildOverview } from "@/lib/stats/aggregate"
import { WeakNodesReducedCard } from "./_components/WeakNodesReducedCard"
import { MasteryDeltaCard } from "./_components/MasteryDeltaCard"
import { SolveTimeBreakdown } from "./_components/SolveTimeBreakdown"
import { WeeklyComparisonChart } from "./_components/WeeklyComparisonChart"

export const dynamic = "force-dynamic"

export default async function StatsPage() {
  const { user } = await requireUser()
  const overview = await buildOverview(user.id)

  const hasAnyData =
    overview.studyMinutes.totalAttempts > 0 ||
    overview.weeklyComparison.some((w) => w.attempts > 0)

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <Link
              href="/v2/home"
              className="text-[11px] uppercase tracking-widest text-black/45 hover:text-black/70"
            >
              ← 홈
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-black/85">
              내 학습 통계
            </h1>
            <p className="mt-1 text-xs text-black/55">
              매주 토요일 23:00 KST 스냅샷 기준. 보호자 리포트와 같은 숫자입니다.
            </p>
          </div>
        </header>

        {!hasAnyData && (
          <section
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            data-testid="stats-empty"
          >
            아직 풀이 기록이 충분하지 않아 통계가 비어 있습니다. 한 주 동안
            풀고 다시 와 주세요.
          </section>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <WeakNodesReducedCard data={overview.weakNodesReduced} />
          <MasteryDeltaCard data={overview.weeklyMasteryDelta} />
        </section>

        <section className="grid gap-4 sm:grid-cols-[1fr_320px]">
          <WeeklyComparisonChart weeks={overview.weeklyComparison} />
          <SolveTimeBreakdown rows={overview.solveTimeBreakdown} />
        </section>

        <section className="rounded-xl border border-black/10 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-black/80">
            이번 주 합계
          </h2>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              label="푼 문제"
              value={`${overview.studyMinutes.totalAttempts}문제`}
            />
            <Stat
              label="학습 시간"
              value={`${Math.round(overview.studyMinutes.minutes)}분`}
            />
            <Stat
              label="평균 마스터리"
              value={`${(overview.weeklyMasteryDelta.thisWeek * 100).toFixed(0)}%`}
            />
          </dl>
        </section>

        {(overview.topImproved.length > 0 ||
          overview.topConcerns.length > 0) && (
          <section className="grid gap-4 sm:grid-cols-2">
            {overview.topImproved.length > 0 && (
              <div
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
                data-testid="top-improved"
              >
                <h3 className="text-[11px] uppercase tracking-widest text-emerald-700">
                  개선이 컸던 유형
                </h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {overview.topImproved.map((p) => (
                    <li
                      key={p.patternId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-emerald-900">{p.patternLabel}</span>
                      <span className="font-mono text-emerald-700">
                        +{(p.thetaDelta * 100).toFixed(1)}p
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {overview.topConcerns.length > 0 && (
              <div
                className="rounded-xl border border-amber-200 bg-amber-50 p-5"
                data-testid="top-concerns"
              >
                <h3 className="text-[11px] uppercase tracking-widest text-amber-700">
                  조금 더 다질 유형
                </h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {overview.topConcerns.map((p) => (
                    <li
                      key={p.patternId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-amber-900">{p.patternLabel}</span>
                      <span className="font-mono text-amber-700">
                        {(p.theta * 100).toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-black/45">
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold text-black/85 tabular-nums">
        {value}
      </dd>
    </div>
  )
}
