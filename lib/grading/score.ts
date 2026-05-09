/**
 * 3분기 채점 — 정답 / 오답 / "정답이지만 헷갈림".
 *
 * Spec: docs/build-spec/04-algorithms.md §1, §1.5.
 *      docs/build-spec/12-acceptance.md §9.1 (단위 테스트 lock).
 *
 * confidence_score 가중 합산 (lock):
 *   cs = 1·correct
 *      - 0.3·max(0, timeZ)
 *      - 0.4·hintsUsed
 *      - 0.2·aiQuestions
 *      - 0.5·1[selfConfidence='unsure']
 *
 * 분류:
 *   correct=false      → 'wrong'
 *   correct=true, cs≥0.6 → 'correct'
 *   correct=true, cs<0.6 → 'unsure'   (정답이지만 헷갈림 = deck Slide 10 핵심)
 *
 * timeZ 는 caller 가 미리 계산해서 signals 안에 넣어 호출.
 *   (cohort 평균은 lib/grading/time-stats.ts 의 getItemTimeStat 사용)
 */

import type { ReasonTag } from "@/lib/db/schema"

export const W = {
  correct: 1.0,
  time: 0.3,
  hints: 0.4,
  ai: 0.2,
  conf: 0.5,
} as const

export const TAU_HIGH = 0.6

export type SelfConfidence = "sure" | "mid" | "unsure"
export type AttemptLabel = "correct" | "wrong" | "unsure"

export interface AttemptSignals {
  /** 객관식 정답 비교 결과 (서버 측 판단). */
  correct: boolean
  /** 풀이 시간 — 클라 타이머. ms. */
  timeMs: number
  /** cohort 평균 대비 z-score. caller 가 미리 계산. */
  timeZ: number
  hintsUsed: number
  /** 해당 attempt 동안 AI 코치 호출 횟수. */
  aiQuestions: number
  selfConfidence: SelfConfidence
}

export interface ItemTimeStat {
  meanMs: number
  /** 표준편차 (ms). 0 또는 너무 작으면 1로 floor. */
  stdMs: number
}

/** signals.timeZ 를 외부에서 계산할 때 쓰는 헬퍼. */
export const timeZ = (timeMs: number, stat: ItemTimeStat): number =>
  (timeMs - stat.meanMs) / Math.max(stat.stdMs, 1)

/**
 * cohort 데이터 부족 시 fallback. difficulty 0~1 기준 1~3분.
 * Spec §1.2: FALLBACK_TIME_MS = 60000 + difficulty·120000, FALLBACK_STD = 30000.
 */
export const fallbackTimeStat = (difficulty: number | null): ItemTimeStat => ({
  meanMs: 60_000 + (difficulty ?? 0.5) * 120_000,
  stdMs: 30_000,
})

export const COHORT_MIN_N = 5

export function confidenceScore(s: AttemptSignals): number {
  return (
    W.correct * (s.correct ? 1 : 0) -
    W.time * Math.max(0, s.timeZ) -
    W.hints * s.hintsUsed -
    W.ai * s.aiQuestions -
    W.conf * (s.selfConfidence === "unsure" ? 1 : 0)
  )
}

export interface ClassifyResult {
  label: AttemptLabel
  confidenceScore: number
}

export function classifyAttempt(s: AttemptSignals): ClassifyResult {
  const cs = confidenceScore(s)

  let label: AttemptLabel
  if (!s.correct) {
    label = "wrong"
  } else if (cs >= TAU_HIGH) {
    label = "correct"
  } else {
    label = "unsure"
  }

  return { label, confidenceScore: cs }
}

/**
 * 룰 기반 reason_tags. 즉시 부여.
 *
 * 비동기 AI 분류(M2.4)가 추가로 reason 더 붙임 (concept_lack /
 * pattern_misrecognition / approach_error / calculation_error /
 * condition_misread / graph_misread / logic_leap).
 */
export function ruleBaseTags(args: {
  signals: AttemptSignals
  /** Phase 3 BN 최대 결손 확률. 없으면 0 (M1.4 stub 단계). */
  bnMaxP?: number
}): ReasonTag[] {
  const tags: ReasonTag[] = []
  if (args.signals.timeZ > 2) tags.push("time_overrun")
  if (args.signals.hintsUsed > 0) tags.push("hint_dependent")
  if ((args.bnMaxP ?? 0) >= 0.6) tags.push("prereq_deficit")
  return tags
}
