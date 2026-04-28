import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const DELETE = withAuth<{ id: string }>(
  "DELETE /api/edges/[id]",
  async (_request, { user, params }) => {
    const { id } = params
    if (!id) return apiError.badRequest("id_required")

    const deleted = await db
      .delete(edges)
      .where(and(eq(edges.id, id), eq(edges.userId, user.id)))
      .returning({ id: edges.id })

    if (deleted.length === 0) return apiError.notFound()

    return Response.json({ ok: true, id: deleted[0].id })
  },
)
