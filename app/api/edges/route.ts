import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges, nodes } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EDGE_TYPES = ["prerequisite", "contains", "relatedTo"] as const
type EdgeType = (typeof EDGE_TYPES)[number]

export const POST = withAuth("POST /api/edges", async (request, { user }) => {
  const body = await request.json()

  const source = typeof body.sourceNodeId === "string" ? body.sourceNodeId : ""
  const target = typeof body.targetNodeId === "string" ? body.targetNodeId : ""
  if (!source || !target) return apiError.badRequest("source_and_target_required")
  if (source === target) return apiError.badRequest("self_loop_not_allowed")

  // 두 노드 모두 본인 소유인지 확인 — RLS 대체 방어선
  const owned = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.userId, user.id), inArray(nodes.id, [source, target])))
  if (owned.length !== 2) return apiError.notFound("node_not_found")

  const type: EdgeType = EDGE_TYPES.includes(body.type) ? body.type : "relatedTo"

  const [created] = await db
    .insert(edges)
    .values({
      userId: user.id,
      sourceNodeId: source,
      targetNodeId: target,
      type,
      label: typeof body.label === "string" ? body.label : null,
      weight: typeof body.weight === "number" ? body.weight : null,
      note: typeof body.note === "string" ? body.note : null,
    })
    .returning()

  return Response.json(created, { status: 201 })
})
