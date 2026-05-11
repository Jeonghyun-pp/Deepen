/**
 * /v2/workspace/[itemId] — 통합 워크스페이스 (Phase 1A 셸).
 *
 * 13 lock 결정사항: project_workspace_v0_lock_decisions.md
 * 시안: docs/workspace-mockup-2026-05-10.html
 *
 * Phase 1A 범위 (이번 커밋):
 *   - 3-pane 셸 (좌 PDF chunks / 가운데 SolveClient hero / 우 CoachPanel)
 *   - 헤더 (breadcrumb + AI 사용량 캡슐)
 *   - 기존 컴포넌트 그대로 import — 시안과 visual 정합은 Phase 1B(PDF) 이후에.
 *
 * Phase 1B (다음): pdfjs-dist 도입 + 가운데 hero 를 SolveClient → PdfPageViewer 로 교체.
 */

import { notFound, redirect } from "next/navigation"
import { and, asc, count, desc, eq, lt } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import {
  chunks,
  documents,
  edges,
  nodes,
  patternState,
  users,
} from "@/lib/db/schema"
import { getActiveTier, getUsageStat } from "@/lib/billing/quota"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import type { ItemResponse } from "@/lib/api/schemas/items"
import { WorkspaceClient } from "./WorkspaceClient"

/** 약점 임계값 — pattern_state.theta < 0.4 = 약점. /v2/graph 의 mock 컨벤션과 정합. */
const WEAKNESS_THETA_THRESHOLD = 0.4

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ itemId: string }>
  searchParams: Promise<{
    mode?: string
    doc?: string
    /** challenge ctx (mode=challenge 일 때만 의미). standalone /v2/solve 와 동일 schema. */
    pattern?: string
    label?: string
    anchor?: string
    streak?: string
    wrong?: string
    cleared?: string
    /** retry ctx (mode=retry). recap=PID,PID,... */
    recap?: string
    /** daily batch chaining (Stage 1) — standalone /v2/solve 와 동일 schema. */
    from?: string
    batch?: string
    idx?: string
  }>
}

export default async function WorkspacePage({ params, searchParams }: Props) {
  const { itemId } = await params
  const sp = await searchParams
  const { user } = await requireUser()

  // Onboarding gate (/v2/home 와 동일 패턴)
  const [profile] = await db
    .select({ onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!profile?.onboardedAt) {
    redirect("/v2/onboard/profile")
  }

  // Item — RLS published 통과
  const [item] = await db
    .select()
    .from(nodes)
    .where(
      and(
        eq(nodes.id, itemId),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
      ),
    )
    .limit(1)
  if (!item) notFound()

  const patternRows = await db
    .select({ patternId: edges.sourceNodeId })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        eq(edges.targetNodeId, itemId),
        eq(edges.type, "contains"),
        eq(nodes.type, "pattern"),
      ),
    )

  // 좌 패널 chunks — 사용자 가장 최근 ready 문서 (sp.doc 우선)
  let documentId: string | null = sp.doc ?? null
  if (!documentId) {
    const [first] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(
        and(eq(documents.userId, user.id), eq(documents.status, "ready")),
      )
      .orderBy(desc(documents.createdAt))
      .limit(1)
    documentId = first?.id ?? null
  }

  let chunkRows: {
    id: string
    ordinal: number
    sectionTitle: string | null
    pageStart: number | null
    content: string
  }[] = []
  let docTitle: string | null = null
  let pdfSignedUrl: string | null = null
  if (documentId) {
    const [doc] = await db
      .select({ title: documents.title, storagePath: documents.storagePath })
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, user.id)))
      .limit(1)
    docTitle = doc?.title ?? null
    if (doc?.storagePath) {
      const admin = createSupabaseAdminClient()
      const { data: signed } = await admin.storage
        .from("documents")
        .createSignedUrl(doc.storagePath, 3600)
      pdfSignedUrl = signed?.signedUrl ?? null
    }
    if (docTitle) {
      chunkRows = await db
        .select({
          id: chunks.id,
          ordinal: chunks.ordinal,
          sectionTitle: chunks.sectionTitle,
          pageStart: chunks.pageStart,
          content: chunks.content,
        })
        .from(chunks)
        .where(eq(chunks.documentId, documentId))
        .orderBy(asc(chunks.ordinal))
        .limit(200)
    }
  }

  const tier = await getActiveTier(user.id)
  const usage = await getUsageStat(user.id)

  // 약점 카운트 — pattern_state.theta < 0.4 인 Pattern 수
  const [weakCountRow] = await db
    .select({ n: count() })
    .from(patternState)
    .where(
      and(
        eq(patternState.userId, user.id),
        lt(patternState.theta, WEAKNESS_THETA_THRESHOLD),
      ),
    )
  const weakCount = Number(weakCountRow?.n ?? 0)

  const itemPayload: ItemResponse = {
    id: item.id,
    type: "item",
    label: item.label,
    itemSource: item.itemSource,
    itemYear: item.itemYear,
    itemNumber: item.itemNumber,
    itemDifficulty: item.itemDifficulty,
    itemChoices: (item.itemChoices as string[] | null) ?? null,
    itemAnswer: item.itemAnswer,
    itemSolution: item.itemSolution,
    patternIds: patternRows.map((r) => r.patternId),
  }

  // 모드 swap (Phase 4 후속) — challenge/retry ctx URL 직렬화. standalone /v2/solve 와 동일 schema.
  const challengeCtx =
    sp.mode === "challenge" && sp.pattern
      ? {
          targetPatternId: sp.pattern,
          patternLabel: sp.label ?? "",
          startingDifficulty: sp.anchor ? Number(sp.anchor) : 0.5,
          consecutiveCorrect: sp.streak ? Number(sp.streak) : 0,
          consecutiveWrong: sp.wrong ? Number(sp.wrong) : 0,
          levelsCleared: sp.cleared ? Number(sp.cleared) : 0,
        }
      : null

  const retryCtx =
    sp.mode === "retry" && sp.recap
      ? {
          storedItemId: itemId,
          recapPatternIds: sp.recap.split(",").filter(Boolean),
          storedItemLabel: sp.label ?? "",
        }
      : null

  // 패턴 라벨 lookup — 모드 chip 의 chip 라벨 / challenge 진입 UI 에 활용.
  const firstPatternId = patternRows[0]?.patternId ?? null
  let firstPatternLabel = ""
  if (firstPatternId) {
    const [patternNode] = await db
      .select({ label: nodes.label })
      .from(nodes)
      .where(eq(nodes.id, firstPatternId))
      .limit(1)
    firstPatternLabel = patternNode?.label ?? ""
  }

  // Stage 1·6: daily/exam batch chaining 모두 워크스페이스 hero 가 호스팅.
  // SolveClient 가 from='daily' + batch[] 또는 mode='exam' + batch[] 로 분기.
  const fromDaily = sp.from === "daily"
  const isExamBatch = sp.mode === "exam"
  const batchList =
    (fromDaily || isExamBatch) && sp.batch
      ? sp.batch.split(",").filter(Boolean)
      : null
  const batchIdx = sp.idx ? Number(sp.idx) : 0

  return (
    <WorkspaceClient
      item={itemPayload}
      userId={user.id}
      userEmail={user.email ?? ""}
      tier={tier}
      usage={usage}
      chunks={chunkRows}
      hasDocument={!!documentId}
      docTitle={docTitle}
      pdfSignedUrl={pdfSignedUrl}
      weakCount={weakCount}
      challengeCtx={challengeCtx}
      retryCtx={retryCtx}
      firstPatternLabel={firstPatternLabel}
      batch={batchList}
      batchIdx={Number.isFinite(batchIdx) ? batchIdx : 0}
      fromDaily={fromDaily}
    />
  )
}
