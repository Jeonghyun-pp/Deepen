"use client"

/**
 * 모드 선택 — 4종 chip.
 * Spec: docs/build-spec/06-state-machines.md §6, 08-q2-build.md M2.5.
 *
 * Q2 활성: practice / exam / recovery
 * Q3 예정: challenge / retry (challenge 는 M3.2, retry 는 recap 통과 후 자동)
 */

import Link from "next/link"

interface ModeOption {
  key: "practice" | "exam" | "recovery" | "challenge" | "retry"
  label: string
  desc: string
  href: string | null
  enabled: boolean
}

const MODES: ModeOption[] = [
  {
    key: "practice",
    label: "연습",
    desc: "자유 풀이 + 막히면 코치",
    href: null, // 단원 카드 main CTA 가 practice
    enabled: true,
  },
  {
    key: "exam",
    label: "실전",
    desc: "시간 압박 · 힌트·코치 X · 일괄 채점",
    href: null,
    enabled: true,
  },
  {
    key: "recovery",
    label: "오답복구",
    desc: "틀렸던 문제 다시 + 유사 자동 추천",
    href: "/v2/recovery",
    enabled: true,
  },
  {
    key: "challenge",
    label: "챌린지",
    desc: "유형 5연속 정답 도전 (각 Pattern 옆 →)",
    href: null,
    // M3.2: 진입은 Pattern 카드의 "챌린지 →" 버튼으로 함. 모드 카드는 안내만.
    enabled: false,
  },
]

export interface ModeSelectorProps {
  unitId: string
  firstItemId: string | null
}

export function ModeSelector({ unitId, firstItemId }: ModeSelectorProps) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-black/80">학습 모드</h2>
        <span className="text-[11px] text-black/45">
          한 단원에서 4가지 방식
        </span>
      </header>

      <ul
        className="grid gap-2 sm:grid-cols-2"
        data-testid="mode-selector"
      >
        {MODES.map((m) => {
          const href =
            m.key === "practice" || m.key === "exam"
              ? firstItemId
                ? m.key === "exam"
                  ? `/v2/exam/${unitId}`
                  : `/v2/solve/${firstItemId}`
                : null
              : m.href

          if (!m.enabled || !href) {
            return (
              <li
                key={m.key}
                className="flex flex-col gap-0.5 rounded-lg border border-dashed border-black/10 bg-zinc-50 px-3 py-2.5 opacity-70"
                data-testid={`mode-${m.key}-disabled`}
                title={
                  m.key === "challenge"
                    ? "Pattern 옆 '챌린지 →' 버튼으로 진입"
                    : !m.enabled
                      ? "Q3 예정"
                      : "콘텐츠 시드 후 활성"
                }
              >
                <span className="text-sm font-medium text-black/55">
                  {m.label}
                  <span className="ml-1 text-[10px] text-black/35">
                    {m.key === "challenge"
                      ? "유형별 →"
                      : !m.enabled
                        ? "Q3"
                        : "준비 중"}
                  </span>
                </span>
                <span className="text-[11px] text-black/45">{m.desc}</span>
              </li>
            )
          }

          return (
            <li key={m.key}>
              <Link
                href={href}
                data-testid={`mode-${m.key}`}
                className="group flex flex-col gap-0.5 rounded-lg border border-black/10 bg-white px-3 py-2.5 transition hover:border-black/30 hover:bg-black/[0.02]"
              >
                <span className="text-sm font-medium text-black/85 group-hover:text-black">
                  {m.label}
                </span>
                <span className="text-[11px] text-black/55">{m.desc}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
