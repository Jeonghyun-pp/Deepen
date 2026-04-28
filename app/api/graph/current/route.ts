import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth("GET /api/graph/current", async (_req, { user }) => {
  const [userNodes, userEdges] = await Promise.all([
    db.select().from(nodes).where(eq(nodes.userId, user.id)),
    db.select().from(edges).where(eq(edges.userId, user.id)),
  ])
  return Response.json({ nodes: userNodes, edges: userEdges })
})
