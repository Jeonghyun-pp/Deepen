/**
 * Deficit boost — 04 §4.3 EPSILON = 0.10.
 *
 * Item 이 사용자의 결손 Pattern (prereq_deficit_log 누적 deficit_probability)
 * 을 건드리면 가중. clamp [0, 1].
 *
 *   deficitBoost(item, user) = min(1, Σ_{p ∈ requiresPrereq} deficitMap.get(p))
 */
export interface UserDeficit {
  /** patternId → deficit_probability (0~1). 미관측 시 0. */
  deficitByPattern: Map<string, number>
}

export function deficitBoost(args: {
  itemRequiresPrereq: string[]
  user: UserDeficit
}): number {
  const { itemRequiresPrereq, user } = args
  if (itemRequiresPrereq.length === 0) return 0
  let boost = 0
  for (const pid of itemRequiresPrereq) {
    boost += user.deficitByPattern.get(pid) ?? 0
  }
  return Math.min(1, boost)
}
