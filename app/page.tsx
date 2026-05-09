/**
 * 루트 랜딩 — 입시 AI 학습 코치 hero + CTA.
 *
 * 인증 상태 체크:
 *   - 로그인 → /v2/home redirect
 *   - 비로그인 → 랜딩 표시
 */

import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/v2/home")

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[color:var(--v2-ink)] px-6 text-white">
      <div
        aria-hidden
        className="absolute inset-x-6 inset-y-0 -z-10 rounded-[32px]"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 30%, #15803D 0%, #0F3B24 40%, #050807 90%)",
        }}
      />

      <header className="absolute left-8 top-6 text-xs font-extrabold tracking-[0.18em] opacity-80">
        DEEPEN
      </header>

      <section className="flex max-w-2xl flex-col items-center gap-7 text-center">
        <span className="rounded-full border border-white/20 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
          입시 AI 학습 코치 · for Korean Sooneung
        </span>

        <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
          유형 단위로{" "}
          <span className="text-[color:var(--v2-green-soft)]">약점을 추적</span>
          하고,
          <br />
          이전 학년의 <span className="text-[color:var(--v2-green-soft)]">숨은 결손</span>까지
          역추적합니다.
        </h1>

        <p className="max-w-xl text-sm leading-7 text-white/65 md:text-base">
          단원 단위 진단으로는 보이지 않는 진짜 약점을 짚어주는 한국형 입시 AI
          코치. 풀이 → 약점 진단 → 1~3분 리캡 → 같은 문제 재도전. 5분짜리 강사
          설명을 모든 학생에게 동일 비용으로.
        </p>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--v2-green)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[color:var(--v2-green-soft)]"
            data-testid="cta-start"
          >
            지금 시작하기 →
          </Link>
          <Link
            href="/login"
            className="text-xs text-white/55 underline-offset-4 hover:text-white/85 hover:underline"
          >
            이미 계정이 있어요
          </Link>
        </div>
      </section>

      <footer className="absolute bottom-6 right-8 text-[10px] uppercase tracking-widest text-white/35">
        © 2026 Deepen. 베타.
      </footer>
    </main>
  )
}
