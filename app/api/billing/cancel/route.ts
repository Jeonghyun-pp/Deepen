/**
 * POST /api/billing/cancel — 자가 해지.
 * Spec: 09-q3-build.md M3.1.
 *
 * 즉시 해지 X — current_period_end 까지 Pro 혜택 유지.
 * canceled_at 만 기록 → cron(billing-renewal) 이 그 사용자는 재청구 skip.
 * period_end 도달 시 cron(또는 다른 만료 작업) 이 status='expired' 전이.
 *
 * 멱등: 이미 canceled_at 있으면 no-op.
 */
import { eq, and } from "drizzle-orm"
import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/billing/cancel",
  async (_request, { user }) => {
    const [active] = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1)
    if (!active) return apiError.notFound("no_active_subscription")

    if (active.canceledAt) {
      return Response.json({
        ok: true,
        canceledAt: active.canceledAt.toISOString(),
        currentPeriodEnd: active.currentPeriodEnd?.toISOString() ?? null,
        alreadyCanceled: true,
      })
    }

    const now = new Date()
    await db
      .update(subscriptions)
      .set({ canceledAt: now, updatedAt: now })
      .where(eq(subscriptions.id, active.id))

    return Response.json({
      ok: true,
      canceledAt: now.toISOString(),
      currentPeriodEnd: active.currentPeriodEnd?.toISOString() ?? null,
      alreadyCanceled: false,
    })
  },
)
