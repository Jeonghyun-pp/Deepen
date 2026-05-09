/**
 * LLM 응답 schema 위반 등 실패 시 fallback 카드.
 * Spec: docs/build-spec/05-llm-prompts.md §3 fallback.
 *
 * Pattern signature 를 그대로 bullet 화. 사용자에게는 "임시 카드" 문구 노출 X
 * (서비스가 자동 처리하는 것처럼). 서버 텔레메트리에서 fallback 사용 카운트만.
 */

import type { RecapCard } from "./types"

export interface FallbackInput {
  patternId: string
  patternLabel: string
  grade: string | null
  signature: string[] | null
  triggerItemId: string
}

export function fallbackRecapCard(input: FallbackInput): RecapCard {
  const sig = input.signature ?? []
  const bullets: [string, string, string] = [
    sig[0] ?? input.patternLabel,
    sig[1] ?? "이 유형의 핵심 조건을 다시 확인해 보세요.",
    sig[2] ?? "원래 문제로 돌아가 같은 조건을 적용해 보세요.",
  ]

  return {
    patternId: input.patternId,
    grade: input.grade ?? "기초",
    name: input.patternLabel.slice(0, 30),
    durationMin: 2,
    whyNeeded: `${input.patternLabel} 결손 의심 — 현재 문제 핵심 조건 활용에 필요합니다.`,
    coreBullets: bullets,
    checkQuiz: {
      question: `${input.patternLabel} 의 핵심 조건을 한 줄로 적어 보세요.`,
      answer: "_open_",
      hint: sig[0] ?? "방금 본 정의를 떠올려 보세요.",
    },
    triggerItemId: input.triggerItemId,
  }
}
