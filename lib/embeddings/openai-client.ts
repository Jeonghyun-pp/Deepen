/**
 * OpenAI Embeddings 래퍼 — M3.3.
 * Spec: 04-algorithms.md §4.4, 09-q3-build.md M3.3.
 *
 * 모델: text-embedding-3-large (1536 dim — text-embedding-3-large 의 매트료시카
 *       특성을 활용해 1536 차원으로 truncate. native 3072 보다 저장·조회 가벼움).
 *
 * 호출량:
 *   - 백필 1회: ~1000 노드 × 500 token ≈ 50만 token ≈ $0.065
 *   - 매시간 cron: 신규 publish 노드 (보통 0~수 개) → 무시 가능
 */
import OpenAI from "openai"
import { EMBEDDING_DIMENSIONS } from "@/lib/db/schema"

export const EMBEDDING_MODEL = "text-embedding-3-large"

let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY 미설정 — 임베딩 사용 불가")
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

export interface EmbedResult {
  vectors: number[][]
  promptTokens: number
}

/**
 * 텍스트 배열을 일괄 임베딩. OpenAI batch limit 2048 entries / 8192 tokens per
 * input. 안전하게 batch=100 단위.
 */
export async function embedTexts(inputs: string[]): Promise<EmbedResult> {
  if (inputs.length === 0) return { vectors: [], promptTokens: 0 }

  const all: number[][] = []
  let totalPromptTokens = 0

  // 100개 chunk
  const CHUNK = 100
  for (let i = 0; i < inputs.length; i += CHUNK) {
    const slice = inputs.slice(i, i + CHUNK)
    const res = await getClient().embeddings.create({
      model: EMBEDDING_MODEL,
      input: slice,
      dimensions: EMBEDDING_DIMENSIONS,
    })
    for (const d of res.data) all.push(d.embedding)
    totalPromptTokens += res.usage?.prompt_tokens ?? 0
  }
  return { vectors: all, promptTokens: totalPromptTokens }
}

/** 단일 텍스트 — 편의 wrapper. */
export async function embedText(input: string): Promise<{
  vector: number[]
  promptTokens: number
}> {
  const r = await embedTexts([input])
  return { vector: r.vectors[0]!, promptTokens: r.promptTokens }
}
