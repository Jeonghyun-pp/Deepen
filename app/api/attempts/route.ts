/**
 * POST /api/attempts — 풀이 제출 (3분기 채점 + Elo 갱신).
 *
 * Spec:
 *   - 03-api-contracts.md §2 (request/response 계약)
 *   - 04-algorithms.md §1·§2 (채점·Elo 수식)
 *   - 02-schema.md §2·§3 (user_item_history, pattern_state)
 *
 * Q1 단순화:
 *   - mode = 'practice' 만 의미 있음 (다른 모드는 검증만 통과시킴, M2.5+ 본격).
 *   - diagnosis 는 stub (recapNeeded=false). 본격 BN은 M1.4 + M2.3.
 *   - nextAction 은 stub (type='next_item'). 본격 정책은 M1.6 + M2.5+.
 *   - reasonTags 는 룰 기반 3종만. AI 분류 5종은 M2.4 비동기.
 */

import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  nodes,
  edges,
  userItemHistory,
  patternState,
  type AttemptResult as PersistedAttempt,
} from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  SubmitAttemptRequest,
  type SubmitAttemptResponse,
  type MasteryUpdate,
} from "@/lib/api/schemas/attempts"
import {
  classifyAttempt,
  ruleBaseTags,
  timeZ as computeTimeZ,
  type AttemptSignals,
} from "@/lib/grading/score"
import { updateElo } from "@/lib/grading/elo"
import { getItemTimeStat } from "@/lib/grading/time-stats"
import { diagnoseQ1 } from "@/lib/recap/diagnose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEFAULT_BETA = 0.5
const DEFAULT_THETA = 0.5

export const POST = withAuth("POST /api/attempts", async (request, { user }) => {
  let body: SubmitAttemptRequest
  try {
    body = SubmitAttemptRequest.parse(await request.json())
  } catch (e) {
    return apiError.badRequest("validation_failed")
  }

  // 1) Item 조회 — type='item' + status='published'
  const [item] = await db
    .select({
      id: nodes.id,
      itemAnswer: nodes.itemAnswer,
      itemSolution: nodes.itemSolution,
      itemDifficulty: nodes.itemDifficulty,
    })
    .from(nodes)
    .where(
      and(
        eq(nodes.id, body.itemId),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
      ),
    )
    .limit(1)

  if (!item) return apiError.notFound("item_not_found")
  if (!item.itemAnswer) return apiError.badRequest("item_missing_answer")

  // 2) 정답 비교 — 객관식 trim 비교. 주관식/OCR은 M2.2.
  const correct = body.selectedAnswer.trim() === item.itemAnswer.trim()

  // 3) cohort 평균/표준편차 (또는 difficulty fallback) → timeZ
  const itemTimeStat = await getItemTimeStat(body.itemId)
  const timeZ = computeTimeZ(body.timeMs, itemTimeStat)

  // 4) 3분기 분류
  const signals: AttemptSignals = {
    correct,
    timeMs: body.timeMs,
    timeZ,
    hintsUsed: body.hintsUsed,
    aiQuestions: body.aiQuestions,
    selfConfidence: body.selfConfidence,
  }
  const { label, confidenceScore } = classifyAttempt(signals)

  // 5) reason_tags 룰 즉시 (M1.4 에서 BN 결과 합류)
  const reasonTags = ruleBaseTags({ signals, bnMaxP: 0 })

  // 6) result_history 에 append + seen_count++
  const persisted: PersistedAttempt = {
    label,
    confidenceScore,
    reasonTags,
    signals: {
      correct,
      timeMs: body.timeMs,
      timeZ,
      hintsUsed: body.hintsUsed,
      aiQuestions: body.aiQuestions,
      selfConfidence: body.selfConfidence,
    },
    timestamp: new Date().toISOString(),
  }

  await db
    .insert(userItemHistory)
    .values({
      userId: user.id,
      itemId: body.itemId,
      seenCount: 1,
      lastSolvedAt: new Date(),
      resultHistory: [persisted],
    })
    .onConflictDoUpdate({
      target: [userItemHistory.userId, userItemHistory.itemId],
      set: {
        seenCount: sql`${userItemHistory.seenCount} + 1`,
        lastSolvedAt: new Date(),
        resultHistory: sql`${userItemHistory.resultHistory} || ${sql.raw(
          `'${JSON.stringify([persisted]).replace(/'/g, "''")}'::jsonb`,
        )}`,
        updatedAt: new Date(),
      },
    })

  // 7) Item 의 모든 Pattern 에 Elo 갱신.
  //    edge: Pattern --contains--> Item. Pattern 들의 sourceNodeId 수집.
  const patternRows = await db
    .select({ patternId: edges.sourceNodeId })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        eq(edges.targetNodeId, body.itemId),
        eq(edges.type, "contains"),
        eq(nodes.type, "pattern"),
      ),
    )

  const masteryUpdates: MasteryUpdate[] = []
  for (const { patternId } of patternRows) {
    const [existing] = await db
      .select()
      .from(patternState)
      .where(
        and(
          eq(patternState.userId, user.id),
          eq(patternState.patternId, patternId),
        ),
      )
      .limit(1)

    const before = {
      theta: existing?.theta ?? DEFAULT_THETA,
      beta: existing?.beta ?? item.itemDifficulty ?? DEFAULT_BETA,
    }

    const result = updateElo({
      thetaUser: before.theta,
      betaPattern: before.beta,
      label,
    })

    await db
      .insert(patternState)
      .values({
        userId: user.id,
        patternId,
        theta: result.thetaUser,
        beta: result.betaPattern,
        attemptCount: 1,
      })
      .onConflictDoUpdate({
        target: [patternState.userId, patternState.patternId],
        set: {
          theta: result.thetaUser,
          beta: result.betaPattern,
          attemptCount: sql`${patternState.attemptCount} + 1`,
          lastUpdatedAt: new Date(),
        },
      })

    masteryUpdates.push({
      patternId,
      thetaBefore: before.theta,
      thetaAfter: result.thetaUser,
      betaBefore: before.beta,
      betaAfter: result.betaPattern,
    })
  }

  // 8) diagnosis (M1.4 — Q1 단순 진단). 실전 모드는 recap 차단 (06-state-machines).
  let diagnosis: SubmitAttemptResponse["diagnosis"] = {
    recapNeeded: false,
    candidatePrereq: [],
  }
  if (body.mode === "practice" && (label === "wrong" || label === "unsure")) {
    const d = await diagnoseQ1({
      userId: user.id,
      currentItemId: body.itemId,
    })
    diagnosis = {
      recapNeeded: d.recapNeeded,
      candidatePrereq: d.candidates.map((c) => ({
        patternId: c.patternId,
        patternLabel: c.patternLabel,
        grade: c.grade,
        deficitProb: c.deficitProb,
      })),
    }
  }

  // 9) nextAction — recap 필요면 'recap', 아니면 'next_item' (M1.6 정책 본격).
  const nextAction = diagnosis.recapNeeded
    ? ({
        type: "recap" as const,
        payload: { candidates: diagnosis.candidatePrereq },
      })
    : ({ type: "next_item" as const })

  const response: SubmitAttemptResponse = {
    attemptResult: {
      label,
      confidenceScore,
      timeZ,
      reasonTags,
      correctAnswer: item.itemAnswer ?? "",
      explanation: item.itemSolution ?? "",
    },
    masteryUpdate: masteryUpdates,
    diagnosis,
    nextAction,
  }

  return Response.json(response, { status: 200 })
})
