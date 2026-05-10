/**
 * /v2/home — 단원 선택 + 시작하기.
 *
 * Q1: 단원 = 수학Ⅱ 미분/적분 단일. published Pattern·Item 카운트 표시.
 * "시작하기" 클릭 → 그 단원의 첫 published Item 으로 이동.
 *
 * 빈 상태: Item 0개면 "콘텐츠 시드 진행 중" 안내 + 어드민 진입 (관리자만).
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { and, asc, count, eq } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { isAdminEmail } from "@/lib/auth/require-admin"
import { db } from "@/lib/db"
import { nodes, users } from "@/lib/db/schema"
import { COPY } from "@/lib/ui/copy"
import { getActiveTier, getUsageStat } from "@/lib/billing/quota"
import { QuotaCard } from "@/app/v2/billing/_components/QuotaCard"
import { DailyChallengeBadge } from "@/app/v2/_components/DailyChallengeBadge"
import { LogoutButton } from "./LogoutButton"

export const dynamic = "force-dynamic"

interface Props {
  searchParams: Promise<{ dailyDone?: string }>
}

export default async function HomePage({ searchParams }: Props) {
  const sp = await searchParams
  const dailyDone = sp.dailyDone === "1"
  const { user } = await requireUser()

  // Phase A 끊김1 — 신규 사용자 onboard 게이트.
  // public.users 행이 없거나 onboarded_at 이 null 이면 4-step 으로 redirect.
  const [profile] = await db
    .select({ onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  if (!profile?.onboardedAt) {
    redirect("/v2/onboard/profile")
  }

  const [patternCount] = await db
    .select({ value: count() })
    .from(nodes)
    .where(eq(nodes.type, "pattern"))

  const [itemCount] = await db
    .select({ value: count() })
    .from(nodes)
    .where(and(eq(nodes.type, "item"), eq(nodes.status, "published")))

  const [firstItem] = await db
    .select({ id: nodes.id })
    .from(nodes)
    .where(and(eq(nodes.type, "item"), eq(nodes.status, "published")))
    .orderBy(asc(nodes.createdAt))
    .limit(1)

  // 워크스페이스 v0 lock #9 — 통합 워크스페이스로 redirect (오르조 '열자마자 풀이').
  // dailyDone=1 (오늘의 도전 완료 직후 축하 배너) 또는 시드 0개 (UnitCard 빈 상태)
  // 인 경우는 home 유지. 그 외엔 첫 published item 으로 redirect.
  if (firstItem && !dailyDone) {
    redirect(`/v2/workspace/${firstItem.id}`)
  }

  const itemTotal = Number(itemCount?.value ?? 0)
  const patternTotal = Number(patternCount?.value ?? 0)
  const isAdmin = isAdminEmail(user.email)
  const tier = await getActiveTier(user.id)
  const usage = await getUsageStat(user.id)

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-3">
          <Link
            href="/"
            className="text-xs font-extrabold tracking-[0.18em] text-black/85"
          >
            DEEPEN
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-black/55">
            <DailyChallengeBadge />
            <QuotaCard
              tier={tier}
              used={usage.used}
              limit={usage.limit}
              resetAtIso={usage.resetAtIso}
              variant="mini"
            />
            <span className="hidden max-w-[160px] truncate sm:inline">{user.email}</span>
            <LogoutButton />
          </div>
        </header>

        {dailyDone && (
          <section
            className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            data-testid="daily-done-banner"
            role="status"
          >
            <span className="text-base">🎉</span>
            <div className="flex-1">
              <div className="font-semibold">오늘의 도전 완료!</div>
              <div className="text-xs text-emerald-800/80">
                약점 3문제를 끝까지 풀었어요. 내일 새 챌린지가 자동 생성됩니다.
              </div>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
            단원 선택
          </span>
          <h1 className="text-2xl font-semibold text-black/85">
            오늘 풀 단원을 골라 보세요
          </h1>
          <p className="text-sm text-black/55">
            한 사이클은 5~10분이에요. 풀이 → 채점 → 결손 진단 → 1~3분 리캡 →
            재도전.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <UnitCard
            label="수학Ⅱ · 미분/적분"
            patternCount={patternTotal}
            itemCount={itemTotal}
            firstItemId={firstItem?.id ?? null}
          />
        </section>

        {itemTotal === 0 && (
          <section
            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
            data-testid="empty-state"
          >
            {COPY.empty.seedNotReady}
            {isAdmin && (
              <>
                {" "}
                <Link
                  href="/admin/seed-review"
                  className="font-semibold underline underline-offset-2"
                >
                  어드민에서 추가 →
                </Link>
              </>
            )}
          </section>
        )}

        <nav
          aria-label="보조 내비게이션"
          className="flex flex-wrap gap-x-4 gap-y-2 border-t border-black/5 pt-6 text-xs text-black/55 sm:gap-x-3"
        >
          <Link href="/v2/graph" className="hover:text-black/80 hover:underline">
            전체 학습 지도
          </Link>
          {isAdmin && (
            <Link
              href="/admin/seed-review"
              className="hover:text-black/80 hover:underline"
            >
              어드민
            </Link>
          )}
          <Link href="/upload" className="hover:text-black/80 hover:underline">
            PDF 업로드
          </Link>
          <Link href="/v2/stats" className="hover:text-black/80 hover:underline">
            내 통계
          </Link>
          <Link href="/v2/billing" className="hover:text-black/80 hover:underline">
            요금
          </Link>
          <Link
            href="/v2/settings/parents"
            className="hover:text-black/80 hover:underline"
          >
            보호자 리포트
          </Link>
        </nav>
      </div>
    </main>
  )
}

function UnitCard({
  label,
  patternCount,
  itemCount,
  firstItemId,
}: {
  label: string
  patternCount: number
  itemCount: number
  firstItemId: string | null
}) {
  const hasContent = itemCount > 0 && firstItemId

  if (hasContent) {
    // 단원 진입 화면 (/v2/study/[unitId]) 경유 — Pattern 미리보기 후 풀이 시작.
    return (
      <Link
        href="/v2/study/default"
        className="group block rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:border-black/30 hover:shadow-md"
        data-testid="unit-card-active"
      >
        <UnitCardBody
          label={label}
          patternCount={patternCount}
          itemCount={itemCount}
          ctaLabel="단원 열기 →"
        />
      </Link>
    )
  }

  return (
    <div
      className="block cursor-not-allowed rounded-2xl border border-dashed border-black/15 bg-white/50 p-6 opacity-70"
      data-testid="unit-card-empty"
    >
      <UnitCardBody
        label={label}
        patternCount={patternCount}
        itemCount={itemCount}
      />
    </div>
  )
}

function UnitCardBody({
  label,
  patternCount,
  itemCount,
  ctaLabel,
}: {
  label: string
  patternCount: number
  itemCount: number
  ctaLabel?: string
}) {
  return (
    <>
      <header className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/45">
          단원
        </span>
        {ctaLabel && (
          <span className="text-xs text-emerald-700 group-hover:text-emerald-800">
            {ctaLabel}
          </span>
        )}
      </header>
      <h2 className="mt-2 text-xl font-semibold text-black/85">{label}</h2>
      <dl className="mt-4 flex gap-6 text-xs text-black/55">
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-black/40">
            유형
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-black/80 tabular-nums">
            {patternCount}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-widest text-black/40">
            기출 문제
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-black/80 tabular-nums">
            {itemCount}
          </dd>
        </div>
      </dl>
    </>
  )
}
