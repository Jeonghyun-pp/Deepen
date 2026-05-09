/**
 * GET /api/admin/seed/queue — draft 노드 큐 조회.
 * Spec: docs/build-spec/03-api-contracts.md §10.
 *
 * 시드 작업자가 PDF 파이프라인이 추출한 draft 노드를 검수·승격.
 */

import { and, asc, count, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"
import {
  SeedQueueRequest,
  type QueueNodeDto,
  type SeedQueueResponse,
} from "@/lib/api/schemas/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const toDto = (
  n: typeof nodes.$inferSelect,
): QueueNodeDto => ({
  id: n.id,
  type: n.type,
  label: n.label,
  grade: n.grade,
  displayLayer: n.displayLayer,
  signature: (n.signature as string[] | null) ?? null,
  isKiller: n.isKiller,
  frequencyRank: n.frequencyRank,
  avgCorrectRate: n.avgCorrectRate,
  itemSource: n.itemSource,
  itemYear: n.itemYear,
  itemNumber: n.itemNumber,
  itemDifficulty: n.itemDifficulty,
  itemAnswer: n.itemAnswer,
  itemSolution: n.itemSolution,
  itemChoices: (n.itemChoices as string[] | null) ?? null,
  status: n.status,
  createdAt: n.createdAt.toISOString(),
})

export const GET = withAdmin("GET /api/admin/seed/queue", async (request) => {
  const url = new URL(request.url)
  const parsed = SeedQueueRequest.safeParse({
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? "draft",
    limit: Number(url.searchParams.get("limit") ?? 50),
    offset: Number(url.searchParams.get("offset") ?? 0),
  })
  if (!parsed.success) return apiError.badRequest("validation_failed")
  const { type, status, limit, offset } = parsed.data

  const where = type
    ? and(eq(nodes.status, status), eq(nodes.type, type))
    : eq(nodes.status, status)

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(nodes)
      .where(where)
      .orderBy(asc(nodes.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ value: count() }).from(nodes).where(where),
  ])

  const response: SeedQueueResponse = {
    items: rows.map(toDto),
    total: Number(totalRow[0]?.value ?? 0),
  }
  return Response.json(response, { status: 200 })
})
