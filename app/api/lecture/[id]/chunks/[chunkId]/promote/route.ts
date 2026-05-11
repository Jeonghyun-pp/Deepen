/**
 * POST /api/lecture/[id]/chunks/[chunkId]/promote — chunk 를 새 노드로 승급.
 * Spec: docs/north-star-spec-2026-05-11.md §4.2 미매핑 drawer 액션.
 *
 * 동작:
 *   1. lecture 소유자 확인 (RLS 보강)
 *   2. chunks.content prefix 로 새 node (type='pattern', status='draft') 생성
 *   3. chunk_node_map insert (state='confirmed', proposed_by='user', confidence=1)
 *   4. lectures.totalNodes++
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
  "POST /api/lecture/[id]/chunks/[chunkId]/promote",
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

    // chunk 가 lecture 의 document 에 속하는지 확인
    const [chunk] = await db
      .select({
        id: chunks.id,
        content: chunks.content,
        sectionTitle: chunks.sectionTitle,
        documentId: chunks.documentId,
      })
      .from(chunks)
      .where(eq(chunks.id, chunkId))
      .limit(1)
    if (!chunk || chunk.documentId !== lecture.documentId) {
      return apiError.notFound("chunk_not_in_lecture")
    }

    // 노드 라벨 — sectionTitle 우선, 없으면 content prefix 60자
    const label =
      chunk.sectionTitle?.trim() ||
      chunk.content.trim().slice(0, 60).replace(/\s+/g, " ")

    // 새 노드 생성 (draft → admin 검수)
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

    // chunk_node_map upsert confirmed
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

    // lectures.totalNodes++
    await db
      .update(lectures)
      .set({ totalNodes: sql`${lectures.totalNodes} + 1` })
      .where(eq(lectures.id, lectureId))

    return Response.json({ ok: true, nodeId: newNode.id }, { status: 200 })
  },
)
