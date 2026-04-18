import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { documents } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireUser()
    const { id } = await params

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, user.id)))
      .limit(1)

    if (!doc) {
      return Response.json({ error: "not_found" }, { status: 404 })
    }
    return Response.json(doc)
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[GET /api/documents/[id]]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
