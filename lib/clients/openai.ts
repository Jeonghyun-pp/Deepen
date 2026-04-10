// ── OpenAI API 래퍼 ──
// Claude 클라이언트와 동일한 인터페이스, OpenAI SDK 사용

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import type { LLMCallOptions, LLMCallResult } from "./llm";
import type { Message, ToolCall } from "../agent/types";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _client;
}

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

/**
 * OpenAI API를 호출하여 구조화된 JSON 응답을 받는다.
 */
export async function callOpenAI<T>(options: LLMCallOptions): Promise<LLMCallResult<T>> {
  const { systemPrompt, userPrompt, jsonSchema, maxTokens = 4096 } = options;

  const response = await getClient().chat.completions.create({
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

/**
 * OpenAI Chat Completions를 스트리밍으로 호출한다.
 * 텍스트 delta를 enqueue하는 ReadableStream을 반환.
 */
export async function streamOpenAIChat(options: {
  systemPrompt: string;
  messages: Message[];
  maxTokens?: number;
}): Promise<ReadableStream<string>> {
  const stream = await getClient().chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 2048,
    stream: true,
    messages: [
      { role: "system", content: options.systemPrompt },
      ...options.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(delta);
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// ============================================================
// Tool-use streaming
// ============================================================

export type ToolUseStreamEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "done" };

/**
 * Tool use를 지원하는 OpenAI chat.completions 호출.
 * text_delta를 스트리밍하다가 finish_reason === "tool_calls"를 만나면
 * tool_calls 이벤트를 한 번 yield하고 종료.
 * 호출자는 이후 tool 실행 결과를 messages에 추가하고 이 함수를 재호출해야 한다.
 */
export async function* callOpenAIWithTools(options: {
  messages: ChatCompletionMessageParam[];
  tools: ChatCompletionTool[];
  maxTokens?: number;
}): AsyncGenerator<ToolUseStreamEvent> {
  const stream = await getClient().chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 2048,
    stream: true,
    messages: options.messages,
    tools: options.tools,
    tool_choice: "auto",
  });

  // index → 누적
  const toolCallsAccum: Record<
    number,
    { id: string; name: string; args: string }
  > = {};

  for await (const chunk of stream) {
    const choice = chunk.choices[0];
    if (!choice) continue;
    const delta = choice.delta;

    if (delta?.content) {
      yield { type: "text_delta", delta: delta.content };
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index ?? 0;
        if (!toolCallsAccum[idx]) {
          toolCallsAccum[idx] = { id: "", name: "", args: "" };
        }
        if (tc.id) toolCallsAccum[idx].id = tc.id;
        if (tc.function?.name) toolCallsAccum[idx].name = tc.function.name;
        if (tc.function?.arguments)
          toolCallsAccum[idx].args += tc.function.arguments;
      }
    }

    if (choice.finish_reason === "tool_calls") {
      const calls: ToolCall[] = Object.values(toolCallsAccum).map((tc) => {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = tc.args ? JSON.parse(tc.args) : {};
        } catch {
          parsedArgs = {};
        }
        return { id: tc.id, name: tc.name, args: parsedArgs };
      });
      yield { type: "tool_calls", calls };
      return;
    }

    if (choice.finish_reason === "stop") {
      yield { type: "done" };
      return;
    }
  }
  yield { type: "done" };
}
