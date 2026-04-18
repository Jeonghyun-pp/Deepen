import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  chunkNodeMappings,
  chunks,
  documents,
  nodes,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * 특정 노드의 출처 chunk + 문서 타이틀을 반환.
 * RightPanel Graph 탭의 "출처" 섹션이 소비.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireUser()
    const { id: nodeId } = await params

    // 노드 소유권 확인
    const [owned] = await db
      .select({ id: nodes.id })
      .from(nodes)
      .where(and(eq(nodes.id, nodeId), eq(nodes.userId, user.id)))
      .limit(1)
    if (!owned) {
      return Response.json({ error: "not_found" }, { status: 404 })
    }

    // mapping → chunk 조회
    const mappings = await db
      .select({ chunkId: chunkNodeMappings.chunkId })
      .from(chunkNodeMappings)
      .where(
        and(
          eq(chunkNodeMappings.nodeId, nodeId),
          eq(chunkNodeMappings.userId, user.id)
        )
      )
    if (mappings.length === 0) {
      return Response.json({ sources: [] })
    }

    const chunkIds = mappings.map((m) => m.chunkId)
    const rows = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        contentType: chunks.contentType,
        pageStart: chunks.pageStart,
        pageEnd: chunks.pageEnd,
        ordinal: chunks.ordinal,
        documentId: chunks.documentId,
        documentTitle: documents.title,
      })
      .from(chunks)
      .innerJoin(documents, eq(documents.id, chunks.documentId))
      .where(and(inArray(chunks.id, chunkIds), eq(chunks.userId, user.id)))

    rows.sort(
      (a, b) =>
        a.documentId.localeCompare(b.documentId) || a.ordinal - b.ordinal
    )

    return Response.json({ sources: rows })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[GET /api/nodes/[id]/sources]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
