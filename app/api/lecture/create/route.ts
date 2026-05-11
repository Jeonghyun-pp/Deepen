/**
 * POST /api/lecture/create — 강의안 lecture row 생성.
 * Spec: docs/north-star-spec-2026-05-11.md Stage 2.
 *
 * 입력: { documentId } — 사용자가 소유한 documents.id (status='ready' 권장).
 * 출력: { lectureId } — 생성된 row id. 클라가 /v2/lecture/[id] 로 push.
 *
 * 동일 (user, documentId) 가 이미 있으면 그것을 반환 (idempotent).
 * 강의안의 chunk → node 매핑 LLM 제안은 별도 sub-stage 에서 trigger (현재는 빈 매핑으로 시작).
 */

import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { chunks, documents, lectures } from "@/lib/db/schema"
import { apiError, withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const Body = z.object({ documentId: z.string().uuid() })

export const POST = withAuth(
  "POST /api/lecture/create",
  async (req, { user }) => {
    let body: z.infer<typeof Body>
    try {
      body = Body.parse(await req.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // 사용자 소유 document 확인
    const [doc] = await db
      .select({
        id: documents.id,
        title: documents.title,
        status: documents.status,
      })
      .from(documents)
      .where(
        and(eq(documents.id, body.documentId), eq(documents.userId, user.id)),
      )
      .limit(1)
    if (!doc) return apiError.notFound("document_not_found")

    // 이미 있으면 idempotent — 그 lecture 반환
    const [existing] = await db
      .select({ id: lectures.id })
      .from(lectures)
      .where(
        and(
          eq(lectures.userId, user.id),
          eq(lectures.documentId, body.documentId),
        ),
      )
      .limit(1)
    if (existing) {
      return Response.json({ lectureId: existing.id, created: false })
    }

    // totalChunks snapshot
    const chunkRows = await db
      .select({ id: chunks.id })
      .from(chunks)
      .where(eq(chunks.documentId, doc.id))
    const totalChunks = chunkRows.length

    const [lecture] = await db
      .insert(lectures)
      .values({
        userId: user.id,
        documentId: doc.id,
        title: doc.title ?? "강의안",
        totalChunks,
        totalNodes: 0,
        status: "in_progress",
      })
      .returning({ id: lectures.id })

    if (!lecture)
      return Response.json({ error: "lecture_create_failed" }, { status: 500 })

    return Response.json(
      { lectureId: lecture.id, created: true },
      { status: 201 },
    )
  },
)
