/**
 * /v2/notebook — 오답·헷갈림 lobby (Stage 9: 실제 데이터 연결).
 *
 * 이전: client component + 전체 mock (5개 mock entry, 11개 mock cause).
 * 변경: server component 가 user_item_history 마지막 attempt label='wrong'|'unsure' 만
 *       fetch. NotebookClient (client) 는 entries + counts 받아 필터링 UI 처리.
 *       cause 분류는 reasonTag enum 한국어 라벨 (REASON_TAG_LABEL) 활용.
 */

import { sql } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import type { ReasonTag } from "@/lib/db/schema"
import { NotebookClient } from "./NotebookClient"

export const dynamic = "force-dynamic"

export interface NotebookEntry {
  itemId: string
  itemLabel: string
  itemSource: string | null
  itemNumber: number | null
  seenCount: number
  lastSolvedAt: string | null
  label: "wrong" | "unsure"
  reasonTags: ReasonTag[]
  attemptTimestamp: string | null
}

interface Props {
  searchParams: Promise<{ cause?: string }>
}

export default async function NotebookPage({ searchParams }: Props) {
  const { user } = await requireUser()
  const sp = await searchParams

  // 각 item 마지막 attempt 만 (= 오답노트 최종 상태). label='wrong' 또는 'unsure'.
  // result_history 마지막 row 추출 + 필터링.
  const rows = (await db.execute(sql`
    WITH last_attempt AS (
      SELECT
        uih.item_id,
        uih.seen_count,
        uih.last_solved_at,
        uih.result_history -> (jsonb_array_length(uih.result_history) - 1) AS r
      FROM user_item_history uih
      WHERE uih.user_id = ${user.id}
        AND jsonb_array_length(uih.result_history) > 0
    )
    SELECT
      la.item_id                     AS "itemId",
      n.label                        AS "itemLabel",
      n.item_source                  AS "itemSource",
      n.item_number                  AS "itemNumber",
      la.seen_count                  AS "seenCount",
      la.last_solved_at              AS "lastSolvedAt",
      la.r->>'label'                 AS "label",
      la.r->>'timestamp'             AS "attemptTimestamp",
      COALESCE(la.r->'reasonTags', '[]'::jsonb) AS "reasonTags"
    FROM last_attempt la
    JOIN public.nodes n ON n.id = la.item_id
    WHERE la.r->>'label' IN ('wrong', 'unsure')
    ORDER BY la.last_solved_at DESC NULLS LAST
    LIMIT 100
  `)) as unknown as Array<{
    itemId: string
    itemLabel: string
    itemSource: string | null
    itemNumber: number | null
    seenCount: number
    lastSolvedAt: Date | null
    label: "wrong" | "unsure"
    attemptTimestamp: string | null
    reasonTags: ReasonTag[]
  }>

  const entries: NotebookEntry[] = rows.map((r) => ({
    itemId: r.itemId,
    itemLabel: r.itemLabel,
    itemSource: r.itemSource,
    itemNumber: r.itemNumber,
    seenCount: r.seenCount,
    lastSolvedAt: r.lastSolvedAt ? new Date(r.lastSolvedAt).toISOString() : null,
    label: r.label,
    reasonTags: Array.isArray(r.reasonTags) ? r.reasonTags : [],
    attemptTimestamp: r.attemptTimestamp,
  }))

  // Stage 11: ?cause=wrong (recovery redirect) 또는 사용자 직접 진입.
  const initialCause = sp.cause ?? "all"

  return <NotebookClient entries={entries} initialCause={initialCause} />
}
