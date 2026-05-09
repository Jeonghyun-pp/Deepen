/**
 * POST /api/admin/nodes/[id]/discard — draft 노드 무시 (삭제).
 * publish 된 노드에는 동작 X (강사가 의도적으로 잘못 publish 했을 때
 * 별도 unpublish 흐름 — Q1 엔 필요 없음).
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAdmin<{ id: string }>(
  "POST /api/admin/nodes/[id]/discard",
  async (_request, { params }) => {
    const [existing] = await db
      .select({ status: nodes.status })
      .from(nodes)
      .where(eq(nodes.id, params.id))
      .limit(1)
    if (!existing) return apiError.notFound("node_not_found")
    if (existing.status === "published") {
      return apiError.conflict("published_cannot_discard")
    }
    await db
      .delete(nodes)
      .where(and(eq(nodes.id, params.id), eq(nodes.status, "draft")))
    return Response.json({ ok: true }, { status: 200 })
  },
)
