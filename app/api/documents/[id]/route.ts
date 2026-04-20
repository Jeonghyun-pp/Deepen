import { and, eq, inArray, notInArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  chunkNodeMappings,
  chunks,
  documents,
  nodes,
} from "@/lib/db/schema"
import { requireUser } from "@/lib/auth/require-user"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

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

/**
 * 문서 삭제 + cascade:
 *   1) 이 문서에만 속한 orphan 노드 선별 → DELETE (edges도 FK cascade)
 *   2) Storage PDF 파일 제거
 *   3) documents row DELETE (chunks, mappings는 schema FK cascade로 자동 삭제)
 */
export async function DELETE(
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

    const docChunks = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(eq(chunks.documentId, id))
    const chunkIds = docChunks.map((c) => c.id)

    if (chunkIds.length > 0) {
      const mappedRows = await db
        .select({ nodeId: chunkNodeMappings.nodeId })
        .from(chunkNodeMappings)
        .where(inArray(chunkNodeMappings.chunkId, chunkIds))
      const candidateNodeIds = [...new Set(mappedRows.map((r) => r.nodeId))]

      if (candidateNodeIds.length > 0) {
        const sharedRows = await db
          .select({ nodeId: chunkNodeMappings.nodeId })
          .from(chunkNodeMappings)
          .where(
            and(
              inArray(chunkNodeMappings.nodeId, candidateNodeIds),
              notInArray(chunkNodeMappings.chunkId, chunkIds),
            ),
          )
        const sharedSet = new Set(sharedRows.map((r) => r.nodeId))
        const orphanIds = candidateNodeIds.filter((nid) => !sharedSet.has(nid))

        if (orphanIds.length > 0) {
          await db
            .delete(nodes)
            .where(
              and(eq(nodes.userId, user.id), inArray(nodes.id, orphanIds)),
            )
        }
      }
    }

    if (doc.storagePath) {
      const admin = createSupabaseAdminClient()
      await admin.storage
        .from("documents")
        .remove([doc.storagePath])
        .catch((e) => {
          console.warn(
            `[DELETE /api/documents/${id}] storage cleanup failed`,
            e,
          )
        })
    }

    await db
      .delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, user.id)))

    return Response.json({ ok: true })
  } catch (e) {
    if (e instanceof Response) return e
    console.error("[DELETE /api/documents/[id]]", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}
