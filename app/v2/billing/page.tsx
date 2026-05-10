/**
 * /v2/billing — 가격 + 사용량.
 * Spec: 09-q3-build.md M3.1.
 */

import Link from "next/link"
import { and, desc, eq } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { db } from "@/lib/db"
import { subscriptions } from "@/lib/db/schema"
import { getActiveTier, getUsageStat } from "@/lib/billing/quota"
import { features } from "@/lib/env"
import { PriceTable } from "./_components/PriceTable"
import { QuotaCard } from "./_components/QuotaCard"

export const dynamic = "force-dynamic"

export default async function BillingPage() {
  const { user } = await requireUser()
  const tier = await getActiveTier(user.id)
  const usage = await getUsageStat(user.id)

  const [activeSub] = await db
    .select({
      canceledAt: subscriptions.canceledAt,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, user.id), eq(subscriptions.status, "active")),
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1)

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="flex items-center justify-between border-b border-black/5 pb-4">
          <div>
            <Link
              href="/v2/home"
              className="text-[11px] uppercase tracking-widest text-black/45 hover:text-black/70"
            >
              ← 홈
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-black/85">
              요금
            </h1>
            <p className="mt-1 text-xs text-black/55">
              AI 코치 사용량과 가격 티어를 한눈에.
              {!features.tossLive && " 결제는 베타 기간 곧 출시."}
            </p>
          </div>
        </header>

        <QuotaCard
          tier={tier}
          used={usage.used}
          limit={usage.limit}
          resetAtIso={usage.resetAtIso}
          variant="full"
        />

        <PriceTable
          currentTier={tier}
          canceledAt={activeSub?.canceledAt?.toISOString() ?? null}
          currentPeriodEnd={activeSub?.currentPeriodEnd?.toISOString() ?? null}
        />

        {!features.tossLive && (
          <section className="rounded-lg border border-black/10 bg-white p-4 text-xs text-black/55">
            <p>
              <strong className="text-black/75">결제 안내</strong> · Toss 결제
              연동은 베타 기간 후속 단계입니다. 현재 모든 사용자는 Free 5회 평생
              캡으로 동작합니다.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
