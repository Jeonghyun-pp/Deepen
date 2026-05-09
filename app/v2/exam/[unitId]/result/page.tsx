/**
 * /v2/exam/[unitId]/result?items=<csv> — 실전 모드 batch 종합 리포트.
 * Spec: docs/build-spec/06-state-machines.md §2 BatchResult, M2.5.
 *
 * Q2 단순화:
 *   - URL items 받아 user_item_history 에서 각 itemId 의 마지막 attempt 조회
 *   - 정답률·평균 시간·라벨 분포·오답 reasonTags top
 *   - "다시" / "홈" CTA
 *
 * 마지막 attempt 가 batch 직후라는 보장은 timestamp 비교 (지난 60분 이내).
 */

import Link from "next/link"
import { and, eq, inArray } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import {
  nodes,
  userItemHistory,
  type AttemptResult,
  type ReasonTag,
} from "@/lib/db/schema"
import { REASON_TAG_LABEL } from "@/app/v2/solve/_components/reason-tag-labels"

interface Props {
  params: Promise<{ unitId: string }>
  searchParams: Promise<{ items?: string }>
}

export const dynamic = "force-dynamic"

const RECENT_WINDOW_MS = 60 * 60 * 1000 // batch 가 1시간 안에 끝남 가정

export default async function ExamResultPage({ searchParams }: Props) {
  const sp = await searchParams
  const { user } = await requireUser()

  const itemIds = (sp.items ?? "").split(",").filter(Boolean)
  if (itemIds.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-sm text-black/55">잘못된 batch 입니다.</p>
        <Link href="/v2/home" className="mt-4 inline-block text-xs underline">
          홈으로
        </Link>
      </main>
    )
  }

  const histories = await db
    .select({
      itemId: userItemHistory.itemId,
      resultHistory: userItemHistory.resultHistory,
      lastSolvedAt: userItemHistory.lastSolvedAt,
    })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, user.id),
        inArray(userItemHistory.itemId, itemIds),
      ),
    )

  const itemMetas = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      itemSource: nodes.itemSource,
      itemNumber: nodes.itemNumber,
    })
    .from(nodes)
    .where(inArray(nodes.id, itemIds))
  const metaById = new Map(itemMetas.map((m) => [m.id, m]))

  const cutoff = Date.now() - RECENT_WINDOW_MS

  interface RowSummary {
    itemId: string
    label: string
    itemSource: string | null
    itemNumber: number | null
    label3: "correct" | "wrong" | "unsure" | null
    timeMs: number | null
    reasonTags: ReasonTag[]
  }

  const rows: RowSummary[] = itemIds.map((id) => {
    const h = histories.find((x) => x.itemId === id)
    const meta = metaById.get(id)
    const arr = (h?.resultHistory ?? []) as AttemptResult[]
    const recent = arr
      .filter((a) => new Date(a.timestamp).getTime() >= cutoff)
      .pop()
    return {
      itemId: id,
      label: meta?.label ?? "(라벨 없음)",
      itemSource: meta?.itemSource ?? null,
      itemNumber: meta?.itemNumber ?? null,
      label3: recent?.label ?? null,
      timeMs: recent?.signals.timeMs ?? null,
      reasonTags: recent?.reasonTags ?? [],
    }
  })

  const total = rows.length
  const correct = rows.filter((r) => r.label3 === "correct").length
  const unsure = rows.filter((r) => r.label3 === "unsure").length
  const wrong = rows.filter((r) => r.label3 === "wrong").length
  const noAttempt = rows.filter((r) => r.label3 === null).length
  const validTimes = rows
    .map((r) => r.timeMs)
    .filter((t): t is number => t !== null)
  const avgTimeMs =
    validTimes.length > 0
      ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
      : null

  // reason tag top
  const reasonCount = new Map<ReasonTag, number>()
  for (const r of rows) {
    for (const t of r.reasonTags) {
      reasonCount.set(t, (reasonCount.get(t) ?? 0) + 1)
    }
  }
  const topReasons = [...reasonCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-black/45">
              실전 모드 · 결과
            </span>
            <h1 className="mt-1 text-xl font-semibold text-black/85 sm:text-2xl">
              총 {total}문제
            </h1>
          </div>
          <Link
            href="/v2/home"
            className="text-xs text-black/55 hover:text-black/85 hover:underline"
          >
            홈
          </Link>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="정답" value={correct} tone="emerald" />
          <Stat label="헷갈림" value={unsure} tone="amber" />
          <Stat label="오답" value={wrong} tone="rose" />
          <Stat
            label="평균 시간"
            value={avgTimeMs !== null ? `${(avgTimeMs / 1000).toFixed(0)}s` : "—"}
            tone="zinc"
          />
        </section>

        {topReasons.length > 0 && (
          <section className="rounded-lg border border-black/10 bg-white p-4">
            <p className="text-[11px] uppercase tracking-widest text-black/45">
              자주 짚인 원인
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topReasons.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-medium text-rose-800"
                >
                  {REASON_TAG_LABEL[tag]} · {count}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-lg border border-black/10 bg-white">
          <p className="border-b border-black/5 px-4 py-2 text-[11px] uppercase tracking-widest text-black/45">
            문항별
          </p>
          <ul>
            {rows.map((r, i) => (
              <li
                key={r.itemId}
                className="flex items-center gap-3 border-b border-black/5 px-4 py-2.5 last:border-b-0"
                data-testid={`exam-row-${i}`}
              >
                <span className="font-mono text-xs text-black/45">{i + 1}</span>
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-sm text-black/85">
                    {r.label}
                  </span>
                  {(r.itemSource || r.itemNumber !== null) && (
                    <span className="text-[11px] text-black/45">
                      {r.itemSource ?? ""}
                      {r.itemNumber !== null ? ` ${r.itemNumber}번` : ""}
                    </span>
                  )}
                </div>
                <LabelBadge label3={r.label3} />
                {r.timeMs !== null && (
                  <span className="font-mono text-xs text-black/55">
                    {(r.timeMs / 1000).toFixed(0)}s
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap items-center justify-end gap-2 border-t border-black/5 pt-4">
          {noAttempt > 0 && (
            <span className="mr-auto text-[11px] text-black/45">
              미응답 {noAttempt}문제 (시간 초과 등)
            </span>
          )}
          <Link
            href="/v2/home"
            className="rounded-md border border-black/15 bg-white px-4 py-2 text-sm text-black/75 hover:bg-black/[0.03]"
          >
            홈으로
          </Link>
          <Link
            href="/v2/exam/default"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/85"
          >
            다시 도전
          </Link>
        </section>
      </div>
    </main>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: "emerald" | "amber" | "rose" | "zinc"
}) {
  const colors: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    rose: "bg-rose-50 text-rose-800 border-rose-200",
    zinc: "bg-zinc-50 text-zinc-800 border-zinc-200",
  }
  return (
    <div className={`rounded-lg border p-3 ${colors[tone]}`}>
      <p className="text-[10px] uppercase tracking-widest opacity-65">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function LabelBadge({
  label3,
}: {
  label3: "correct" | "wrong" | "unsure" | null
}) {
  if (label3 === null) {
    return (
      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-700">
        미응답
      </span>
    )
  }
  const map = {
    correct: { bg: "bg-emerald-100 text-emerald-800", label: "정답" },
    unsure: { bg: "bg-amber-100 text-amber-800", label: "헷갈림" },
    wrong: { bg: "bg-rose-100 text-rose-800", label: "오답" },
  }
  const s = map[label3]
  return (
    <span className={`rounded px-2 py-0.5 text-[10px] font-medium ${s.bg}`}>
      {s.label}
    </span>
  )
}
