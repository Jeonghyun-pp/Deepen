/**
 * POST /api/billing/checkout — 결제 진입.
 * Spec: docs/build-spec/03-api-contracts.md §9, M3.1.
 *
 * 흐름:
 *   1) tier 검증 + 가격 결정 (월 결제만, 연 결제는 후속).
 *   2) orderId 발급 + invoices 에 status='pending' 으로 행 생성.
 *   3) Toss SDK 가 사용할 config (clientKey, customerKey, success/fail URL) 반환.
 *   4) 클라가 SDK 호출 → 결제 완료 → /v2/billing/success?paymentKey=&orderId=&amount=
 *      → 그 페이지가 /api/billing/confirm 으로 finalize.
 *
 * env 미설정 (Toss 미통합) 시 sdkConfig=null + pendingMessage 만 반환 (베타 모드).
 */

import { db } from "@/lib/db"
import { invoices } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  CheckoutRequest,
  type CheckoutResponse,
} from "@/lib/api/schemas/billing"
import { TIERS } from "@/lib/billing/tier"
import { generateOrderId } from "@/lib/billing/orders"
import { features, env } from "@/lib/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/billing/checkout",
  async (request, { user }) => {
    let body: ReturnType<typeof CheckoutRequest.parse>
    try {
      body = CheckoutRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    const tierConfig = TIERS[body.tier]
    const amount = tierConfig.monthlyKrw

    // dryRun (env 미설정) — 베타 안내 카피.
    if (!features.tossLive || !env.TOSS_CLIENT_KEY) {
      const response: CheckoutResponse = {
        tossPaymentUrl: null,
        orderId: null,
        sdkConfig: null,
        pendingMessage: `${tierConfig.label} 결제 연동은 곧 출시됩니다. 베타 기간 무료로 체험 중이에요.`,
      }
      return Response.json(response, { status: 200 })
    }

    const orderId = generateOrderId(body.tier)

    // pending invoice — webhook/confirm 에서 toss_order_id 로 lookup.
    await db.insert(invoices).values({
      userId: user.id,
      amountKrw: amount,
      status: "pending",
      tossOrderId: orderId,
    })

    const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const response: CheckoutResponse = {
      tossPaymentUrl: null,
      orderId,
      sdkConfig: {
        clientKey: env.TOSS_CLIENT_KEY,
        // customerKey 는 user 고유 — 빌링키 발급 후 자동결제 시 필요.
        customerKey: user.id,
        orderName: `Deepen ${tierConfig.label} 1개월`,
        amountKrw: amount,
        successUrl: `${appUrl}/v2/billing/success`,
        failUrl: `${appUrl}/v2/billing/fail`,
      },
      pendingMessage: null,
    }
    return Response.json(response, { status: 200 })
  },
)
