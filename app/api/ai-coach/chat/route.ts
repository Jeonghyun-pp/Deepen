/**
 * POST /api/ai-coach/chat — SSE streaming.
 * Spec: docs/build-spec/03-api-contracts.md §3, 05-llm-prompts §1.
 *
 * Q1:
 *   - 모든 사용자 free tier hard cap 5회 (M3.1 까지).
 *   - 5칩 시스템 프롬프트 tweak 적용.
 *   - tool_use 3종:
 *       insert_recap_card → 서버가 즉시 buildRecapCard 후 SSE event=card 전송
 *       highlight_graph_nodes → SSE event=highlight 전달만
 *       find_similar_items → Q1 stub (event=similar with empty items, M1.6 추천 엔진 도입 시 활성)
 *   - SSE event=done 시 ai_coach_calls insert.
 */

import { withAuth, apiError } from "@/lib/api/handler"
import { CoachChatRequest } from "@/lib/api/schemas/ai-coach"
import { buildCoachContext } from "@/lib/ai-coach/build-context"
import { buildSystemPrompt } from "@/lib/ai-coach/system-prompt"
import { COACH_TOOLS } from "@/lib/ai-coach/tools"
import { assertQuota, recordAiCall, QuotaError } from "@/lib/ai-coach/quota"
import { streamClaude } from "@/lib/clients/claude"
import { buildRecapCard } from "@/lib/recap/build-card"
import { features } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface InsertRecapCardArgs {
  patternId: string
  reason: string
}
interface HighlightArgs {
  nodeIds: string[]
}
interface FindSimilarArgs {
  patternId: string
  count?: number
}

const sseEvent = (event: string, data: unknown): string =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`

export const POST = withAuth("POST /api/ai-coach/chat", async (request, { user }) => {
  // 환경 변수 누락 시 graceful 503
  if (!features.aiCoach) {
    return Response.json(
      { error: "ai_coach_unavailable", reason: "ANTHROPIC_API_KEY 미설정" },
      { status: 503 },
    )
  }

  let body: ReturnType<typeof CoachChatRequest.parse>
  try {
    body = CoachChatRequest.parse(await request.json())
  } catch {
    return apiError.badRequest("validation_failed")
  }

  // Quota 사전 검증
  try {
    await assertQuota(user.id)
  } catch (e) {
    if (e instanceof QuotaError) {
      return Response.json(
        { error: "quota_exceeded", limit: e.limit, used: e.used },
        { status: 429 },
      )
    }
    throw e
  }

  const itemId = body.itemId
  if (!itemId) {
    return apiError.badRequest("item_id_required")
  }

  // 컨텍스트 빌드 (item·patterns·prereq·history)
  let contextXml: string
  try {
    const ctx = await buildCoachContext({
      userId: user.id,
      itemId,
      chipKey: body.chipKey,
    })
    contextXml = ctx.contextXml
  } catch (e) {
    if ((e as Error).message === "item_not_found") {
      return apiError.notFound("item_not_found")
    }
    throw e
  }

  const systemPrompt = buildSystemPrompt(body.chipKey)
  const userPrompt = `${contextXml}\n\n학생 메시지: ${body.message}`

  // SSE ReadableStream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start: async (controller) => {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)))
        } catch {
          /* stream closed */
        }
      }

      try {
        const result = await streamClaude({
          systemPrompt,
          userPrompt,
          tools: [...COACH_TOOLS],
          maxTokens: 1024,
          onText: (delta) => send("token", { delta }),
        })

        // tool_use 처리 (응답 완료 후)
        for (const tu of result.toolUses) {
          if (tu.name === "insert_recap_card") {
            const args = tu.input as InsertRecapCardArgs
            try {
              const card = await buildRecapCard({
                userId: user.id,
                patternId: args.patternId,
                triggerItemId: itemId,
                userTheta: 0.5, // Q1 stub: 정확한 theta 는 클라가 재호출 X (이미 컨텍스트에 포함)
              })
              send("card", { card, reason: args.reason })
            } catch (cardErr) {
              console.warn("[ai-coach] insert_recap_card 실패", cardErr)
              send("card_error", {
                patternId: args.patternId,
                reason: args.reason,
              })
            }
          } else if (tu.name === "highlight_graph_nodes") {
            const args = tu.input as HighlightArgs
            send("highlight", { nodeIds: args.nodeIds })
          } else if (tu.name === "find_similar_items") {
            const args = tu.input as FindSimilarArgs
            // Q1 stub — M1.6 추천 엔진에서 실제 fetch
            send("similar", {
              patternId: args.patternId,
              count: args.count ?? 3,
              items: [],
            })
          }
        }

        // 사용량 기록 (성공 호출만)
        await recordAiCall({
          userId: user.id,
          itemId,
          callType: body.chipKey ? "suggest_chip" : "chat",
          promptTokens: result.inputTokens,
          completionTokens: result.outputTokens,
        })

        send("done", {
          tokens: {
            input: result.inputTokens,
            output: result.outputTokens,
          },
        })
      } catch (err) {
        console.error("[ai-coach.chat] stream error", err)
        send("error", { message: (err as Error).message ?? "internal_error" })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
})
