/**
 * Bayesian Network 의 CPT (Conditional Probability Table) — noisy-AND.
 * Spec: docs/build-spec/04-algorithms.md §3.2.
 *
 * 노드: 각 Pattern 의 mastery ∈ {1: 숙련, 0: 결손}.
 *
 * CPT (lock):
 *   P(C=1 | parents 모두 mastered)        = 0.9
 *   P(C=1 | 일부 parent 만 mastered)       = 0.9 · ∏_{p ∉ K} 0.1
 *     (K = mastered parent set. failed parent 마다 0.1 곱.)
 *   parents 가 비어 있으면 (root)          = 0.5 (사전)
 *
 * Observation likelihood (lock):
 *   P(label='correct' | mastery=1) = 0.85
 *   P(label='correct' | mastery=0) = 0.15
 *   P(label='unsure'  | mastery=1) = 0.35
 *   P(label='unsure'  | mastery=0) = 0.40
 *   P(label='wrong'   | mastery=1) = 0.15
 *   P(label='wrong'   | mastery=0) = 0.85
 */

export const ROOT_PRIOR = 0.5
export const NOISY_AND_BASE = 0.9
export const FAILED_PARENT_FACTOR = 0.1

export type Mastery = 0 | 1
export type ObsLabel = "correct" | "unsure" | "wrong"

/**
 * P(C=mastery | parents = mastered set) under noisy-AND.
 *
 * @param mastery       대상 노드의 가설 mastery (0 또는 1)
 * @param numParents    부모 노드 총 개수
 * @param mastered      부모 중 mastered=1 인 개수
 */
export function cpt(
  mastery: Mastery,
  numParents: number,
  mastered: number,
): number {
  if (numParents === 0) {
    return mastery === 1 ? ROOT_PRIOR : 1 - ROOT_PRIOR
  }
  const failed = numParents - mastered
  const probMastered =
    NOISY_AND_BASE * Math.pow(FAILED_PARENT_FACTOR, failed)
  return mastery === 1 ? probMastered : 1 - probMastered
}

const OBS_LIKELIHOOD: Record<ObsLabel, [number, number]> = {
  // [P(obs|m=0), P(obs|m=1)]
  correct: [0.15, 0.85],
  unsure: [0.4, 0.35],
  wrong: [0.85, 0.15],
}

export function obsLikelihood(label: ObsLabel, mastery: Mastery): number {
  return OBS_LIKELIHOOD[label][mastery]
}
