/**
 * POST /api/ai-coach/chat — AI SDK v6 UI message stream.
 * Spec: docs/build-spec/03-api-contracts.md §3, 05-llm-prompts §1.
 *
 * v2 마이그레이션 (Phase 2):
 *   - 자체 SSE (event=token/card/highlight/similar/done) → AI SDK UIMessageStream
 *   - streamClaude (Anthropic SDK 직접) → streamText + @ai-sdk/anthropic
 *   - tool_use 3종은 tool({execute}) 안에서 writer.write(data-part) 로 전달
 *   - 클라(useChat) 는 onData 로 data part 받아 store/메시지 part 에 반영
 *
 * Q1 정책 보존:
 *   - features.aiCoach 없으면 503
 *   - assertQuota 가드 (Free 5회 평생, Pro 30/일)
 *   - recordAiCall (성공 호출만) onFinish 콜백 안에서
 *   - tool 3종: insert_recap_card / highlight_graph_nodes / find_similar_items
 */

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { withAuth, apiError } from "@/lib/api/handler"
import { CoachChatRequest } from "@/lib/api/schemas/ai-coach"
import { buildCoachContext } from "@/lib/ai-coach/build-context"
import { buildSystemPrompt } from "@/lib/ai-coach/system-prompt"
import { assertQuota, recordAiCall, QuotaError } from "@/lib/ai-coach/quota"
import { buildRecapCard } from "@/lib/recap/build-card"
import { env, features } from "@/lib/env"
import type { CoachUIMessage } from "@/lib/ai-coach/coach-message"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/ai-coach/chat",
  async (request, { user }) => {
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

    let contextXml: string
    try {
      const ctx = await buildCoachContext({
        userId: user.id,
        itemId: body.itemId,
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
    const modelMessages = await convertToModelMessages(
      body.messages as UIMessage[],
    )

    const stream = createUIMessageStream<CoachUIMessage>({
      execute: async ({ writer }) => {
        const result = streamText({
          model: anthropic(env.CLAUDE_MODEL),
          // cache_control 적용 위해 SystemModelMessage 를 messages 앞에 prepend
          // (v5 의 `system?: string` 은 providerOptions 미지원)
          allowSystemInMessages: true,
          messages: [
            {
              role: "system",
              content: `${systemPrompt}\n\n${contextXml}`,
              providerOptions: {
                anthropic: { cacheControl: { type: "ephemeral" } },
              },
            },
            ...modelMessages,
          ],
          maxOutputTokens: 1024,
          // 도구 실행 후 LLM 이 한 번 더 회전하지 않도록 (UI-only effect)
          stopWhen: stepCountIs(2),
          tools: {
            insert_recap_card: tool({
              description:
                "학생이 현재 문제를 풀려면 prereq 결손이 있어 보일 때 호출. patternId 는 결손 의심 prereq Pattern.",
              inputSchema: z.object({
                patternId: z.string().describe("결손 의심 Pattern UUID"),
                reason: z.string().describe("왜 막혔는지 한 줄"),
              }),
              execute: async ({ patternId, reason }) => {
                try {
                  const card = await buildRecapCard({
                    userId: user.id,
                    patternId,
                    triggerItemId: body.itemId,
                    userTheta: 0.5,
                  })
                  writer.write({
                    type: "data-card",
                    data: { card, reason },
                  })
                  return { ok: true }
                } catch (cardErr) {
                  console.warn("[ai-coach] insert_recap_card 실패", cardErr)
                  writer.write({
                    type: "data-card-error",
                    data: { patternId, reason },
                  })
                  return { ok: false, error: "build_failed" }
                }
              },
            }),
            highlight_graph_nodes: tool({
              description:
                "현재 답변에서 언급한 Pattern 들을 그래프에서 강조. 학생이 답변과 그래프를 시각 연결할 수 있게.",
              inputSchema: z.object({
                nodeIds: z
                  .array(z.string())
                  .describe("강조할 Pattern UUID 목록"),
              }),
              execute: async ({ nodeIds }) => {
                writer.write({
                  type: "data-highlight",
                  data: { nodeIds },
                  transient: true,
                })
                return { ok: true }
              },
            }),
            find_similar_items: tool({
              description:
                "학생이 'variant' 칩을 누르거나 비슷한 문제 요청 시. 같은 Pattern 의 다른 Item 추천. Q1 stub.",
              inputSchema: z.object({
                patternId: z.string(),
                count: z.number().int().optional(),
              }),
              execute: async ({ patternId, count }) => {
                writer.write({
                  type: "data-similar",
                  data: {
                    patternId,
                    count: count ?? 3,
                    items: [],
                  },
                  transient: true,
                })
                return { items: [] }
              },
            }),
          },
          onFinish: async ({ usage }) => {
            try {
              await recordAiCall({
                userId: user.id,
                itemId: body.itemId,
                callType: body.chipKey ? "suggest_chip" : "chat",
                promptTokens: usage.inputTokens ?? 0,
                completionTokens: usage.outputTokens ?? 0,
              })
            } catch (e) {
              console.warn("[ai-coach.chat] recordAiCall 실패", e)
            }
          },
        })
        writer.merge(result.toUIMessageStream())
      },
      onError: (err) => {
        console.error("[ai-coach.chat] stream error", err)
        return (err as Error)?.message ?? "internal_error"
      },
    })

    return createUIMessageStreamResponse({ stream })
  },
)
