/**
 * POST /api/admin/nodes/[id]/publish — draft → published.
 *
 * 검증: Pattern 은 grade·signature 필요. Item 은 itemAnswer 필요.
 *       부족하면 400 + 부족 필드 명시.
 */

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAdmin<{ id: string }>(
  "POST /api/admin/nodes/[id]/publish",
  async (_request, { params }) => {
    const [node] = await db
      .select()
      .from(nodes)
      .where(eq(nodes.id, params.id))
      .limit(1)
    if (!node) return apiError.notFound("node_not_found")

    const missing: string[] = []
    if (node.type === "pattern") {
      if (!node.grade) missing.push("grade")
      const sig = node.signature as string[] | null
      if (!sig || sig.length === 0) missing.push("signature")
    } else {
      if (!node.itemAnswer) missing.push("itemAnswer")
    }

    if (missing.length > 0) {
      return Response.json(
        { error: "missing_fields", missing },
        { status: 400 },
      )
    }

    const [updated] = await db
      .update(nodes)
      .set({ status: "published", updatedAt: new Date() })
      .where(eq(nodes.id, params.id))
      .returning()

    return Response.json({ ok: true, node: updated }, { status: 200 })
  },
)
