/**
 * DELETE /api/admin/edges/[id] — 엣지 삭제.
 */

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/edges/[id]",
  async (_request, { params }) => {
    const [existing] = await db
      .select({ id: edges.id })
      .from(edges)
      .where(eq(edges.id, params.id))
      .limit(1)
    if (!existing) return apiError.notFound("edge_not_found")

    await db.delete(edges).where(eq(edges.id, params.id))
    return Response.json({ ok: true }, { status: 200 })
  },
)
