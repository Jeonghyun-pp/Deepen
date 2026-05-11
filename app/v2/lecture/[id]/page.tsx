/**
 * /v2/lecture/[id] — 강의안 워크스페이스 hero (북극성 Stage 2).
 * Spec: docs/north-star-spec-2026-05-11.md §4.1
 *
 * 입시 `/v2/workspace/[itemId]` 와 평행한 강의안 도메인 hero.
 * 3-pane: 좌 chunks / 중 PDF / 우 커버리지 검수.
 *
 * Q1: lecture row 가 없으면 documentId 기반 자동 생성.
 *     "id" param 은 lectures.id (uuid).
 */

import { notFound, redirect } from "next/navigation"
import { and, eq, sql } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import {
  chunks,
  chunkNodeMap,
  documents,
  lectures,
  users,
} from "@/lib/db/schema"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { computeCoverage } from "@/lib/north-star/coverage"
import { LectureClient } from "./LectureClient"

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function LecturePage({ params }: Props) {
  const { id } = await params
  const { user } = await requireUser()

  // Onboard 게이트 — workspace 와 동일 패턴
  const [profile] = await db
    .select({ onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!profile?.onboardedAt) redirect("/v2/onboard/profile")

  // lecture row 조회 (RLS: user_id = auth.uid())
  const [lecture] = await db
    .select()
    .from(lectures)
    .where(and(eq(lectures.id, id), eq(lectures.userId, user.id)))
    .limit(1)

  if (!lecture) notFound()

  // 문서 + chunks fetch
  const [doc] = await db
    .select({
      id: documents.id,
      title: documents.title,
      storagePath: documents.storagePath,
    })
    .from(documents)
    .where(eq(documents.id, lecture.documentId))
    .limit(1)

  if (!doc) notFound()

  // chunks (lecture 가 가리키는 document 의 모든 chunk)
  const chunkRows = await db
    .select({
      id: chunks.id,
      ordinal: chunks.ordinal,
      sectionTitle: chunks.sectionTitle,
      pageStart: chunks.pageStart,
      content: chunks.content,
    })
    .from(chunks)
    .where(eq(chunks.documentId, doc.id))
    .orderBy(chunks.ordinal)
    .limit(500)

  // chunk_node_map (해당 document 의 모든 chunk 의 매핑)
  const mappingRows =
    chunkRows.length > 0
      ? ((await db.execute(sql`
          SELECT chunk_id AS "chunkId", node_id AS "nodeId", state, confidence,
                 proposed_by AS "proposedBy"
          FROM chunk_node_map
          WHERE chunk_id IN (
            SELECT id FROM chunks WHERE document_id = ${doc.id}
          )
        `)) as unknown as Array<{
          chunkId: string
          nodeId: string
          state: "proposed" | "confirmed" | "rejected"
          confidence: number
          proposedBy: "llm" | "user"
        }>)
      : []

  // 커버리지 계산 (pure function)
  const coverage = computeCoverage({
    chunks: chunkRows.map((c) => ({ id: c.id })),
    mappings: mappingRows,
  })

  // signed URL (PDF)
  let pdfSignedUrl: string | null = null
  if (doc.storagePath) {
    const admin = createSupabaseAdminClient()
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(doc.storagePath, 3600)
    pdfSignedUrl = signed?.signedUrl ?? null
  }

  return (
    <LectureClient
      lectureId={lecture.id}
      lectureTitle={lecture.title}
      lectureStatus={lecture.status}
      pdfSignedUrl={pdfSignedUrl}
      docTitle={doc.title}
      chunks={chunkRows.map((c) => ({
        id: c.id,
        ordinal: c.ordinal,
        sectionTitle: c.sectionTitle,
        pageStart: c.pageStart,
        content: c.content,
      }))}
      mappings={mappingRows}
      coverage={coverage}
    />
  )
}
