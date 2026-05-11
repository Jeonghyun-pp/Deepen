"use client";

import Link from "next/link";
import { ArrowRight, AlertTriangle, Target } from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   /v2 LANDING — editorial / handcrafted
   References: Brilliant (persona CTA) · Toss (alt 2-col, big type) ·
               Synthesis (founder letter, concrete data)
   ════════════════════════════════════════════════════════════════ */

export default function V2Landing() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A2E] overflow-x-hidden">
      <Nav />
      <Hero />
      <SocialProof />
      <FeatureWeakness />
      <FeaturePrereq />
      <FeatureRoute />
      <ExamData />
      <FounderLetter />
      <Footer />
    </div>
  );
}

/* ─────────────────────────────────────────────── nav ─────── */
function Nav() {
  return (
    <header className="absolute top-0 left-0 right-0 z-30">
      <div className="max-w-[1280px] mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/v2" className="font-extrabold tracking-[0.18em] text-xs">
          DEEPEN<span className="opacity-40">.LAB</span>
        </Link>
        <div className="flex items-center gap-1 text-xs">
          <Link href="/login" className="text-black/55 hover:text-black/85 px-3 py-1.5 transition">
            로그인
          </Link>
          <Link
            href="/v2/onboard/profile"
            className="text-[#15803D] hover:underline px-3 py-1.5 font-medium transition"
          >
            시작하기 →
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────── hero ───── */
function Hero() {
  return (
    <section className="relative pt-40 md:pt-44 pb-24 px-6">
      {/* warm radial */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 30%, #DCFCE7 0%, #F0F7F2 35%, #FAFAF8 65%)",
        }}
      />

      <div className="max-w-[1100px] mx-auto text-center">
        {/* MID-SIZE editorial headline — semibold weight gives breathing room */}
        <h1 className="font-semibold tracking-[-0.04em] leading-[0.98] text-[44px] md:text-[64px] lg:text-[80px] break-keep">
          오답이{" "}
          <span className="relative inline-block">
            두 번
            <UnderlineSwoosh />
          </span>{" "}
          나오지 않게.
        </h1>

        <p className="mt-8 text-base md:text-lg text-black/60 leading-relaxed max-w-[440px] mx-auto break-keep">
          맞은 문제도 왜 헷갈렸는지까지 추적하는 입시 코치.
        </p>

        {/* persona CTAs — minimal text-link rows with hairline divider */}
        <div className="mt-12 max-w-[360px] mx-auto">
          <div className="text-[11px] text-black/40 mb-3">학년부터 골라 주세요</div>
          <div className="border-t border-black/10">
            {[
              { label: "고2 입니다", href: "/v2/onboard/profile?grade=h2" },
              { label: "고3 입니다", href: "/v2/onboard/profile?grade=h3" },
              { label: "N수 입니다", href: "/v2/onboard/profile?grade=n" },
            ].map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="group flex items-center justify-between py-4 border-b border-black/10 hover:border-[#15803D] transition"
              >
                <span className="text-base font-medium group-hover:text-[#15803D] transition">{p.label}</span>
                <ArrowRight
                  size={16}
                  className="text-black/25 group-hover:text-[#15803D] group-hover:translate-x-1 transition"
                />
              </Link>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-black/40">
            <Link href="/v2/onboard/profile" className="hover:text-black/70 transition">
              고1 또는 다른 학년 →
            </Link>
          </div>
        </div>

        <div className="mt-10 text-[11px] text-black/40">
          5분 진단 평가 · 카드 등록 없음
        </div>
      </div>
    </section>
  );
}

function UnderlineSwoosh() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 18"
      className="absolute -bottom-2 left-0 w-full"
      style={{ height: "0.18em" }}
      preserveAspectRatio="none"
    >
      <path
        d="M 4 12 Q 50 2, 100 8 T 196 6"
        stroke="#15803D"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/* ──────────────────────────────────── social proof ─────── */
function SocialProof() {
  return (
    <section className="px-6 py-24 border-t border-black/10">
      <div className="max-w-[1100px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          <div className="md:col-span-3">
            <div className="text-xs text-black/45 font-medium leading-relaxed">
              먼저 써본<br />학생들이 해준 말
            </div>
          </div>
          <div className="md:col-span-9 space-y-9">
            <Quote
              text="내 약점이 그래프로 보이니까 어디부터 풀지 안 헤매요. 시간 아껴요."
              author="김O현, 고2"
            />
            <Quote
              text="선행 결손까지 잡아주는 게 달라요. 미적분 못 푸는 진짜 이유가 중3 판별식이었음."
              author="박O진, N수"
            />
            <Quote
              text="맞았는데 헷갈린 문제를 따로 보여주는 게 진짜. 시험 직전에 이거만 봤어요."
              author="이O서, 고3"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Quote({ text, author }: { text: string; author: string }) {
  return (
    <blockquote>
      <p className="text-lg md:text-xl leading-[1.55] text-black/80 break-keep">
        {text}
      </p>
      <footer className="mt-2 text-xs text-black/45">{author}</footer>
    </blockquote>
  );
}

/* ───────────────────────────── feature 1: weakness ───── */
function FeatureWeakness() {
  return (
    <section className="px-6 py-24 border-t border-black/5">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-5">
          <div className="text-xs text-[#E11D48] font-medium mb-4">01 약점 추적</div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] mb-6 break-keep">
            단원이 아니라 <span className="text-[#E11D48]">출제 유형</span>으로 추적해요.
          </h2>
          <p className="text-base text-black/65 leading-relaxed break-keep">
            같은 미분이라도 <em className="not-italic font-semibold text-black/85">곡선 밖 접선</em>과 <em className="not-italic font-semibold text-black/85">그래프 개형</em>은 완전히 다른 약점이에요.
            Deepen은 320개 출제 유형 단위로 숙련도를 추적해요.
          </p>
          <p className="mt-5 pl-4 border-l-2 border-amber-300 text-sm text-black/70 leading-relaxed break-keep">
            <strong className="text-black/85">맞았지만 헷갈림</strong>도 약점으로 저장돼요. 시험에서 다시 틀릴 가능성이 높거든요.
          </p>
        </div>
        <div className="lg:col-span-7">
          <BrowserFrame>
            <GraphSnapshot />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── feature 2: prereq ─────── */
function FeaturePrereq() {
  return (
    <section className="px-6 py-24 bg-gradient-to-b from-white to-[#FAFAF8] border-t border-black/5">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-7 order-2 lg:order-1">
          <BrowserFrame tinted>
            <PrereqSnapshot />
          </BrowserFrame>
        </div>
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="text-xs text-[#7C3AED] font-medium mb-4">02 선행 결손 진단</div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] mb-6 break-keep">
            중3 판별식이 <span className="text-[#7C3AED]">진짜 원인</span>일 수 있어요.
          </h2>
          <p className="text-base text-black/65 leading-relaxed break-keep">
            고2 미분 문제를 못 푸는 이유는 미분이 아닐 수 있어요.
            Deepen은 4년 전 단원까지 역추적해서 어디가 무너졌는지 보여줘요.
          </p>
          <div className="mt-6 space-y-2 text-sm text-black/70 leading-relaxed">
            <div>— 오답·헷갈림 패턴에서 결손 가능성 자동 판단</div>
            <div>— 해당 선행 개념만 1~3분 리캡으로 복구</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── feature 3: route ──────── */
function FeatureRoute() {
  return (
    <section className="px-6 py-24 border-t border-black/5">
      <div className="max-w-[760px] mx-auto">
        <div className="text-xs text-[#15803D] font-medium mb-4">03 오늘의 추천 루트</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] mb-6 break-keep max-w-[520px]">
          오늘 무엇을 풀지, 오늘 알 수 있어요.
        </h2>
        <p className="text-base text-black/65 leading-relaxed mb-12 break-keep max-w-[480px]">
          어제 푼 데이터 → 오늘의 약점·결손 → 4~5단계 학습 루트.
          매일 자동으로 만들어져요.
        </p>

        <RouteCard />
      </div>
    </section>
  );
}

function RouteCard() {
  const steps = [
    { n: 1, kind: "리캡", title: "이차방정식의 판별식", time: "2분", grade: "중3", accent: "#7C3AED" },
    { n: 2, kind: "미니 문제", title: "중근 조건 적용", time: "1분", grade: null, accent: "#7C3AED" },
    { n: 3, kind: "유형 풀이", title: "곡선 밖 접선 — 쉬움 2문제", time: "5분", grade: null, accent: "#15803D" },
    { n: 4, kind: "기출 도전", title: "2024 6모 14번", time: "8분", grade: null, accent: "#15803D" },
    { n: 5, kind: "재도전", title: "어제 헷갈린 문제", time: "5분", grade: null, accent: "#CA8A04" },
  ];

  // editorial: numbered list, no card frame, just hairline rules
  return (
    <div className="text-left">
      <div className="flex items-baseline justify-between pb-3 mb-1 text-xs text-black/45 border-b border-black/15">
        <span>5월 3일 토요일 · 자동 생성</span>
        <span className="font-mono">예상 21분</span>
      </div>
      <div>
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex items-baseline gap-5 py-4 border-b border-black/8"
          >
            <span
              className="text-2xl font-light tabular-nums w-6 flex-shrink-0"
              style={{ color: s.accent }}
            >
              {s.n}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 text-[11px]">
                <span style={{ color: s.accent }} className="font-medium">{s.kind}</span>
                {s.grade && (
                  <span className="text-[10px] text-[#6D28D9] font-medium">· {s.grade}</span>
                )}
              </div>
              <div className="text-base font-medium text-black/85 truncate">{s.title}</div>
            </div>
            <span className="text-xs font-mono text-black/40 flex-shrink-0">{s.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────── concrete exam data ─────── */
function ExamData() {
  const items = [
    { exam: "2025 수능 미적분 12번", pattern: "곡선 밖 접선", correct: 61, killer: false },
    { exam: "2024 9모 미적분 14번", pattern: "곡선 밖 접선", correct: 44, killer: false },
    { exam: "2023 수능 미적분 15번", pattern: "그래프 개형", correct: 38, killer: true },
    { exam: "2024 수능 미적분 21번", pattern: "정적분 + 미분 결합", correct: 12, killer: true },
    { exam: "2022 9모 미적분 11번", pattern: "극값 활용", correct: 57, killer: false },
    { exam: "2025 수능 미적분 22번", pattern: "그래프 + 실근 개수", correct: 9, killer: true },
  ];

  return (
    <section className="px-6 py-28 border-t border-black/10">
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-14 max-w-[640px]">
          <div className="text-xs text-black/45 font-medium mb-4">04 데이터</div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] leading-[1.15] break-keep mb-5">
            최근 5개년 수능·6모·9모를 모두 분류해 뒀어요.
          </h2>
          <p className="text-base text-black/65 leading-relaxed break-keep">
            모든 문항을 <strong className="text-black/85">320개 출제 유형</strong>으로 분류하고,
            EBSi 정답률·평균 풀이 시간을 메타로 붙여서 여러분의 풀이와 비교합니다.
            현재 <strong className="text-black/85">2,800문항</strong> 분석 완료.
          </p>
        </div>

        {/* editorial table — no card, hairline rules */}
        <div>
          <div className="grid grid-cols-12 gap-4 pb-2 text-[10px] uppercase tracking-widest text-black/40 font-medium border-b border-black/15">
            <div className="col-span-5">시험·문항</div>
            <div className="col-span-5">유형</div>
            <div className="col-span-2 text-right">EBSi 정답률</div>
          </div>
          {items.map((it, i) => (
            <div
              key={i}
              className="grid grid-cols-12 gap-4 py-3.5 text-sm border-b border-black/8"
            >
              <div className="col-span-5 font-mono text-black/80">{it.exam}</div>
              <div className="col-span-5 flex items-center gap-2">
                <span className="text-black/75">{it.pattern}</span>
                {it.killer && (
                  <span className="text-[10px] text-[#CA8A04] font-semibold">— 킬러</span>
                )}
              </div>
              <div className="col-span-2 text-right font-mono">
                <span
                  className={
                    it.correct < 30
                      ? "text-[#E11D48] font-semibold"
                      : it.correct < 50
                        ? "text-[#CA8A04]"
                        : "text-black/65"
                  }
                >
                  {it.correct}%
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-[11px] text-black/40">
          외 2,794문항. 5월 3일 기준.
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── founder letter ──────── */
function FounderLetter() {
  return (
    <section className="px-6 py-28">
      <div className="max-w-[760px] mx-auto">
        <div className="text-xs text-black/45 font-medium mb-2">메이커의 편지</div>
        <div className="text-base font-medium text-black/80 mb-10">정현 — 前 N수생</div>
        <div>
          <div className="space-y-4 text-base leading-[1.7] text-black/80 break-keep">
            <p>
              제가 N수를 했을 때, 같은 유형 문제를 세 번 틀렸어요. 학원에서는
              "미적분이 약하니까 미적분 문제집 한 권 더" 라고 했는데, 실은
              그게 아니었어요.
            </p>
            <p>
              결국 시험 끝난 뒤에야 알아챘어요 — 진짜 원인은
              <strong className="text-black"> 4년 전 중3 때 판별식</strong>이었어요.
              곡선과 직선이 한 점에서 만난다는 조건을 D=0으로 옮기는 그 한 단계가
              안 떠올랐던 거예요. 미분 공부를 아무리 해도 안 풀리는 게 당연했죠.
            </p>
            <p>
              그래서 <strong className="text-black">"맞은 문제도 왜 헷갈렸는지까지"</strong>,
              그리고 <strong className="text-black">"진짜 원인이 4년 전 단원이라도"</strong>
              찾아주는 코치를 만들고 싶었어요. 풀이 데이터로 그게 가능하더라고요.
            </p>
            <p className="text-black/65 text-sm">
              여러분의 시험까지 남은 시간을, 가장 효율적으로 쓰는 데 도움이 되면 좋겠어요.
            </p>
          </div>

          {/* signature */}
          <div className="mt-8 flex items-center gap-3">
            <SignatureMark />
            <div className="text-[11px] text-black/45">
              2026년 5월, 정현
            </div>
          </div>

          {/* soft CTA */}
          <div className="mt-12 pt-8 border-t border-black/10">
            <Link
              href="/v2/onboard/profile"
              className="inline-flex items-center gap-2 text-sm text-[#15803D] hover:underline"
            >
              제가 만든 코치, 한번 써보세요 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SignatureMark() {
  return (
    <svg viewBox="0 0 120 50" className="h-12" aria-hidden>
      <path
        d="M 8 30 C 12 20, 22 10, 30 18 S 40 32, 50 22 C 58 14, 70 18, 78 28 C 84 36, 92 24, 100 20 L 110 18"
        stroke="#1A1A2E"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M 22 38 L 96 36"
        stroke="#1A1A2E"
        strokeWidth="0.8"
        fill="none"
        strokeLinecap="round"
        opacity="0.4"
      />
    </svg>
  );
}

/* ────────────────────────────────────── footer ───────── */
function Footer() {
  return (
    <footer className="border-t border-black/5 px-6 py-10">
      <div className="max-w-[1100px] mx-auto flex flex-wrap items-center justify-between gap-4 text-[11px] text-black/45">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-[0.18em]">DEEPEN<span className="opacity-50">.LAB</span></span>
          <span>·</span>
          <span>입시 학습 코치</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-black/70 transition">소개</a>
          <a href="#" className="hover:text-black/70 transition">도움말</a>
          <a href="#" className="hover:text-black/70 transition">개인정보</a>
          <a href="#" className="hover:text-black/70 transition">약관</a>
        </div>
        <div>© 2026 Deepen Lab</div>
      </div>
    </footer>
  );
}

/* ════════════════════════════════════════════════════════════════
   Visual mocks — browser frame + product snapshots
   ════════════════════════════════════════════════════════════════ */

function BrowserFrame({
  children,
}: {
  children: React.ReactNode;
  tinted?: boolean;
}) {
  // editorial: no chrome, no rounded card. just the artwork on the page.
  return <div className="relative">{children}</div>;
}

/* mini /v2/graph snapshot */
function GraphSnapshot() {
  return (
    <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-[#F0FDF4] via-white to-white p-3 relative overflow-hidden">
      <svg viewBox="0 0 500 300" className="w-full h-full">
        {/* edges */}
        {[
          [80, 180, 200, 130, false],
          [80, 180, 200, 220, false],
          [200, 130, 320, 100, false],
          [200, 130, 320, 170, true],
          [200, 220, 320, 170, true],
          [320, 170, 420, 140, false],
        ].map(([x1, y1, x2, y2, weak], i) => (
          <line
            key={i}
            x1={x1 as number}
            y1={y1 as number}
            x2={x2 as number}
            y2={y2 as number}
            stroke={weak ? "#E11D48" : "#CBD5E1"}
            strokeWidth={weak ? 1.5 : 1}
            strokeOpacity={weak ? 0.5 : 0.5}
          />
        ))}

        {/* nodes */}
        {[
          { x: 80, y: 180, label: "미분계수", r: 24 },
          { x: 200, y: 130, label: "곡선 위 접선", r: 22, mastery: 0.82 },
          { x: 200, y: 220, label: "미분 활용", r: 24, mastery: 0.55 },
          { x: 320, y: 100, label: "극값", r: 22, mastery: 0.66 },
          { x: 320, y: 170, label: "곡선 밖 접선", r: 22, weak: true },
          { x: 420, y: 140, label: "25 수능 N12", r: 16, item: true },
        ].map((n, i) => (
          <g key={i}>
            {n.weak && (
              <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="#E11D48" strokeWidth="1" strokeOpacity="0.4" />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill="white"
              stroke={n.weak ? "#FECDD3" : "#E2E8F0"}
              strokeWidth="1.2"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.06))" }}
            />
            {n.mastery && (
              <path
                d={describeArc(n.x, n.y, n.r - 3, -90, -90 + 360 * n.mastery)}
                fill="none"
                stroke={n.weak ? "#E11D48" : "#15803D"}
                strokeWidth="2.25"
                strokeLinecap="round"
              />
            )}
            <text
              x={n.x}
              y={n.y + n.r + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#1A1A2E"
              fillOpacity="0.78"
              fontWeight="600"
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>

      {/* layer toggle floating */}
      <div className="absolute bottom-3 left-3 rounded-lg border border-black/8 bg-white/95 backdrop-blur shadow-sm px-2 py-1.5 flex items-center gap-1.5 text-[10px]">
        <Target size={9} className="text-[#E11D48]" />
        <span className="font-semibold text-black/80">약점 레이어 ON</span>
      </div>

      {/* fake selected tag */}
      <div className="absolute top-3 right-3 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700 font-semibold">
        내 약점 — 41%
      </div>
    </div>
  );
}

/* mini prereq tracing snapshot */
function PrereqSnapshot() {
  return (
    <div className="aspect-[16/10] rounded-lg bg-gradient-to-br from-[#FAF5FF] via-white to-white p-3 relative overflow-hidden">
      <svg viewBox="0 0 500 300" className="w-full h-full">
        {/* path edges */}
        <line x1={70} y1={150} x2={180} y2={120} stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1={180} y1={120} x2={300} y2={150} stroke="#7C3AED" strokeWidth="1.5" strokeOpacity="0.5" />
        <line x1={300} y1={150} x2={420} y2={150} stroke="#E11D48" strokeWidth="1.5" strokeOpacity="0.55" />

        {/* dotted backward arrow */}
        <line x1={420} y1={120} x2={70} y2={120} stroke="#7C3AED" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="4 4" />

        {/* nodes */}
        {[
          { x: 70, y: 150, label: "판별식", grade: "중3", gap: true },
          { x: 180, y: 120, label: "함수값 대입", grade: "고1" },
          { x: 300, y: 150, label: "미분계수", grade: "수학Ⅱ" },
          { x: 420, y: 150, label: "곡선 밖 접선", weak: true },
        ].map((n, i) => (
          <g key={i}>
            {n.weak && (
              <circle cx={n.x} cy={n.y} r={28} fill="none" stroke="#E11D48" strokeWidth="1" strokeOpacity="0.4" />
            )}
            {n.gap && (
              <circle cx={n.x} cy={n.y} r={28} fill="none" stroke="#7C3AED" strokeWidth="1" strokeOpacity="0.45" />
            )}
            <circle
              cx={n.x}
              cy={n.y}
              r={22}
              fill="white"
              stroke={n.weak ? "#FECDD3" : n.gap ? "#DDD6FE" : "#E2E8F0"}
              strokeWidth="1.2"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.06))" }}
            />
            {n.gap && (
              <g transform={`translate(${n.x + 16}, ${n.y - 16})`}>
                <circle r="7" fill="#7C3AED" />
                <text x="0" y="3" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">
                  !
                </text>
              </g>
            )}
            {n.grade && (
              <g transform={`translate(${n.x}, ${n.y - 36})`}>
                <rect x="-15" y="-7" width="30" height="13" rx="6.5" fill={n.gap ? "#F5F3FF" : "white"} stroke={n.gap ? "#DDD6FE" : "#E2E8F0"} strokeWidth="0.7" />
                <text x="0" y="2" textAnchor="middle" fontSize="8" fill={n.gap ? "#6D28D9" : "#475569"} fontWeight="700">
                  {n.grade}
                </text>
              </g>
            )}
            <text
              x={n.x}
              y={n.y + 38}
              textAnchor="middle"
              fontSize="10"
              fill="#1A1A2E"
              fillOpacity="0.78"
              fontWeight="600"
            >
              {n.label}
            </text>
          </g>
        ))}

        {/* "역추적" label on dotted arrow */}
        <text x={250} y={108} textAnchor="middle" fontSize="9" fill="#7C3AED" fontWeight="700">
          ← 역추적
        </text>
      </svg>

      {/* floating callout */}
      <div className="absolute top-3 right-3 rounded-md border border-[#7C3AED]/30 bg-[#FAF5FF] px-2.5 py-1.5 text-[10px] font-semibold flex items-center gap-1.5">
        <AlertTriangle size={10} className="text-[#7C3AED]" />
        <span className="text-[#6D28D9]">결손 의심: 판별식</span>
      </div>
    </div>
  );
}

/* ─── arc helper ─── */
function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}
