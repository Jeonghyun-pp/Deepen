import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth("GET /api/documents", async (_req, { user }) => {
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.createdAt))
  return Response.json({ documents: rows })
})
