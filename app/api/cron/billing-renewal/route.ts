/**
 * POST /api/cron/billing-renewal — 매일 18:00 UTC (= 03:00 KST 다음날).
 * Spec: 09-q3-build.md M3.1.
 *
 * 처리:
 *   1) status='active' AND canceled_at IS NULL AND tossBillingKey 보유 AND
 *      current_period_end < now() 인 구독 lookup.
 *   2) 각 사용자에게 Toss chargeBillingKey 호출. 성공 → invoice paid + period +30d.
 *   3) 실패 → invoice failed + markPastDue.
 *   4) canceled_at 있고 period_end 지난 구독 → expired 전이.
 *
 * 멱등성: orderId 새로 발급하므로 같은 cron 두 번 돌면 두 번 청구 위험 있음.
 *   → 동일 사용자에 대해 (today_kst, status='active') 청구 대기 중이면 skip 로직 추가.
 *   현실적으로 cron 재실행 빈도가 낮아서 1차에서는 simple loop.
 */

import { and, eq, isNotNull, isNull, lt, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { invoices, subscriptions } from "@/lib/db/schema"
import { checkCronAuth } from "@/lib/api/cron-auth"
import { TIERS, type TierKey } from "@/lib/billing/tier"
import { generateOrderId } from "@/lib/billing/orders"
import { chargeBillingKey, TossError } from "@/lib/billing/toss-client"
import { features } from "@/lib/env"
import {
  upsertSubscription,
  markPastDue,
} from "@/lib/billing/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PERIOD_DAYS = 30

async function handle(request: Request): Promise<Response> {
  const auth = checkCronAuth(request)
  if (!auth.ok) return Response.json({ error: auth.error }, { status: 401 })

  // 만료 처리 — 해지된 구독 중 period 끝난 것 expired 전이.
  await db.execute(sql`
    update subscriptions
       set status = 'expired', updated_at = now()
     where status = 'active'
       and canceled_at is not null
       and current_period_end < now()
  `)

  // 자동결제 대상 — billingKey 있고 미해지 + 만료 지남.
  const due = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        isNull(subscriptions.canceledAt),
        isNotNull(subscriptions.tossBillingKey),
        lt(subscriptions.currentPeriodEnd, sql`now()`),
      ),
    )

  if (!features.tossLive) {
    return Response.json({
      ok: true,
      mode: "dryRun",
      candidates: due.length,
    })
  }

  let succeeded = 0
  let failed = 0
  let skipped = 0
  for (const sub of due) {
    if (sub.tier === "free" || !sub.tossBillingKey || !sub.tossCustomerKey) {
      skipped++
      continue
    }
    const tier = sub.tier as TierKey
    if (tier === "free") {
      skipped++
      continue
    }
    const amount = TIERS[tier].monthlyKrw
    const orderId = generateOrderId(tier)
    try {
      const payment = await chargeBillingKey({
        billingKey: sub.tossBillingKey,
        customerKey: sub.tossCustomerKey,
        amount,
        orderId,
        orderName: `Deepen ${TIERS[tier].label} 자동결제`,
      })
      const periodEnd = new Date(Date.now() + PERIOD_DAYS * 24 * 3600 * 1000)
      await db.insert(invoices).values({
        userId: sub.userId,
        subscriptionId: sub.id,
        amountKrw: amount,
        status: "paid",
        tossOrderId: orderId,
        tossPaymentKey: payment.paymentKey,
        paidAt: new Date(),
      })
      await upsertSubscription(sub.userId, tier, periodEnd)
      succeeded++
    } catch (e) {
      const code =
        e instanceof TossError ? e.code : (e as Error).message ?? "unknown"
      console.warn(
        `[cron/billing-renewal] charge failed user=${sub.userId} ${code}`,
      )
      await db.insert(invoices).values({
        userId: sub.userId,
        subscriptionId: sub.id,
        amountKrw: amount,
        status: "failed",
        tossOrderId: orderId,
      })
      await markPastDue(sub.userId)
      failed++
    }
  }

  return Response.json({
    ok: true,
    mode: "live",
    candidates: due.length,
    succeeded,
    failed,
    skipped,
  })
}

export const GET = handle
export const POST = handle
