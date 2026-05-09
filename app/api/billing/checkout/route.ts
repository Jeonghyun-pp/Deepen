/**
 * POST /api/billing/checkout — Q3 결제 진입 (Toss 연동 placeholder).
 * Spec: docs/build-spec/03-api-contracts.md §9, M3.1.
 *
 * Q3 1차 단계 (현재): tossPaymentUrl=null, pendingMessage 만 반환.
 *   실 결제 통합은 후속 — webhook + signature 검증 + idempotency 작업 큼.
 *   이 placeholder 가 있으면 클라 흐름 (PriceTable → 결제 시도 → 안내) 은
 *   완성. dev 시연 가능.
 */

import { withAuth, apiError } from "@/lib/api/handler"
import {
  CheckoutRequest,
  type CheckoutResponse,
} from "@/lib/api/schemas/billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth("POST /api/billing/checkout", async (request) => {
  let body: ReturnType<typeof CheckoutRequest.parse>
  try {
    body = CheckoutRequest.parse(await request.json())
  } catch {
    return apiError.badRequest("validation_failed")
  }

  const response: CheckoutResponse = {
    tossPaymentUrl: null,
    orderId: null,
    pendingMessage: `${body.tier === "pro_plus" ? "Pro+" : "Pro"} 결제 연동은 곧 출시됩니다. 베타 기간 무료로 체험 중이에요.`,
  }
  return Response.json(response, { status: 200 })
})
