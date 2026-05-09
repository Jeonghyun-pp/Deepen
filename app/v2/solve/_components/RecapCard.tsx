"use client"

/**
 * 리캡카드 — 단일 카드 (B-6 명명 lock).
 * Spec: docs/build-spec/07-q1-build.md M1.4, deck Slide 9 디자인.
 *
 * 구조:
 *   헤더: 학년 배지 + Pattern 이름 + N분 표기
 *   본문: 왜 필요한가 (1줄) + 핵심 3줄
 *   퀴즈: RecapQuizInput
 *   푸터: "원래 문제로 돌아가기" CTA (퀴즈 통과 후 활성)
 */

import type { RecapCardPayload } from "@/lib/api/schemas/recap"
import { RecapQuizInput } from "./RecapQuizInput"

export interface RecapCardProps {
  card: RecapCardPayload
  /** 퀴즈 통과 시 호출. 클라가 onReturn 으로 원래 문제 복귀. */
  onPassed: () => void
  onReturn: () => void
  /** 외부에서 통과 상태 hoist 가 필요한 경우. */
  passed: boolean
}

export function RecapCard({
  card,
  onPassed,
  onReturn,
  passed,
}: RecapCardProps) {
  return (
    <article
      className="w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-xl"
      data-testid="recap-card"
    >
      <header className="mb-4 flex items-center gap-2">
        <span
          className="rounded bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-900"
          data-testid="recap-grade-badge"
        >
          {card.grade}
        </span>
        <h3 className="flex-1 text-lg font-semibold text-black/90">{card.name}</h3>
        <span className="text-[11px] text-amber-700">{card.durationMin}분</span>
      </header>

      <p className="mb-4 text-sm leading-6 text-amber-900/85">
        <span className="font-medium text-amber-900">왜 필요한가 — </span>
        {card.whyNeeded}
      </p>

      <ul className="mb-5 space-y-2 rounded-lg border border-amber-100 bg-white/60 p-4">
        {card.coreBullets.map((b, i) => (
          <li
            key={i}
            className="flex gap-2 text-sm leading-6 text-black/85"
            data-testid={`recap-bullet-${i}`}
          >
            <span className="text-amber-700">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <RecapQuizInput
        patternId={card.patternId}
        quiz={card.checkQuiz}
        onPassed={onPassed}
        passed={passed}
      />

      <footer className="mt-5 flex items-center justify-end">
        <button
          type="button"
          onClick={onReturn}
          disabled={!passed}
          data-testid="recap-return"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          원래 문제로 돌아가기 →
        </button>
      </footer>
    </article>
  )
}
