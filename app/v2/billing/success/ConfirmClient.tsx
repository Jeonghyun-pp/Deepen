"use client"

/**
 * 결제 confirm 호출 — paymentKey/orderId/amount 받아 server confirm API 호출.
 * 결과에 따라 성공/실패 UI.
 */

import Link from "next/link"
import { useEffect, useState } from "react"
import type { ConfirmResponse } from "@/lib/api/schemas/billing"
import { TIERS, type TierKey } from "@/lib/billing/tier"

type Phase =
  | { kind: "loading" }
  | { kind: "success"; tier: TierKey; periodEnd: string | null }
  | { kind: "failed"; error: string }

export function ConfirmClient({
  paymentKey,
  orderId,
  amount,
}: {
  paymentKey: string
  orderId: string
  amount: number
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" })

  useEffect(() => {
    let cancelled = false
    fetch("/api/billing/confirm", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then((r) => r.json() as Promise<ConfirmResponse>)
      .then((data) => {
        if (cancelled) return
        if (data.ok && data.tier) {
          setPhase({
            kind: "success",
            tier: data.tier,
            periodEnd: data.currentPeriodEnd,
          })
        } else {
          setPhase({ kind: "failed", error: data.error ?? "unknown" })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPhase({ kind: "failed", error: "network_error" })
        }
      })
    return () => {
      cancelled = true
    }
  }, [paymentKey, orderId, amount])

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        {phase.kind === "loading" && (
          <div className="rounded-2xl border border-black/10 bg-white p-6 text-center text-sm text-black/55">
            결제를 확인하고 있어요…
          </div>
        )}
        {phase.kind === "success" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mb-2 text-3xl">🎉</div>
            <h1 className="text-xl font-bold text-emerald-900">
              {TIERS[phase.tier].label} 결제 완료
            </h1>
            <p className="mt-2 text-sm text-emerald-800">
              {phase.periodEnd
                ? `다음 결제일: ${new Date(phase.periodEnd).toLocaleDateString("ko-KR")}`
                : "구독이 활성화됐어요."}
            </p>
            <Link
              href="/v2/home"
              className="mt-5 inline-block rounded-md bg-emerald-700 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              홈으로
            </Link>
          </div>
        )}
        {phase.kind === "failed" && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h1 className="text-lg font-semibold text-rose-900">
              결제 확인 실패
            </h1>
            <p className="mt-2 text-sm text-rose-800">
              에러 코드: <code className="font-mono text-xs">{phase.error}</code>
            </p>
            <p className="mt-2 text-xs text-rose-700">
              결제는 보류 상태입니다. 잠시 후 다시 시도하거나 운영팀에 문의해 주세요.
            </p>
            <Link
              href="/v2/billing"
              className="mt-4 inline-block text-sm font-medium text-rose-900 underline underline-offset-2"
            >
              요금 페이지로 →
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
