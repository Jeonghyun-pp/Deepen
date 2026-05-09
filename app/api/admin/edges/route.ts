/**
 * POST /api/admin/edges — 엣지 추가 (시드 작업).
 *
 * 검증:
 *   - source/target 둘 다 존재
 *   - prerequisite: source·target 모두 type='pattern'
 *   - contains: source='pattern', target='item'
 *   - prerequisite 추가 시 사이클 방지
 *   - 중복 (source,target,type) 거부
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges, nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"
import { CreateEdgeRequest } from "@/lib/api/schemas/admin"
import { wouldCreatePrereqCycle } from "@/lib/graph/cycle-check"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAdmin("POST /api/admin/edges", async (request, { user }) => {
  let body: ReturnType<typeof CreateEdgeRequest.parse>
  try {
    body = CreateEdgeRequest.parse(await request.json())
  } catch {
    return apiError.badRequest("validation_failed")
  }

  const [src] = await db
    .select({ type: nodes.type })
    .from(nodes)
    .where(eq(nodes.id, body.sourceNodeId))
    .limit(1)
  const [tgt] = await db
    .select({ type: nodes.type })
    .from(nodes)
    .where(eq(nodes.id, body.targetNodeId))
    .limit(1)
  if (!src || !tgt) return apiError.notFound("node_not_found")

  if (body.type === "prerequisite") {
    if (src.type !== "pattern" || tgt.type !== "pattern") {
      return apiError.badRequest("prerequisite_pattern_only")
    }
    const cycle = await wouldCreatePrereqCycle(
      body.sourceNodeId,
      body.targetNodeId,
    )
    if (cycle) return apiError.conflict("would_create_cycle")
  } else if (body.type === "contains") {
    if (src.type !== "pattern" || tgt.type !== "item") {
      return apiError.badRequest("contains_pattern_to_item")
    }
  }

  const [existing] = await db
    .select({ id: edges.id })
    .from(edges)
    .where(
      and(
        eq(edges.sourceNodeId, body.sourceNodeId),
        eq(edges.targetNodeId, body.targetNodeId),
        eq(edges.type, body.type),
      ),
    )
    .limit(1)
  if (existing) return apiError.conflict("edge_exists")

  const [created] = await db
    .insert(edges)
    .values({
      userId: user.id,
      sourceNodeId: body.sourceNodeId,
      targetNodeId: body.targetNodeId,
      type: body.type,
    })
    .returning()

  return Response.json({ edge: created }, { status: 201 })
})
