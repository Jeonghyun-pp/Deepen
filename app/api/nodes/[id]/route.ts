import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * 노드 단건 삭제.
 * edges (source/target FK), chunk_node_mappings (node_id FK) 는 schema cascade로 자동 정리.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    if (!id) {
      return Response.json({ error: "id_required" }, { status: 400 })
    }

    const deleted = await db
      .delete(nodes)
      .where(and(eq(nodes.id, id), eq(nodes.userId, user.id)))
      .returning({ id: nodes.id })

    if (deleted.length === 0) {
      return Response.json({ error: "not_found" }, { status: 404 })
    }

    return Response.json({ ok: true, id: deleted[0].id })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[DELETE /api/nodes/[id]]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
