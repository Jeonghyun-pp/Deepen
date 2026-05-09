/**
 * AI 코치 사용량 캡 — Postgres function check_ai_quota wrapper + 사용량 카운터.
 * Spec: docs/build-spec/09-q3-build.md M3.1, 02-schema §4.
 *
 * 정책:
 *   Free 평생 5회 (lifetime)
 *   Pro 일 30회 (KST 자정 reset)
 *   Pro+ 무제한
 *
 * 호출 흐름:
 *   1. AI 코치 라우트 진입 시 checkAiQuota(userId) 통과 확인.
 *   2. 통과 시 비즈니스 로직 + ai_coach_calls insert (recordAiCall, 기존).
 *   3. 실패 시 429 응답.
 */

import { and, count, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { aiCoachCalls, subscriptions } from "@/lib/db/schema"
import { TIERS, type TierKey } from "./tier"

export class QuotaExceededError extends Error {
  constructor(
    public tier: TierKey,
    public used: number,
    public limit: number | "unlimited",
  ) {
    super("quota_exceeded")
    this.name = "QuotaExceededError"
  }
}

/**
 * 활성 구독 tier (없으면 free).
 */
export async function getActiveTier(userId: string): Promise<TierKey> {
  const [row] = await db
    .select({ tier: subscriptions.tier })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
    .limit(1)
  return (row?.tier ?? "free") as TierKey
}

/**
 * Postgres function 호출 — true 면 통과.
 * function 이 없거나 실패 시 false 반환 (안전 측면).
 */
export async function checkAiQuotaSql(userId: string): Promise<boolean> {
  try {
    const rows = (await db.execute(
      sql`SELECT public.check_ai_quota(${userId}) AS ok`,
    )) as unknown as { ok: boolean }[]
    return !!rows[0]?.ok
  } catch (e) {
    console.warn("[quota] check_ai_quota function 실패", e)
    return false
  }
}

const COUNTABLE_TYPES = ["chat", "suggest_chip"] as const
const KST_OFFSET_HOURS = 9

function startOfKstDayUtc(): Date {
  // 현재 UTC 기준 KST 자정. KST = UTC+9.
  const now = new Date()
  const utcMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  )
  // KST 기준 자정 = UTC 전날 15:00
  const kstNow = new Date(now.getTime() + KST_OFFSET_HOURS * 3600_000)
  const kstYear = kstNow.getUTCFullYear()
  const kstMonth = kstNow.getUTCMonth()
  const kstDay = kstNow.getUTCDate()
  return new Date(
    Date.UTC(kstYear, kstMonth, kstDay) - KST_OFFSET_HOURS * 3600_000,
  )
}

export interface UsageStat {
  tier: TierKey
  used: number
  limit: number | "unlimited"
  resetAtIso: string | null
}

export async function getUsageStat(userId: string): Promise<UsageStat> {
  const tier = await getActiveTier(userId)
  const cap = TIERS[tier].aiCap

  if (cap.kind === "unlimited") {
    return { tier, used: 0, limit: "unlimited", resetAtIso: null }
  }

  if (cap.kind === "daily") {
    const since = startOfKstDayUtc()
    const [row] = await db
      .select({ value: count() })
      .from(aiCoachCalls)
      .where(
        and(
          eq(aiCoachCalls.userId, userId),
          gte(aiCoachCalls.createdAt, since),
          inArray(aiCoachCalls.callType, [...COUNTABLE_TYPES]),
        ),
      )
    const next = new Date(since.getTime() + 24 * 3600_000)
    return {
      tier,
      used: Number(row?.value ?? 0),
      limit: cap.value,
      resetAtIso: next.toISOString(),
    }
  }

  // lifetime (free)
  const [row] = await db
    .select({ value: count() })
    .from(aiCoachCalls)
    .where(
      and(
        eq(aiCoachCalls.userId, userId),
        inArray(aiCoachCalls.callType, [...COUNTABLE_TYPES]),
      ),
    )
  return {
    tier,
    used: Number(row?.value ?? 0),
    limit: cap.value,
    resetAtIso: null,
  }
}

/**
 * Quota 게이트 — 통과시 void, 실패시 throw.
 * Postgres function 이 truth source. UsageStat 은 응답 메타용.
 */
export async function assertAiQuota(userId: string): Promise<UsageStat> {
  const ok = await checkAiQuotaSql(userId)
  const stat = await getUsageStat(userId)
  if (!ok) {
    throw new QuotaExceededError(stat.tier, stat.used, stat.limit)
  }
  return stat
}
