import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { user } = await requireUser()
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(desc(documents.createdAt))
    return Response.json({ documents: rows })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[GET /api/documents]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
