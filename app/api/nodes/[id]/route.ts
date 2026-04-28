import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * 노드 단건 삭제.
 * edges (source/target FK), chunk_node_mappings (node_id FK) 는 schema cascade로 자동 정리.
 */
export const DELETE = withAuth<{ id: string }>(
  "DELETE /api/nodes/[id]",
  async (_request, { user, params }) => {
    const { id } = params
    if (!id) return apiError.badRequest("id_required")

    const deleted = await db
      .delete(nodes)
      .where(and(eq(nodes.id, id), eq(nodes.userId, user.id)))
      .returning({ id: nodes.id })

    if (deleted.length === 0) return apiError.notFound()

    return Response.json({ ok: true, id: deleted[0].id })
  },
)
