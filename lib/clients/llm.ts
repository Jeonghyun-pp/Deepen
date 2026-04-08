// ── LLM 공통 인터페이스 + 프로바이더 선택 ──
// 환경변수 LLM_PROVIDER로 "anthropic" | "openai" 선택 (기본: anthropic)

import { callClaude } from "./claude";
import { callOpenAI } from "./openai";

export interface LLMCallOptions {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  maxTokens?: number;
}

export interface LLMCallResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
}

export type LLMProvider = "anthropic" | "openai";

function getProvider(): LLMProvider {
  const env = process.env.LLM_PROVIDER?.toLowerCase();
  if (env === "openai") return "openai";
  return "anthropic";
}

/**
 * 설정된 LLM 프로바이더로 호출한다.
 * LLM_PROVIDER=openai → OpenAI, 그 외 → Anthropic Claude
 */
export async function callLLM<T>(options: LLMCallOptions): Promise<LLMCallResult<T>> {
  const provider = getProvider();

  if (provider === "openai") {
    return callOpenAI<T>(options);
  }

  return callClaude<T>(options);
}
