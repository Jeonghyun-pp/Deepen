"use client"

/**
 * AI 사용량 카드 — 빌링 페이지 + 헤더 mini.
 * Spec: 09-q3-build.md M3.1 QuotaCard, 오르조 A.5 명시 카운터.
 */

import Link from "next/link"
import { TIERS, type TierKey, formatKrw } from "@/lib/billing/tier"

export interface QuotaCardProps {
  tier: TierKey
  used: number
  limit: number | "unlimited"
  resetAtIso: string | null
  variant?: "full" | "mini"
}

export function QuotaCard({
  tier,
  used,
  limit,
  resetAtIso,
  variant = "full",
}: QuotaCardProps) {
  const remaining =
    limit === "unlimited" ? Infinity : Math.max(0, limit - used)
  const percent =
    limit === "unlimited"
      ? 0
      : Math.min(100, Math.round((used / Math.max(1, limit)) * 100))
  const danger = limit !== "unlimited" && remaining <= 1
  const tierLabel = TIERS[tier].label

  const resetLabel = resetAtIso
    ? new Date(resetAtIso).toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "numeric",
      })
    : null

  if (variant === "mini") {
    if (limit === "unlimited") {
      return (
        <span
          className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
          data-testid="quota-mini"
        >
          {tierLabel} · 무제한
        </span>
      )
    }
    return (
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
          danger
            ? "bg-rose-100 text-rose-800"
            : "bg-zinc-100 text-zinc-700"
        }`}
        data-testid="quota-mini"
        title={resetLabel ? `${resetLabel} 리셋` : undefined}
      >
        {tierLabel} · {used}/{limit}
      </span>
    )
  }

  return (
    <section
      className="rounded-xl border border-black/10 bg-white p-5"
      data-testid="quota-card"
    >
      <header className="flex items-baseline justify-between">
        <p className="text-[11px] uppercase tracking-widest text-black/45">
          AI 코치 사용량
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            tier === "pro_plus"
              ? "bg-emerald-100 text-emerald-800"
              : tier === "pro"
                ? "bg-blue-100 text-blue-800"
                : "bg-zinc-100 text-zinc-700"
          }`}
        >
          {tierLabel}
        </span>
      </header>

      <p className="mt-3 text-3xl font-bold tabular-nums text-black/85">
        {limit === "unlimited" ? (
          <>무제한</>
        ) : (
          <>
            {used}
            <span className="text-base text-black/45"> / {limit}</span>
          </>
        )}
      </p>

      {limit !== "unlimited" && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className={`h-full transition-all ${
                danger ? "bg-rose-500" : "bg-black/65"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-black/55">
            {resetLabel
              ? `${resetLabel} 리셋`
              : tier === "free"
                ? "Free 는 평생 5회 — 리셋 없음"
                : ""}
          </p>
        </div>
      )}

      {tier !== "pro_plus" && (
        <Link
          href="/v2/billing"
          className="mt-4 inline-block rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
        >
          {tier === "free"
            ? `Pro 업그레이드 (${formatKrw(TIERS.pro.monthlyKrw)} / 월)`
            : "Pro+ 알아보기"}
        </Link>
      )}
    </section>
  )
}
