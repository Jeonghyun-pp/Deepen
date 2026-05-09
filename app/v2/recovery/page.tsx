/**
 * /v2/recovery — 오답복구 모드 entry.
 * Spec: docs/build-spec/06-state-machines.md §4, M2.5.
 *
 * user_wrong_note view 조회 → 클릭 시 /v2/solve/[itemId]?mode=recovery 로
 * 이동. 자동 누적 (in_wrong_note=true) 우선, 사용자 수동 별표 (marked_difficult)
 * 가 보조.
 */

import Link from "next/link"
import { sql, desc } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { COPY } from "@/lib/ui/copy"

export const dynamic = "force-dynamic"

interface WrongNoteRow {
  itemId: string
  label: string | null
  itemSource: string | null
  itemNumber: number | null
  seenCount: number
  lastSolvedAt: Date | null
  markedDifficult: boolean
}

export default async function RecoveryPage() {
  const { user } = await requireUser()

  // user_wrong_note view 직접 join (drizzle 외 raw sql).
  const rows = (await db.execute(sql`
    SELECT
      uwn.item_id     AS "itemId",
      n.label         AS "label",
      n.item_source   AS "itemSource",
      n.item_number   AS "itemNumber",
      uwn.seen_count  AS "seenCount",
      uwn.last_solved_at AS "lastSolvedAt",
      uwn.marked_difficult AS "markedDifficult"
    FROM public.user_wrong_note uwn
    JOIN ${nodes} n ON n.id = uwn.item_id
    WHERE uwn.user_id = ${user.id}
    ORDER BY uwn.last_solved_at DESC NULLS LAST
    LIMIT 100
  `)) as unknown as WrongNoteRow[]

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between border-b border-black/5 pb-4">
          <div className="flex flex-col">
            <Link
              href="/v2/home"
              className="text-[11px] uppercase tracking-widest text-black/45 hover:text-black/70"
            >
              ← 홈
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-black/85 sm:text-2xl">
              오답복구
            </h1>
            <p className="mt-1 text-xs text-black/55">
              틀렸거나 헷갈린 문제 + 같은 유형 자동 추천. 3 연속 정답 시 졸업.
            </p>
          </div>
        </header>

        {rows.length === 0 ? (
          <section
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
            data-testid="wrong-note-empty"
          >
            아직 오답이 쌓이지 않았어요. 풀이를 시작해 보세요.
          </section>
        ) : (
          <section
            className="flex flex-col gap-2"
            data-testid="wrong-note-list"
          >
            {rows.map((row) => (
              <Link
                key={row.itemId}
                href={`/v2/solve/${row.itemId}?mode=recovery`}
                data-testid={`wrong-note-${row.itemId}`}
                className="group flex items-start gap-3 rounded-lg border border-black/10 bg-white px-4 py-3 transition hover:border-black/30 hover:bg-black/[0.02]"
              >
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                <div className="flex flex-1 flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    {row.itemSource && (
                      <span className="rounded bg-black/[0.05] px-1 py-0.5 text-[10px] text-black/55">
                        {row.itemSource}
                        {row.itemNumber !== null
                          ? ` ${row.itemNumber}번`
                          : ""}
                      </span>
                    )}
                    {row.markedDifficult && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                        ★ 별표
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 truncate text-sm text-black/85">
                    {row.label ?? "(라벨 없음)"}
                  </span>
                  <span className="mt-0.5 text-[11px] text-black/45">
                    풀이 {row.seenCount}회
                    {row.lastSolvedAt
                      ? ` · 마지막 ${new Date(row.lastSolvedAt).toLocaleDateString("ko-KR")}`
                      : ""}
                  </span>
                </div>
                <span className="shrink-0 self-center text-xs text-black/45 group-hover:text-black/85">
                  다시 풀기 →
                </span>
              </Link>
            ))}
          </section>
        )}

        {rows.length > 0 && (
          <p className="text-[11px] text-black/45">
            같은 itemId 를 3번 연속 맞추면 자동으로 오답 노트에서 빠져요.
            {COPY.empty.noAttemptsYet ? "" : ""}
          </p>
        )}
      </div>
    </main>
  )
}
