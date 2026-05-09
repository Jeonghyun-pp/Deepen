/**
 * /v2/home — 단원 선택 + 시작하기.
 *
 * Q1: 단원 = 수학Ⅱ 미분/적분 단일. published Pattern·Item 카운트 표시.
 * "시작하기" 클릭 → 그 단원의 첫 published Item 으로 이동.
 *
 * 빈 상태: Item 0개면 "콘텐츠 시드 진행 중" 안내 + 어드민 진입 (관리자만).
 */

import Link from "next/link"
import { and, asc, count, eq } from "drizzle-orm"
import { requireUser } from "@/lib/auth/require-user"
import { isAdminEmail } from "@/lib/auth/require-admin"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { LogoutButton } from "./LogoutButton"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const { user } = await requireUser()

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

  const itemTotal = Number(itemCount?.value ?? 0)
  const patternTotal = Number(patternCount?.value ?? 0)
  const isAdmin = isAdminEmail(user.email)

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-10">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-extrabold tracking-[0.18em] text-black/85"
          >
            DEEPEN
          </Link>
          <div className="flex items-center gap-3 text-xs text-black/55">
            <span>{user.email}</span>
            <LogoutButton />
          </div>
        </header>

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
            콘텐츠 시드 작업 중입니다 — 첫 풀이 가능 문제가 곧 추가됩니다.
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

        <section className="flex flex-wrap gap-2 border-t border-black/5 pt-6 text-xs text-black/55">
          <Link href="/v2/graph" className="hover:text-black/80 hover:underline">
            전체 학습 지도
          </Link>
          <span className="text-black/25">·</span>
          {isAdmin && (
            <>
              <Link
                href="/admin/seed-review"
                className="hover:text-black/80 hover:underline"
              >
                어드민
              </Link>
              <span className="text-black/25">·</span>
            </>
          )}
          <Link href="/upload" className="hover:text-black/80 hover:underline">
            PDF 업로드
          </Link>
        </section>
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
    return (
      <Link
        href={`/v2/solve/${firstItemId}`}
        className="group block rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:border-black/30 hover:shadow-md"
        data-testid="unit-card-active"
      >
        <UnitCardBody
          label={label}
          patternCount={patternCount}
          itemCount={itemCount}
          ctaLabel="시작하기 →"
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
