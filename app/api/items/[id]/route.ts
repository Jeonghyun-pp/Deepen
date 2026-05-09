/**
 * GET /api/items/[id] — Item 단건 조회 (풀이 화면용).
 * Spec: docs/build-spec/03-api-contracts.md §7, M1.3.
 *
 * Pattern 들 (이 Item 이 contains 엣지로 묶인 source) 의 ID 목록도 함께 반환.
 * Pattern signature/grade 등 상세는 별 라우트로 (M1.4 그래프 fetch).
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import type { ItemResponse } from "@/lib/api/schemas/items"

export const runtime = "nodejs"

export const GET = withAuth<{ id: string }>(
  "GET /api/items/[id]",
  async (_request, { params }) => {
    const itemId = params.id

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

    if (!item) return apiError.notFound("item_not_found")

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

    const response: ItemResponse = {
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

    return Response.json(response, { status: 200 })
  },
)
