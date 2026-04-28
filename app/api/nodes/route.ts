import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

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

export const POST = withAuth("POST /api/nodes", async (request, { user }) => {
  const body = await request.json()

  const label = typeof body.label === "string" ? body.label.trim() : ""
  if (!label) return apiError.badRequest("label_required")

  const type: NodeType = NODE_TYPES.includes(body.type) ? body.type : "concept"

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
})
