/**
 * POST /api/lecture/[id]/chunks/[chunkId]/commentary — chunk 를 Deepen 해설로 표시.
 * Spec: docs/north-star-spec-2026-05-11.md §4.2 미매핑 drawer 액션.
 *
 * "노드로 승급" 과 다르게 별도 commentary 노드 1개를 lecture 단위로 공유하지 않고
 * promote 와 동일한 흐름이지만 displayLayer='concept' 로 표시. 추후 별도 enum 도입 시
 * 확장. 현재 minimal viable.
 */

import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  chunkNodeMap,
  chunks,
  lectures,
  nodes,
} from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth<{ id: string; chunkId: string }>(
  "POST /api/lecture/[id]/chunks/[chunkId]/commentary",
  async (_req, { user, params }) => {
    const { id: lectureId, chunkId } = params

    const [lecture] = await db
      .select({ id: lectures.id, documentId: lectures.documentId })
      .from(lectures)
      .where(
        and(eq(lectures.id, lectureId), eq(lectures.userId, user.id)),
      )
      .limit(1)
    if (!lecture) return apiError.notFound("lecture_not_found")

    const [chunk] = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        documentId: chunks.documentId,
      })
      .from(chunks)
      .where(eq(chunks.id, chunkId))
      .limit(1)
    if (!chunk || chunk.documentId !== lecture.documentId) {
      return apiError.notFound("chunk_not_in_lecture")
    }

    const label = `[해설] ${chunk.content.trim().slice(0, 50)}`
    const [newNode] = await db
      .insert(nodes)
      .values({
        type: "pattern",
        label,
        status: "draft",
        displayLayer: "concept",
      })
      .returning({ id: nodes.id })
    if (!newNode)
      return Response.json({ error: "node_create_failed" }, { status: 500 })

    await db
      .insert(chunkNodeMap)
      .values({
        chunkId,
        nodeId: newNode.id,
        state: "confirmed",
        confidence: 1,
        proposedBy: "user",
        reviewedAt: new Date(),
        reviewedBy: user.id,
      })
      .onConflictDoUpdate({
        target: [chunkNodeMap.chunkId, chunkNodeMap.nodeId],
        set: {
          state: "confirmed",
          confidence: 1,
          proposedBy: "user",
          reviewedAt: new Date(),
          reviewedBy: user.id,
        },
      })

    await db
      .update(lectures)
      .set({ totalNodes: sql`${lectures.totalNodes} + 1` })
      .where(eq(lectures.id, lectureId))

    return Response.json({ ok: true, nodeId: newNode.id }, { status: 200 })
  },
)
