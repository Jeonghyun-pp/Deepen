/**
 * POST /api/billing/webhook — Toss webhook 진입점.
 * Spec: 09-q3-build.md M3.1 §결제 webhook 처리.
 *
 * 인증: Toss-Signature 헤더 (HMAC-SHA256(rawBody, TOSS_WEBHOOK_SECRET)).
 *   미설정 시 dev=통과, prod=401.
 *
 * event 처리:
 *   PAYMENT_STATUS_CHANGED.status=DONE   → invoice paid + subscription period 연장
 *   PAYMENT_STATUS_CHANGED.status=ABORTED→ invoice failed + subscription past_due
 *   PAYMENT_STATUS_CHANGED.status=EXPIRED→ 동일
 *   PAYMENT_STATUS_CHANGED.status=CANCELED → invoice refunded
 *   BILLING_KEY_DELETED                  → subscription canceled
 *
 * Idempotency: invoices.toss_payment_key UNIQUE — 두 번째 처리는 row 변경 X 후 200.
 *   재시도 시 confirm 라우트와 race 가능 → 둘 다 paid 결과 일치하므로 안전.
 *
 * 실패 응답: signature 401, validation 400, 그 외 500. Toss 는 4xx 재시도 안 함.
 */

import { eq, and, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { invoices, subscriptions } from "@/lib/db/schema"
import { verifyTossSignature } from "@/lib/billing/verify-webhook"
import { parseOrderId } from "@/lib/billing/orders"
import { upsertSubscription, markPastDue } from "@/lib/billing/subscription"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PERIOD_DAYS = 30

interface PaymentEventData {
  paymentKey?: string
  orderId?: string
  status?: string
  totalAmount?: number
  approvedAt?: string
  customerKey?: string
}

interface BillingKeyEventData {
  customerKey?: string
  billingKey?: string
}

interface WebhookPayload {
  eventType?: string
  createdAt?: string
  data?: PaymentEventData & BillingKeyEventData
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text()
  const sig = request.headers.get("toss-signature")

  const secret =
    process.env.TOSS_WEBHOOK_SECRET ?? process.env.TOSS_SECRET_KEY

  // Toss 미설정 + production = 401, dev = 통과.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "missing_secret" }, { status: 401 })
    }
    // dev 통과 — 아래에서 payload 만 처리.
  } else {
    const v = verifyTossSignature(rawBody, sig, secret)
    if (!v.ok) {
      return Response.json({ error: v.reason ?? "invalid_signature" }, { status: 401 })
    }
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 })
  }

  const eventType = payload.eventType ?? ""
  const data = payload.data ?? {}

  try {
    if (eventType === "PAYMENT_STATUS_CHANGED") {
      await handlePaymentStatus(data)
    } else if (eventType === "BILLING_KEY_DELETED") {
      await handleBillingKeyDeleted(data)
    } else {
      // 알 수 없는 event — 로깅만 하고 200 (재전송 방지).
      console.warn("[billing/webhook] unknown eventType", eventType)
    }
    return Response.json({ ok: true })
  } catch (e) {
    console.error("[billing/webhook] handler error", e)
    return Response.json({ error: "internal_error" }, { status: 500 })
  }
}

async function handlePaymentStatus(data: PaymentEventData): Promise<void> {
  const { paymentKey, orderId, status, totalAmount } = data
  if (!paymentKey || !orderId || !status) return

  // pending/paid invoice lookup — orderId 우선, 없으면 paymentKey.
  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.tossOrderId, orderId))
    .limit(1)
  if (!inv) {
    console.warn("[billing/webhook] invoice not found", orderId)
    return
  }

  // 멱등성 — 이미 paid 상태에서 DONE 재전송 받으면 no-op.
  if (status === "DONE" && inv.status === "paid") return
  if (status === "CANCELED" && inv.status === "refunded") return

  if (status === "DONE") {
    await db
      .update(invoices)
      .set({
        status: "paid",
        tossPaymentKey: paymentKey,
        paidAt: sql`now()`,
      })
      .where(eq(invoices.id, inv.id))

    const parsed = parseOrderId(orderId)
    const tier = parsed?.tier ?? "pro"
    const periodEnd = new Date(Date.now() + PERIOD_DAYS * 24 * 3600 * 1000)
    await upsertSubscription(inv.userId, tier, periodEnd)
    return
  }

  if (status === "ABORTED" || status === "EXPIRED") {
    await db
      .update(invoices)
      .set({ status: "failed", tossPaymentKey: paymentKey })
      .where(eq(invoices.id, inv.id))
    await markPastDue(inv.userId)
    return
  }

  if (status === "CANCELED") {
    // 환불.
    await db
      .update(invoices)
      .set({ status: "refunded" })
      .where(eq(invoices.id, inv.id))
    return
  }
}

async function handleBillingKeyDeleted(
  data: BillingKeyEventData,
): Promise<void> {
  const { customerKey } = data
  if (!customerKey) return
  await db
    .update(subscriptions)
    .set({
      canceledAt: new Date(),
      tossBillingKey: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.userId, customerKey),
        eq(subscriptions.status, "active"),
      ),
    )
}
