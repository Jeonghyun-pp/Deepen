// ── OpenAI API 래퍼 ──
// Claude 클라이언트와 동일한 인터페이스, OpenAI SDK 사용

import OpenAI from "openai";
import type { LLMCallOptions, LLMCallResult } from "./llm";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/**
 * OpenAI API를 호출하여 구조화된 JSON 응답을 받는다.
 */
export async function callOpenAI<T>(options: LLMCallOptions): Promise<LLMCallResult<T>> {
  const { systemPrompt, userPrompt, jsonSchema, maxTokens = 4096 } = options;

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    ...(jsonSchema
      ? {
          response_format: {
            type: "json_schema" as const,
            json_schema: {
              name: jsonSchema.name,
              schema: jsonSchema.schema,
              strict: true,
            },
          },
        }
      : {
          response_format: { type: "json_object" as const },
        }),
  });

  const message = response.choices[0]?.message;
  if (!message?.content) {
    throw new Error("OpenAI returned no content");
  }

  const parsed = JSON.parse(message.content) as T;

  return {
    data: parsed,
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
  };
}
