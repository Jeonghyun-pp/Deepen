/**
 * POST /api/attempts/classify-reasons — 비동기 reasonTag AI 분류.
 * Spec: docs/build-spec/08-q2-build.md M2.4.
 *
 * 흐름 (cron worker 없이 클라가 직접 follow-up):
 *   1. 클라가 /api/attempts 응답 후 오답이면 본 라우트 호출
 *   2. 서버가 itemId·attemptTimestamp 로 result_history 마지막 row 식별
 *   3. Haiku classify → confidence ≥ 0.5 면 룰 + AI 태그 merge → DB 갱신
 *   4. 응답에 mergedTags 반환
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  nodes,
  userItemHistory,
  type AttemptResult,
} from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  ClassifyReasonsRequest,
  type ClassifyReasonsResponse,
} from "@/lib/api/schemas/classify-reasons"
import {
  classifyWrongReasons,
  mergeReasonTags,
} from "@/lib/grading/reason-tags"
import { recordAiCall } from "@/lib/ai-coach/quota"
import { features } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/attempts/classify-reasons",
  async (request, { user }) => {
    if (!features.aiCoach) {
      return Response.json(
        { error: "llm_unavailable", reason: "ANTHROPIC_API_KEY 미설정" },
        { status: 503 },
      )
    }

    let body: ReturnType<typeof ClassifyReasonsRequest.parse>
    try {
      body = ClassifyReasonsRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // Item meta
    const [item] = await db
      .select({
        id: nodes.id,
        label: nodes.label,
        itemAnswer: nodes.itemAnswer,
        itemSolution: nodes.itemSolution,
      })
      .from(nodes)
      .where(and(eq(nodes.id, body.itemId), eq(nodes.type, "item")))
      .limit(1)
    if (!item) return apiError.notFound("item_not_found")

    // user_item_history row
    const [hist] = await db
      .select()
      .from(userItemHistory)
      .where(
        and(
          eq(userItemHistory.userId, user.id),
          eq(userItemHistory.itemId, body.itemId),
        ),
      )
      .limit(1)
    if (!hist) return apiError.notFound("history_not_found")

    const history = hist.resultHistory as AttemptResult[]
    const idx = history.findIndex((r) => r.timestamp === body.attemptTimestamp)
    if (idx < 0) return apiError.notFound("attempt_not_found")
    const target = history[idx]

    // wrong 만 분류 (spec)
    if (target.label !== "wrong") {
      const response: ClassifyReasonsResponse = {
        tags: [],
        confidence: 0,
        mergedTags: target.reasonTags,
      }
      return Response.json(response, { status: 200 })
    }

    // Haiku 분류
    const result = await classifyWrongReasons({
      itemLabel: item.label,
      itemSolution: item.itemSolution,
      correctAnswer: item.itemAnswer ?? "",
      selectedAnswer: "_unknown_", // attempts 응답에 selectedAnswer 안 저장 — 향후 lock
      ocrSteps: body.ocrSteps as never,
      signals: {
        timeZ: target.signals.timeZ,
        hintsUsed: target.signals.hintsUsed,
      },
    })

    // 토큰 기록
    void recordAiCall({
      userId: user.id,
      itemId: body.itemId,
      callType: "classify",
      promptTokens: result.inputTokens,
      completionTokens: result.outputTokens,
    })

    // merge
    const merged = mergeReasonTags(target.reasonTags, result.tags, result.confidence)

    // DB 갱신 — result_history 의 idx 번째 row reasonTags 만 변경
    if (merged.length !== target.reasonTags.length) {
      const updated = [...history]
      updated[idx] = { ...target, reasonTags: merged }
      await db
        .update(userItemHistory)
        .set({
          resultHistory: updated,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userItemHistory.userId, user.id),
            eq(userItemHistory.itemId, body.itemId),
          ),
        )
    }

    const response: ClassifyReasonsResponse = {
      tags: result.tags,
      confidence: result.confidence,
      mergedTags: merged,
    }
    return Response.json(response, { status: 200 })
  },
)
