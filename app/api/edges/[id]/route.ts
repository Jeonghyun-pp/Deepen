import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    if (!id) {
      return Response.json({ error: "id_required" }, { status: 400 })
    }

    const deleted = await db
      .delete(edges)
      .where(and(eq(edges.id, id), eq(edges.userId, user.id)))
      .returning({ id: edges.id })

    if (deleted.length === 0) {
      return Response.json({ error: "not_found" }, { status: 404 })
    }

    return Response.json({ ok: true, id: deleted[0].id })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[DELETE /api/edges/[id]]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
