/**
 * subscription upsert · transition helpers — confirm/webhook/cron 공용.
 *
 * subscriptions 테이블은 partial unique (status='active') 라 단순 onConflict 가
 * 적용 안 됨. 명시적 lookup → update | insert 분기 필수.
 */

import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"
import type { TierKey } from "./tier"

export type ActiveTier = Exclude<TierKey, "free">

/**
 * (user_id, status='active') unique index 를 의식해서:
 *   1) 기존 active sub 있으면 tier/period 갱신.
 *   2) 없으면 insert.
 */
export async function upsertSubscription(
  userId: string,
  tier: ActiveTier,
  currentPeriodEnd: Date,
): Promise<void> {
  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
    .limit(1)

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        tier,
        canceledAt: null,
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id))
    return
  }

  await db.insert(subscriptions).values({
    userId,
    tier,
    status: "active",
    tossCustomerKey: userId,
    currentPeriodEnd,
  })
}

/** webhook BILLING_KEY_DELETED 또는 사용자 cancel 처리. */
export async function markCanceled(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({ canceledAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
}

/** webhook ABORTED/EXPIRED 처리 — 다음 cron 에서 재시도 또는 expired 전이. */
export async function markPastDue(userId: string): Promise<void> {
  await db
    .update(subscriptions)
    .set({ status: "past_due", updatedAt: new Date() })
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")),
    )
}

/** cron 또는 manual — current_period_end 도달 + canceled 인 구독 만료. */
export async function markExpiredIfDue(userId: string): Promise<void> {
  await db.execute(sql`
    update subscriptions
       set status = 'expired', updated_at = now()
     where user_id = ${userId}
       and status = 'active'
       and canceled_at is not null
       and current_period_end < now()
  `)
}
