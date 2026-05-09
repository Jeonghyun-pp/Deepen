/**
 * /v2/study/[unitId] — 단원 진입 화면.
 *
 * 홈 → 풀이 사이 surface. Pattern list + 그래프 미리보기 + 추천 첫 문제 +
 * 시작 CTA. 학생이 그 단원에서 무엇이 출제되는지 한눈에.
 *
 * Q1: unitId 무시 (단일 단원). 모든 published Pattern (display_layer
 * 기준 Concept/Pattern 그룹) + 첫 published Item 으로 시작.
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import { nodes, patternState } from "@/lib/db/schema"
import { StudyMiniGraph } from "./StudyMiniGraph"
import { ModeSelector } from "./ModeSelector"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ unitId: string }>
}

export default async function StudyUnitPage({ params }: Props) {
  const { unitId } = await params
  const { user } = await requireUser()

  // 모든 published Pattern (Concept + Pattern 둘 다 포함, displayLayer 로 분기)
  const patterns = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      grade: nodes.grade,
      displayLayer: nodes.displayLayer,
      signature: nodes.signature,
      isKiller: nodes.isKiller,
      frequencyRank: nodes.frequencyRank,
      avgCorrectRate: nodes.avgCorrectRate,
    })
    .from(nodes)
    .where(and(eq(nodes.type, "pattern"), eq(nodes.status, "published")))
    .orderBy(asc(nodes.frequencyRank), asc(nodes.label))

  if (patterns.length === 0) {
    redirect("/v2/home")
  }

  // 사용자 patternState
  const stateRows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
      attemptCount: patternState.attemptCount,
    })
    .from(patternState)
    .where(eq(patternState.userId, user.id))

  const stateByPattern = new Map(
    stateRows.map((s) => [s.patternId, s]),
  )

  // 첫 published Item (시작 CTA 용)
  const [firstItem] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.type, "item"), eq(nodes.status, "published")))
    .orderBy(asc(nodes.createdAt))
    .limit(1)

  const concepts = patterns.filter((p) => p.displayLayer === "concept")
  const subPatterns = patterns.filter((p) => p.displayLayer !== "concept")

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 sm:py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-4">
          <div className="flex flex-col">
            <Link
              href="/v2/home"
              className="text-[11px] uppercase tracking-widest text-black/45 hover:text-black/70"
            >
              ← 단원 목록
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-black/85 sm:text-2xl">
              수학Ⅱ · 미분/적분
            </h1>
            <p className="mt-1 text-xs text-black/55">
              단원 코드: <span className="font-mono">{unitId}</span>
            </p>
          </div>
          {firstItem && (
            <Link
              href={`/v2/solve/${firstItem.id}`}
              data-testid="start-solve"
              className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black/85"
            >
              풀이 시작 →
            </Link>
          )}
        </header>

        <section className="grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-6">
            {concepts.length > 0 && (
              <PatternGroup
                title="개념 (Concept)"
                hint="단원의 큰 줄기. 빈출 순."
                rows={concepts}
                stateByPattern={stateByPattern}
              />
            )}
            <PatternGroup
              title={concepts.length > 0 ? "출제 유형 (Pattern)" : "유형"}
              hint="시험에서 실제로 출제되는 풀이 유형."
              rows={subPatterns}
              stateByPattern={stateByPattern}
            />
          </div>

          <aside className="flex flex-col gap-3">
            <ModeSelector unitId={unitId} firstItemId={firstItem?.id ?? null} />
            <div className="rounded-xl border border-black/10 bg-white p-4">
              <p className="text-[11px] uppercase tracking-widest text-black/45">
                학습 지도
              </p>
              <div className="mt-2 aspect-square w-full">
                <StudyMiniGraph />
              </div>
              <p className="mt-2 text-[11px] text-black/55">
                풀이 결과가 실시간 반영됩니다.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

interface PatternRowMeta {
  id: string
  label: string
  grade: string | null
  signature: unknown
  isKiller: boolean
  frequencyRank: number | null
  avgCorrectRate: number | null
}

function PatternGroup({
  title,
  hint,
  rows,
  stateByPattern,
}: {
  title: string
  hint: string
  rows: PatternRowMeta[]
  stateByPattern: Map<string, { theta: number; attemptCount: number }>
}) {
  if (rows.length === 0) return null
  return (
    <section>
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-black/80">{title}</h2>
        <span className="text-[11px] text-black/45">{hint}</span>
      </header>
      <ul className="flex flex-col gap-1.5" data-testid={`pattern-group-${title}`}>
        {rows.map((p) => {
          const state = stateByPattern.get(p.id)
          const theta = state?.theta ?? null
          const masteryColor =
            theta === null
              ? "bg-zinc-200"
              : theta >= 0.7
                ? "bg-emerald-500"
                : theta >= 0.4
                  ? "bg-amber-400"
                  : "bg-rose-400"
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-black/5 bg-white px-4 py-2.5"
              data-testid={`pattern-row-${p.id}`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${masteryColor}`}
                aria-label={
                  theta === null
                    ? "미학습"
                    : theta >= 0.7
                      ? "안정 숙련"
                      : theta >= 0.4
                        ? "약점 후보"
                        : "낮음"
                }
              />
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="flex items-center gap-1.5">
                  {p.grade && (
                    <span className="rounded bg-black/[0.05] px-1 py-0.5 text-[10px] text-black/55">
                      {p.grade}
                    </span>
                  )}
                  <span className="truncate text-sm text-black/85">
                    {p.label}
                  </span>
                  {p.isKiller && (
                    <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">
                      킬러
                    </span>
                  )}
                </span>
                {Array.isArray(p.signature) && p.signature.length > 0 && (
                  <span className="mt-0.5 truncate text-[11px] text-black/45">
                    {(p.signature as string[]).join(" · ")}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 text-[11px] text-black/55">
                {state && (
                  <>
                    <span className="tabular-nums">
                      {(theta! * 100).toFixed(0)}%
                    </span>
                    <span className="text-black/30">·</span>
                    <span>{state.attemptCount}회</span>
                  </>
                )}
                {!state && <span className="text-black/35">미시작</span>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
