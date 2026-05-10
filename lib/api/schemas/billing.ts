/**
 * /api/billing/* zod 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §9, M3.1.
 */

import { z } from "zod"

export const TierKey = z.enum(["free", "pro", "pro_plus"])
export type TierKey = z.infer<typeof TierKey>

export const SubscriptionStatus = z.enum([
  "active",
  "past_due",
  "canceled",
  "expired",
])

export const BillingMeResponse = z.object({
  subscription: z
    .object({
      tier: TierKey,
      status: SubscriptionStatus,
      currentPeriodEnd: z.string().nullable(),
      canceledAt: z.string().nullable(),
    })
    .nullable(),
  quota: z.object({
    used: z.number().int().nonnegative(),
    limit: z.union([z.number().int().nonnegative(), z.literal("unlimited")]),
    resetAtIso: z.string().nullable(),
  }),
})
export type BillingMeResponse = z.infer<typeof BillingMeResponse>

export const CheckoutRequest = z.object({
  tier: z.enum(["pro", "pro_plus"]),
})
export type CheckoutRequest = z.infer<typeof CheckoutRequest>

export const CheckoutResponse = z.object({
  /** Toss 결제창 URL — 프로덕션 통합 시 hosted page 흐름. null 이면 SDK 플로우. */
  tossPaymentUrl: z.string().url().nullable(),
  /** SDK/redirect 흐름 공용 — checkout 시점에 발급된 orderId. */
  orderId: z.string().nullable(),
  /** 클라가 결제창에 넘길 정보 (Toss SDK 통합 시). null 이면 dryRun. */
  sdkConfig: z
    .object({
      clientKey: z.string(),
      customerKey: z.string(),
      orderName: z.string(),
      amountKrw: z.number().int().positive(),
      successUrl: z.string().url(),
      failUrl: z.string().url(),
    })
    .nullable(),
  /** Toss 미설정·env 누락 등으로 막혔을 때 카피. */
  pendingMessage: z.string().nullable(),
})
export type CheckoutResponse = z.infer<typeof CheckoutResponse>

/** 클라가 결제 성공 후 server confirm — Toss API 로 amount 위변조 검증. */
export const ConfirmRequest = z.object({
  paymentKey: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
})
export type ConfirmRequest = z.infer<typeof ConfirmRequest>

export const ConfirmResponse = z.object({
  ok: z.boolean(),
  tier: TierKey.nullable(),
  currentPeriodEnd: z.string().nullable(),
  error: z.string().nullable(),
})
export type ConfirmResponse = z.infer<typeof ConfirmResponse>
