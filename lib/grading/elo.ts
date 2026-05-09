/**
 * Pattern 단위 숙련도 갱신 — Elo 변형.
 *
 * Spec: docs/build-spec/04-algorithms.md §2.
 * theta·beta 는 0~1 정규화. 내부 연산은 Elo (1500±200) 기준.
 *
 * label_score:
 *   correct = 1.0 / unsure = 0.6 / wrong = 0.0
 *
 * Q1 콜드스타트:
 *   thetaUser 첫 attempt = 0.5
 *   betaPattern 첫 등장 = avg(items.itemDifficulty) 또는 0.5
 *   M4.6 pre-test diagnostic 도입 시 다른 초기화.
 */

export const ELO_K = 32

const ELO_CENTER = 1500
const ELO_SCALE = 200

const clamp01 = (v: number, eps = 1e-6) =>
  Math.min(1 - eps, Math.max(eps, v))

export function eloToTheta(elo: number): number {
  return 1 / (1 + Math.exp(-(elo - ELO_CENTER) / ELO_SCALE))
}

export function thetaToElo(theta: number): number {
  const t = clamp01(theta)
  return ELO_CENTER + ELO_SCALE * Math.log(t / (1 - t))
}

export type EloLabel = "correct" | "unsure" | "wrong"

export const labelToScore = (label: EloLabel): number =>
  label === "correct" ? 1.0 : label === "unsure" ? 0.6 : 0.0

export interface EloUpdateInput {
  thetaUser: number // 0~1 (현재)
  betaPattern: number // 0~1 (현재)
  label: EloLabel
  k?: number
}

export interface EloUpdateResult {
  thetaUser: number
  betaPattern: number
  expected: number
  delta: number
}

/**
 * 1회 attempt 기준 사용자 능력 + Pattern 난이도 동시 갱신.
 *
 * expected = 1 / (1 + 10^((eloPattern - eloUser) / 400))
 *   → 사용자가 풀어낼 확률.
 *   delta = K · (label_score - expected)
 *
 * thetaUser 는 +delta, betaPattern 은 -delta. (정답이면 사용자 ↑, Pattern 난이도 ↓.)
 */
export function updateElo(input: EloUpdateInput): EloUpdateResult {
  const { thetaUser, betaPattern, label } = input
  const k = input.k ?? ELO_K

  const eloUser = thetaToElo(thetaUser)
  const eloPattern = thetaToElo(betaPattern)

  const expected = 1 / (1 + Math.pow(10, (eloPattern - eloUser) / 400))
  const score = labelToScore(label)
  const delta = k * (score - expected)

  return {
    thetaUser: eloToTheta(eloUser + delta),
    betaPattern: eloToTheta(eloPattern - delta),
    expected,
    delta,
  }
}
