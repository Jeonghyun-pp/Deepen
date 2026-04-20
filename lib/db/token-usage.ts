import { db } from "@/lib/db"
import { tokenUsage } from "@/lib/db/schema"

// gpt-4o-mini 기준 단가 (2026-04 기준, $/1M tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
}

export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const key = Object.keys(PRICING).find((k) => model.startsWith(k))
  if (!key) return 0
  const p = PRICING[key]
  return (promptTokens * p.input + completionTokens * p.output) / 1_000_000
}

export interface RecordUsageArgs {
  userId: string
  source: "agent" | "extract_nodes" | string
  model: string
  promptTokens: number
  completionTokens: number
  meta?: Record<string, unknown>
}

/**
 * 토큰 사용량 기록. 실패해도 본 기능을 막지 않는다 (console.warn only).
 */
export async function recordTokenUsage(args: RecordUsageArgs): Promise<void> {
  try {
    const total = args.promptTokens + args.completionTokens
    const cost = estimateCostUsd(
      args.model,
      args.promptTokens,
      args.completionTokens,
    )
    await db.insert(tokenUsage).values({
      userId: args.userId,
      source: args.source,
      model: args.model,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: total,
      costUsd: cost,
      meta: args.meta ?? null,
    })
  } catch (e) {
    console.warn("[recordTokenUsage] failed", e)
  }
}
