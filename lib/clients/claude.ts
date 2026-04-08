// ── Claude API 래퍼 ──
// Anthropic SDK + 프롬프트 캐싱 + structured output

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

interface ClaudeCallOptions {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
}

interface ClaudeCallResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Claude API를 호출하여 구조화된 JSON 응답을 받는다.
 * 시스템 프롬프트에 cache_control을 적용하여 프롬프트 캐싱 활용.
 */
export async function callClaude<T>(options: ClaudeCallOptions): Promise<ClaudeCallResult<T>> {
  const { systemPrompt, userPrompt, jsonSchema, maxTokens = 4096 } = options;

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: userPrompt },
    ],
    ...(jsonSchema
      ? {
          response_format: {
            type: "json_schema" as const,
            json_schema: jsonSchema,
          },
        }
      : {}),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }

  const parsed = JSON.parse(textBlock.text) as T;

  return {
    data: parsed,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
