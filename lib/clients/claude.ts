// ── Claude API 래퍼 ──
// Anthropic SDK + 프롬프트 캐싱 + structured output

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

/**
 * tool_use 강제. 응답이 정확히 하나의 tool_use 블록을 포함하도록.
 * Spec: docs/build-spec/05-llm-prompts.md (모든 LLM 호출은 가능하면 tool_use).
 */
export interface ClaudeToolCallOptions {
  systemPrompt: string;
  userPrompt: string;
  tool: {
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  };
  maxTokens?: number;
  /** 선택. 다른 모델 명시 (예: haiku for classification). */
  model?: string;
}

export interface ClaudeToolCallResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Streaming + tool_use 동시 지원.
 * Spec: 05-llm-prompts §1 (코치 chat).
 *
 * 사용자 텍스트 응답은 delta 콜백으로 토큰 단위 전달. tool_use 는 완료
 * 시점에 별도 콜백 (블록 단위 누적).
 */
export interface ClaudeStreamOptions {
  systemPrompt: string
  userPrompt: string
  tools?: Array<{
    name: string
    description: string
    input_schema: Record<string, unknown>
  }>
  maxTokens?: number
  model?: string
  onText?: (delta: string) => void
  onToolUse?: (block: { name: string; input: unknown }) => void
}

export interface ClaudeStreamResult {
  text: string
  toolUses: Array<{ name: string; input: unknown }>
  inputTokens: number
  outputTokens: number
  model: string
}

export async function streamClaude(
  options: ClaudeStreamOptions,
): Promise<ClaudeStreamResult> {
  const { systemPrompt, userPrompt, tools, maxTokens = 1024 } = options
  const model = options.model ?? DEFAULT_MODEL

  const stream = await client.messages.stream({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    ...(tools && tools.length
      ? { tools: tools as Anthropic.Tool[] }
      : {}),
    messages: [{ role: "user", content: userPrompt }],
  })

  let text = ""
  const toolUses: Array<{ name: string; input: unknown }> = []
  // tool_use input 은 partial JSON 으로 stream 됨. 종료 후 final 메시지에서 꺼냄.

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      text += event.delta.text
      options.onText?.(event.delta.text)
    }
  }

  const finalMessage = await stream.finalMessage()
  for (const block of finalMessage.content) {
    if (block.type === "tool_use") {
      const tu = { name: block.name, input: block.input }
      toolUses.push(tu)
      options.onToolUse?.(tu)
    }
  }

  return {
    text,
    toolUses,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    model,
  }
}

export async function callClaudeTool<T>(
  options: ClaudeToolCallOptions,
): Promise<ClaudeToolCallResult<T>> {
  const { systemPrompt, userPrompt, tool, maxTokens = 1024 } = options;
  const model = options.model ?? DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema as Anthropic.Tool["input_schema"],
      },
    ],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error(
      `Claude returned no tool_use block (stop_reason=${response.stop_reason})`,
    );
  }

  return {
    data: toolUseBlock.input as T,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

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
