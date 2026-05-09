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
  /** Q3 결제 도입 후: Toss 결제창 URL. 현재는 null (placeholder). */
  tossPaymentUrl: z.string().url().nullable(),
  orderId: z.string().nullable(),
  pendingMessage: z.string().nullable(),
})
export type CheckoutResponse = z.infer<typeof CheckoutResponse>
