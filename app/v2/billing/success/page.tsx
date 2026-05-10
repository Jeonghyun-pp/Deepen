/**
 * /v2/billing/success — Toss 결제창 success redirect.
 * Spec: 09-q3-build.md M3.1.
 *
 * URL: ?paymentKey=&orderId=&amount=
 * 서버는 query 검증만 하고, client 가 /api/billing/confirm 호출 (세션 쿠키 기반).
 */

import Link from "next/link"
import { ConfirmClient } from "./ConfirmClient"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{
    paymentKey?: string
    orderId?: string
    amount?: string
  }>
}

export default async function BillingSuccessPage({ searchParams }: Props) {
  const sp = await searchParams
  const paymentKey = sp.paymentKey ?? ""
  const orderId = sp.orderId ?? ""
  const amount = Number(sp.amount ?? 0)

  if (!paymentKey || !orderId || !Number.isFinite(amount) || amount <= 0) {
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16">
        <div className="mx-auto flex max-w-xl flex-col gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-lg font-semibold text-rose-900">잘못된 접근</h1>
          <p className="text-sm text-rose-800">
            결제 정보가 올바르지 않습니다. 결제를 다시 시도해 주세요.
          </p>
          <Link
            href="/v2/billing"
            className="text-sm font-medium text-rose-900 underline underline-offset-2"
          >
            요금 페이지로 →
          </Link>
        </div>
      </main>
    )
  }

  return (
    <ConfirmClient paymentKey={paymentKey} orderId={orderId} amount={amount} />
  )
}
