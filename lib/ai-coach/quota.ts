/**
 * AI 코치 사용량 캡 — M3.1 본격 (Postgres function 위임).
 *
 * Q1 hard cap (Free 5회) 가 lib/ai-coach 안에 inline 으로 있던 것을
 * lib/billing/quota.ts (Postgres check_ai_quota function 호출) 로 위임.
 * recordAiCall (call log insert) 는 그대로 유지.
 */

import { db } from "@/lib/db"
import { aiCoachCalls } from "@/lib/db/schema"
import {
  assertAiQuota,
  QuotaExceededError,
  type UsageStat,
} from "@/lib/billing/quota"

/** 후방 호환: 기존 라우트가 import 하던 이름 그대로. */
export class QuotaError extends Error {
  constructor(public limit: number | "unlimited", public used: number) {
    super("quota_exceeded")
    this.name = "QuotaError"
  }
}

/**
 * AI 코치 호출 직전 게이트. 통과 시 UsageStat 반환 (응답 메타용).
 * Postgres check_ai_quota function 이 truth source — Free 5회 평생,
 * Pro 30회/일 (KST 자정 reset), Pro+ 무제한.
 */
export async function assertQuota(userId: string): Promise<UsageStat> {
  try {
    return await assertAiQuota(userId)
  } catch (e) {
    if (e instanceof QuotaExceededError) {
      throw new QuotaError(e.limit, e.used)
    }
    throw e
  }
}

/**
 * AI 호출 후 ai_coach_calls 에 row insert.
 * 실패해도 본 흐름 막지 않음 (console.warn).
 */
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
