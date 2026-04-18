import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const NODE_TYPES = [
  "paper",
  "concept",
  "technique",
  "application",
  "question",
  "memo",
  "document",
] as const
type NodeType = (typeof NODE_TYPES)[number]

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const body = await request.json()

    const label = typeof body.label === "string" ? body.label.trim() : ""
    if (!label) {
      return Response.json({ error: "label_required" }, { status: 400 })
    }

    const type: NodeType = NODE_TYPES.includes(body.type)
      ? body.type
      : "concept"

    const [created] = await db
      .insert(nodes)
      .values({
        userId: user.id,
        label,
        type,
        content: typeof body.content === "string" ? body.content : "",
        tldr: typeof body.tldr === "string" ? body.tldr : null,
        meta: body.meta ?? null,
        whiteboardPos: body.whiteboardPos ?? null,
        sectionId: typeof body.sectionId === "string" ? body.sectionId : null,
      })
      .returning()

    return Response.json(created, { status: 201 })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[POST /api/nodes]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
