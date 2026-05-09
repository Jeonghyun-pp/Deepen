/**
 * Weakness alignment — 04 §4.3 DELTA = 0.15.
 *
 * Item 이 사용자의 약점 Pattern 을 건드리는 정도.
 *   weaknessAlignment(item, user)
 *     = (1/|item.patternIds|) · Σ_{p ∈ patternIds} (1 - theta(p))
 *
 * theta 가 낮을수록 약점이라는 가정. patternIds 가 비어 있으면 0.
 */
export interface UserMastery {
  /** patternId → theta (0~1). 미관측 시 default 0.5. */
  thetaByPattern: Map<string, number>
}

const DEFAULT_THETA = 0.5

export function weaknessAlignment(args: {
  itemPatternIds: string[]
  user: UserMastery
}): number {
  const { itemPatternIds, user } = args
  if (itemPatternIds.length === 0) return 0
  let sum = 0
  for (const pid of itemPatternIds) {
    const theta = user.thetaByPattern.get(pid) ?? DEFAULT_THETA
    sum += 1 - theta
  }
  return sum / itemPatternIds.length
}
