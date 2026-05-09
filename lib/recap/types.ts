/**
 * 리캡카드 + 진단 결과 공용 타입.
 * Spec: docs/build-spec/04-algorithms.md §3, §5.
 */

export interface DiagnosisCandidate {
  patternId: string
  patternLabel: string
  grade: string | null
  signature: string[] | null
  /** 0~1, 결손 추정 확률. */
  deficitProb: number
}

export interface Diagnosis {
  recapNeeded: boolean
  candidates: DiagnosisCandidate[]
}

/**
 * 리캡카드 — deck Slide 9 디자인 lock (B-6 "리캡카드" 명명).
 * 04-algorithms §5.2.
 */
export interface RecapCard {
  patternId: string
  grade: string
  name: string
  durationMin: 1 | 2 | 3
  whyNeeded: string
  coreBullets: [string, string, string]
  checkQuiz: { question: string; answer: string; hint: string }
  /** 카드 통과 후 복귀할 원래 문제 itemId. */
  triggerItemId: string
}

/** Q1 임계 (04-algorithms §3.4 lock). */
export const TAU_RECAP = 0.6
/** Q1 단일 카드만 (시퀀스는 Q2). */
export const MAX_RECAP_CARDS_Q1 = 1
