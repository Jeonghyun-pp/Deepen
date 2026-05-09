/**
 * AI 코치 사용량 캡 — Q1 단순화.
 *
 * Q1: 모든 사용자 free tier (결제 미연결). Free=평생 5회 hard cap.
 * M3.1: subscriptions 테이블 + check_ai_quota Postgres function 으로 본격
 *       (Pro 일 30회 / Pro+ 무제한).
 *
 * Spec: docs/build-spec/04-algorithms.md §9 (FREE_LIFETIME=5),
 *       03-api-contracts.md §3 (429 QUOTA_EXCEEDED).
 */

import { and, count, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiCoachCalls } from "@/lib/db/schema"

export const FREE_LIFETIME_CAP = 5

export class QuotaError extends Error {
  constructor(public limit: number, public used: number) {
    super("quota_exceeded")
    this.name = "QuotaError"
  }
}

const COUNTABLE_TYPES = ["chat", "suggest_chip"] as const

export async function getUsage(userId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(aiCoachCalls)
    .where(
      and(
        eq(aiCoachCalls.userId, userId),
        inArray(aiCoachCalls.callType, COUNTABLE_TYPES as unknown as string[]),
      ),
    )
  return Number(value)
}

export async function assertQuota(userId: string): Promise<void> {
  const used = await getUsage(userId)
  if (used >= FREE_LIFETIME_CAP) {
    throw new QuotaError(FREE_LIFETIME_CAP, used)
  }
}

export async function recordAiCall(args: {
  userId: string
  itemId?: string
  callType: "chat" | "suggest_chip" | "hint" | "classify"
  promptTokens: number
  completionTokens: number
  costUsd?: number
}): Promise<void> {
  try {
    await db.insert(aiCoachCalls).values({
      userId: args.userId,
      itemId: args.itemId ?? null,
      callType: args.callType,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      costUsd: args.costUsd ?? null,
    })
  } catch (e) {
    console.warn("[ai-coach.quota] call log 실패", e)
  }
}
