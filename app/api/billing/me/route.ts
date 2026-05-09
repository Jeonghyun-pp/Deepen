/**
 * GET /api/billing/me — 현재 구독 + 사용량.
 * Spec: docs/build-spec/03-api-contracts.md §9, M3.1.
 */

import { and, desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"
import { getUsageStat } from "@/lib/billing/quota"
import type { BillingMeResponse } from "@/lib/api/schemas/billing"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth("GET /api/billing/me", async (_request, { user }) => {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  const usage = await getUsageStat(user.id)

  const response: BillingMeResponse = {
    subscription: sub
      ? {
          tier: sub.tier,
          status: sub.status,
          currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
          canceledAt: sub.canceledAt?.toISOString() ?? null,
        }
      : null,
    quota: {
      used: usage.used,
      limit: usage.limit,
      resetAtIso: usage.resetAtIso,
    },
  }
  return Response.json(response, { status: 200 })
})
