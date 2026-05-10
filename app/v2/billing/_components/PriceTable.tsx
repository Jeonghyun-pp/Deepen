"use client"

/**
 * 가격 비교 표 — 3 tier.
 * Spec: 09-q3-build.md M3.1 PriceTable.
 */

import { useState } from "react"
import {
  TIERS,
  formatKrw,
  type TierKey,
} from "@/lib/billing/tier"
import type { CheckoutResponse } from "@/lib/api/schemas/billing"
import { loadTossPayments } from "@/lib/billing/toss-sdk-loader"

export interface PriceTableProps {
  currentTier: TierKey
  /** 활성 구독의 해지 예정 시각 (ISO). 있으면 "해지 예정" 안내. */
  canceledAt?: string | null
  currentPeriodEnd?: string | null
}

export function PriceTable({
  currentTier,
  canceledAt = null,
  currentPeriodEnd = null,
}: PriceTableProps) {
  const [pendingMessage, setPendingMessage] = useState<string | null>(null)
  const [busyTier, setBusyTier] = useState<"pro" | "pro_plus" | "cancel" | null>(
    null,
  )

  const handleCheckout = async (tier: "pro" | "pro_plus") => {
    if (busyTier) return
    setBusyTier(tier)
    setPendingMessage(null)
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier }),
      })
      if (!res.ok) {
        setPendingMessage("결제 진입 실패. 잠시 후 다시 시도해 주세요.")
        return
      }
      const data = (await res.json()) as CheckoutResponse

      if (data.sdkConfig && data.orderId) {
        const TossPayments = await loadTossPayments()
        const inst = TossPayments(data.sdkConfig.clientKey)
        await inst.requestPayment("카드", {
          amount: data.sdkConfig.amountKrw,
          orderId: data.orderId,
          orderName: data.sdkConfig.orderName,
          customerKey: data.sdkConfig.customerKey,
          successUrl: data.sdkConfig.successUrl,
          failUrl: data.sdkConfig.failUrl,
        })
        return
      }

      if (data.tossPaymentUrl) {
        window.location.href = data.tossPaymentUrl
        return
      }
      setPendingMessage(data.pendingMessage ?? "결제 곧 출시됩니다.")
    } catch (e) {
      setPendingMessage(
        (e as Error).message === "toss_sdk_load_failed"
          ? "결제 모듈을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요."
          : "네트워크 문제로 결제 진입에 실패했어요.",
      )
    } finally {
      setBusyTier(null)
    }
  }

  const handleCancel = async () => {
    if (busyTier) return
    if (!confirm("Pro 혜택은 다음 결제일까지 유지돼요. 정말 해지할까요?")) return
    setBusyTier("cancel")
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        credentials: "include",
      })
      if (res.ok) {
        // 페이지 새로고침 — server props 갱신.
        window.location.reload()
      } else {
        setPendingMessage("해지 처리에 실패했어요. 잠시 후 다시 시도해 주세요.")
      }
    } catch {
      setPendingMessage("네트워크 문제로 해지에 실패했어요.")
    } finally {
      setBusyTier(null)
    }
  }

  const tiers: TierKey[] = ["free", "pro", "pro_plus"]

  return (
    <section
      className="grid gap-4 sm:grid-cols-3"
      data-testid="price-table"
    >
      {tiers.map((key) => {
        const t = TIERS[key]
        const isCurrent = key === currentTier
        const isFree = key === "free"
        return (
          <article
            key={key}
            className={`flex flex-col rounded-2xl border p-5 ${
              key === "pro_plus"
                ? "border-emerald-300 bg-emerald-50"
                : isCurrent
                  ? "border-black/40 bg-white"
                  : "border-black/10 bg-white"
            }`}
            data-testid={`price-tier-${key}`}
          >
            <header className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black/85">{t.label}</h2>
              {isCurrent && (
                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] text-black/55">
                  현재
                </span>
              )}
            </header>

            <p className="mt-3 text-3xl font-bold tabular-nums text-black/90">
              {isFree ? "무료" : formatKrw(t.monthlyKrw)}
              {!isFree && (
                <span className="text-sm font-normal text-black/55"> / 월</span>
              )}
            </p>
            {!isFree && t.yearlyKrw !== null && (
              <p className="mt-1 text-xs text-black/45">
                연 결제 시 {formatKrw(t.yearlyKrw)} (할인 17%)
              </p>
            )}

            <ul className="mt-4 flex-1 space-y-2 text-sm text-black/75">
              {t.highlights.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-700">✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            {isFree ? (
              <span className="mt-5 text-center text-xs text-black/45">
                {isCurrent ? "사용 중" : ""}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleCheckout(key as "pro" | "pro_plus")}
                disabled={isCurrent || busyTier !== null}
                data-testid={`checkout-${key}`}
                className={`mt-5 rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${
                  key === "pro_plus"
                    ? "bg-emerald-700 text-white hover:bg-emerald-800"
                    : "bg-black text-white hover:bg-black/85"
                }`}
              >
                {isCurrent
                  ? "사용 중"
                  : busyTier === key
                    ? "결제창 여는 중…"
                    : "업그레이드"}
              </button>
            )}
          </article>
        )
      })}

      {currentTier !== "free" && !canceledAt && (
        <div className="col-span-full flex items-center justify-end">
          <button
            type="button"
            onClick={handleCancel}
            disabled={busyTier !== null}
            data-testid="cancel-subscription"
            className="text-xs text-black/55 underline underline-offset-2 hover:text-rose-700 disabled:opacity-40"
          >
            {busyTier === "cancel" ? "해지 처리 중…" : "구독 해지"}
          </button>
        </div>
      )}

      {currentTier !== "free" && canceledAt && currentPeriodEnd && (
        <div
          className="col-span-full rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          data-testid="cancel-pending"
        >
          해지 예약됨 — {new Date(currentPeriodEnd).toLocaleDateString("ko-KR")}
          까지 Pro 혜택이 유지된 후 자동 무료 전환됩니다.
        </div>
      )}

      {pendingMessage && (
        <div
          className="col-span-full rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          role="status"
          data-testid="checkout-pending"
        >
          {pendingMessage}
        </div>
      )}
    </section>
  )
}
