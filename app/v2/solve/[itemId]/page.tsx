/**
 * 풀이 화면 — 입시 풀이 hero (M1.3).
 * Spec: docs/build-spec/07-q1-build.md M1.3.
 *
 * Server Component:
 *   - itemId 검증 + Item 단건 prefetch (RLS 통과 시점에 server-side fetch)
 *   - 발견 못 하면 notFound()
 *   - 발견 시 SolveClient 에 Item payload 전달
 *
 * mode 는 항상 'practice' (A-3 결정). 모드 셀렉터 노출 X.
 */

import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"
import type { ItemResponse } from "@/lib/api/schemas/items"
import { SolveClient } from "./SolveClient"

interface Props {
  params: Promise<{ itemId: string }>
  searchParams: Promise<{ mode?: string }>
}

export const dynamic = "force-dynamic"

const ALLOWED_MODES = new Set(["practice", "exam", "recovery"])

export default async function SolvePage({ params, searchParams }: Props) {
  const { itemId } = await params
  const sp = await searchParams
  const mode =
    sp.mode && ALLOWED_MODES.has(sp.mode)
      ? (sp.mode as "practice" | "exam" | "recovery")
      : "practice"

  // RLS 정책 (status='published' OR user_id=auth.uid()) 통과 보장 위해
  // Supabase 세션 컨텍스트로 쿼리. requireUser 가 미인증 시 redirect.
  const { user } = await requireUser()

  const [item] = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.id, itemId),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
      ),
    )
    .limit(1)

  if (!item) notFound()

  const patternRows = await db
    .select({ patternId: edges.sourceNodeId })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        eq(edges.targetNodeId, itemId),
        eq(edges.type, "contains"),
        eq(nodes.type, "pattern"),
      ),
    )

  const itemPayload: ItemResponse = {
    id: item.id,
    type: "item",
    label: item.label,
    itemSource: item.itemSource,
    itemYear: item.itemYear,
    itemNumber: item.itemNumber,
    itemDifficulty: item.itemDifficulty,
    itemChoices: (item.itemChoices as string[] | null) ?? null,
    itemAnswer: item.itemAnswer,
    itemSolution: item.itemSolution,
    patternIds: patternRows.map((r) => r.patternId),
  }

  return <SolveClient item={itemPayload} userId={user.id} mode={mode} />
}
