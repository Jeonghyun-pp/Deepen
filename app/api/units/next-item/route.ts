/**
 * GET /api/units/next-item?unitKey=&excludeItemId= — 다음 풀 Item.
 * Q1 정책 단순화: published Item 중 createdAt 오름차순.
 *               excludeItemId 다음 항목. 마지막이면 null.
 *
 * 본격 추천 정책 (M1.6+) 은 lib/recommend/policy.ts — 모드/마스터리/
 * weakness alignment 반영. Q1 home → 첫 풀이 진입용 단순 next-id.
 */

import { and, asc, eq, gt } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  NextItemRequest,
  type NextItemResponse,
} from "@/lib/api/schemas/units"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth("GET /api/units/next-item", async (request) => {
  const url = new URL(request.url)
  const parsed = NextItemRequest.safeParse({
    unitKey: url.searchParams.get("unitKey") ?? "default",
    excludeItemId: url.searchParams.get("excludeItemId") ?? undefined,
  })
  if (!parsed.success) return apiError.badRequest("validation_failed")
  const { excludeItemId } = parsed.data

  // 시작 anchor — excludeItemId 의 createdAt 가져옴
  let pivot: Date | null = null
  if (excludeItemId) {
    const [row] = await db
      .select({ createdAt: nodes.createdAt })
      .from(nodes)
      .where(eq(nodes.id, excludeItemId))
      .limit(1)
    pivot = row?.createdAt ?? null
  }

  const conditions = [
    eq(nodes.type, "item"),
    eq(nodes.status, "published"),
  ]
  if (pivot) conditions.push(gt(nodes.createdAt, pivot))

  const [next] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(...conditions))
    .orderBy(asc(nodes.createdAt))
    .limit(1)

  // pivot 다음이 없으면 처음으로 wrap (excludeItemId 와 다른 첫 Item)
  if (!next && excludeItemId) {
    const [first] = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(
        and(eq(nodes.type, "item"), eq(nodes.status, "published")),
      )
      .orderBy(asc(nodes.createdAt))
      .limit(1)
    if (first && first.id !== excludeItemId) {
      const response: NextItemResponse = { itemId: first.id }
      return Response.json(response, { status: 200 })
    }
  }

  const response: NextItemResponse = { itemId: next?.id ?? null }
  return Response.json(response, { status: 200 })
})
