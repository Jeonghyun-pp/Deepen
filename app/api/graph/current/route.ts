import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { user } = await requireUser()

    const [userNodes, userEdges] = await Promise.all([
      db.select().from(nodes).where(eq(nodes.userId, user.id)),
      db.select().from(edges).where(eq(edges.userId, user.id)),
    ])

    return Response.json({ nodes: userNodes, edges: userEdges })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[GET /api/graph/current]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
