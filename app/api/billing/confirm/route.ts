/**
 * POST /api/billing/confirm — Toss 표준 결제창 완료 후 server-side finalize.
 * Spec: 09-q3-build.md M3.1.
 *
 * 클라(success page)가 paymentKey/orderId/amount 를 받아 호출. 서버는:
 *   1) pending invoice (toss_order_id 로 lookup) 검증 — userId 일치 + amount 일치.
 *   2) Toss API confirmPayment 호출 — 위변조 방지 (Toss 가 amount 재검증).
 *   3) 성공 시 invoice → 'paid', subscription tier=pro, period_end=+30d upsert.
 *   4) 실패 시 invoice → 'failed', past_due 전이 없이 단순 실패.
 *
 * Idempotency: tossPaymentKey 가 invoices 에 이미 있으면 ok=true 즉시 반환.
 *   webhook 이 먼저 오면 confirm 은 no-op, 반대도 마찬가지.
 */

import { eq, and, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { invoices, subscriptions } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  ConfirmRequest,
  type ConfirmResponse,
} from "@/lib/api/schemas/billing"
import { parseOrderId } from "@/lib/billing/orders"
import { confirmPayment, TossError } from "@/lib/billing/toss-client"
import { upsertSubscription } from "@/lib/billing/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PERIOD_DAYS = 30

export const POST = withAuth(
  "POST /api/billing/confirm",
  async (request, { user }) => {
    let body: ReturnType<typeof ConfirmRequest.parse>
    try {
      body = ConfirmRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // pending invoice 확인.
    const [inv] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.tossOrderId, body.orderId),
          eq(invoices.userId, user.id),
        ),
      )
      .limit(1)
    if (!inv) return apiError.notFound("invoice_not_found")
    if (inv.amountKrw !== body.amount) {
      return apiError.badRequest("amount_mismatch")
    }

    // 이미 paid 라면 webhook 이 먼저 처리 — idempotent.
    if (inv.status === "paid") {
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
        .limit(1)
      const response: ConfirmResponse = {
        ok: true,
        tier: sub?.tier ?? null,
        currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
        error: null,
      }
      return Response.json(response)
    }

    // Toss API 호출.
    try {
      await confirmPayment({
        paymentKey: body.paymentKey,
        orderId: body.orderId,
        amount: body.amount,
      })
    } catch (e) {
      const code = e instanceof TossError ? e.code : "toss_failed"
      // 실패 invoice 마킹 (이미 다른 흐름에서 mark 됐을 수 있음).
      await db
        .update(invoices)
        .set({ status: "failed", tossPaymentKey: body.paymentKey })
        .where(eq(invoices.id, inv.id))
      const response: ConfirmResponse = {
        ok: false,
        tier: null,
        currentPeriodEnd: null,
        error: code,
      }
      return Response.json(response, { status: 200 })
    }

    const parsed = parseOrderId(body.orderId)
    const tier = parsed?.tier ?? "pro"

    // invoice → paid + subscription upsert (period 연장).
    await db
      .update(invoices)
      .set({
        status: "paid",
        tossPaymentKey: body.paymentKey,
        paidAt: sql`now()`,
      })
      .where(eq(invoices.id, inv.id))

    const periodEnd = new Date(Date.now() + PERIOD_DAYS * 24 * 3600 * 1000)
    await upsertSubscription(user.id, tier, periodEnd)

    const response: ConfirmResponse = {
      ok: true,
      tier,
      currentPeriodEnd: periodEnd.toISOString(),
      error: null,
    }
    return Response.json(response)
  },
)
