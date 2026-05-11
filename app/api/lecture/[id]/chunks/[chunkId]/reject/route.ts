/**
 * POST /api/lecture/[id]/chunks/[chunkId]/reject — chunk 매핑 모두 rejected.
 * Spec: docs/north-star-spec-2026-05-11.md §4.2 미매핑 drawer 액션.
 *
 * 동작:
 *   1. lecture 소유자 확인
 *   2. 해당 chunk 의 모든 chunk_node_map row 를 state='rejected' 로 update
 *   3. 매핑이 없으면 stub rejected row (node_id=null 은 FK 위배 → 특별 마커 노드)
 *      대신 "ignored" 마커 노드를 lecture 단위로 1개 만들어 매핑.
 *      현재 단순화: 매핑 없으면 noop (커버리지 unmapped 그대로).
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { chunkNodeMap, chunks, lectures } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth<{ id: string; chunkId: string }>(
  "POST /api/lecture/[id]/chunks/[chunkId]/reject",
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
      .select({ id: chunks.id, documentId: chunks.documentId })
      .from(chunks)
      .where(eq(chunks.id, chunkId))
      .limit(1)
    if (!chunk || chunk.documentId !== lecture.documentId) {
      return apiError.notFound("chunk_not_in_lecture")
    }

    // 해당 chunk 의 모든 매핑 rejected
    await db
      .update(chunkNodeMap)
      .set({
        state: "rejected",
        reviewedAt: new Date(),
        reviewedBy: user.id,
      })
      .where(eq(chunkNodeMap.chunkId, chunkId))

    return Response.json({ ok: true }, { status: 200 })
  },
)
