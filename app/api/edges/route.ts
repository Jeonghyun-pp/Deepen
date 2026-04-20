import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges, nodes } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EDGE_TYPES = ["prerequisite", "contains", "relatedTo"] as const
type EdgeType = (typeof EDGE_TYPES)[number]

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const body = await request.json()

    const source = typeof body.sourceNodeId === "string" ? body.sourceNodeId : ""
    const target = typeof body.targetNodeId === "string" ? body.targetNodeId : ""
    if (!source || !target) {
      return Response.json(
        { error: "source_and_target_required" },
        { status: 400 }
      )
    }
    if (source === target) {
      return Response.json({ error: "self_loop_not_allowed" }, { status: 400 })
    }

    // 두 노드 모두 본인 소유인지 확인 — RLS 대체 방어선
    const owned = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(and(eq(nodes.userId, user.id), inArray(nodes.id, [source, target])))
    if (owned.length !== 2) {
      return Response.json({ error: "node_not_found" }, { status: 404 })
    }

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
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[POST /api/edges]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
