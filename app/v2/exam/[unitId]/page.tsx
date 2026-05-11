/**
 * /v2/exam/[unitId] — 실전 모드 batch 진입.
 * Spec: docs/build-spec/06-state-machines.md §2, M2.5.
 *
 * 흐름:
 *   1. 5문제 선택 (cooling_window 7일 + in_wrong_note 제외 + 무작위)
 *   2. /v2/solve/[firstId]?mode=exam&batch=<csv>&idx=0 redirect
 *   3. SolveClient 가 batch params 따라 다음 item 으로 자동 진행
 *   4. 마지막 idx=4 attempt 후 /v2/exam/[unitId]/result?items=<csv>
 *
 * Q2 단순화: 콘텐츠 5개 미만이면 가능한 만큼만 batch. 서버측 mode 강제는
 *           /api/attempts 가 처리.
 */

import { redirect } from "next/navigation"
import { sql } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"

interface Props {
  params: Promise<{ unitId: string }>
}

export const dynamic = "force-dynamic"
export const EXAM_BATCH_SIZE = 5

export default async function ExamPage({ params }: Props) {
  await params // unitId Q2 단일 가정으로 무시
  const { user } = await requireUser()

  // cooling_window 적용 무작위 N개
  const rows = (await db.execute(sql`
    SELECT n.id
    FROM ${nodes} n
    WHERE n.type = 'item'
      AND n.status = 'published'
      AND n.id NOT IN (
        SELECT item_id FROM user_item_history
        WHERE user_id = ${user.id}
          AND last_solved_at > NOW() - INTERVAL '7 days'
      )
      AND n.id NOT IN (
        SELECT item_id FROM public.user_wrong_note
        WHERE user_id = ${user.id}
      )
    ORDER BY RANDOM()
    LIMIT ${EXAM_BATCH_SIZE}
  `)) as unknown as { id: string }[]

  // 부족하면 cooling/wrong filter 풀어서 재시도
  let items = rows
  if (items.length < EXAM_BATCH_SIZE) {
    const fallback = (await db.execute(sql`
      SELECT id FROM ${nodes}
      WHERE type = 'item' AND status = 'published'
      ORDER BY RANDOM()
      LIMIT ${EXAM_BATCH_SIZE}
    `)) as unknown as { id: string }[]
    items = fallback
  }

  if (items.length === 0) {
    redirect("/v2/home")
  }

  const batchCsv = items.map((r) => r.id).join(",")
  // Stage 6: exam batch 도 워크스페이스 hero 로 흡수. SolveClient embedded 가
  // ExamTimerInline + hint/AI 잠금 chrome 을 자동 활성.
  redirect(
    `/v2/workspace/${items[0].id}?mode=exam&batch=${encodeURIComponent(batchCsv)}&idx=0`,
  )
}
