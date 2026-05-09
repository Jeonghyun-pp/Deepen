/**
 * 그래프 노드 시각 인코딩 — pure function.
 * Spec: docs/build-spec/04-algorithms.md §8, deck Slide 8 노드 5종 상태.
 *
 * 입력: GraphNode + UserState (마스터리/이력).
 * 출력: VisualAttrs (fillColor·strokeColor·badge 등).
 *
 * 규칙 (우선순위 순):
 *   미학습 (attempt 0)        → 회색 점선
 *   안정 숙련 (theta ≥ 0.7)    → 초록 (반복 오답 시 경고 아이콘)
 *   정답률 낮음 (avgCorrect<0.5) → 노란색
 *   기본 — 빈출/누적결손/킬러     → 진한·옅은 + 점선/실선 + 빨강 테두리
 */

export interface GraphNodeForEncode {
  id: string
  type: "pattern" | "item"
  isKiller: boolean
  frequencyRank: number | null
  avgCorrectRate: number | null
}

export interface UserStateForEncode {
  /** Pattern 별 마스터리 (theta 0~1). 없는 키는 미학습. */
  masteryByPattern: Record<string, { theta: number; beta: number }>
  /** Pattern 별 누적 attempt 수. */
  attemptCountByPattern: Record<string, number>
  /** 누적 결손 의심 Pattern ID 집합 (Q2 BN cumulative). */
  deficitCandidates: string[]
  /** Pattern 별 최근 wrongStreak (M1.6 demo: 최근 3 attempt 중 wrong 개수). */
  recentWrongStreak: Record<string, number>
}

export interface VisualAttrs {
  fillColor: string
  strokeColor: string
  strokeStyle: "solid" | "dashed"
  borderColor?: string
  badgeIcon?: "warning" | "killer"
  opacity: number
}

// 임계 (04-algorithms §9 lock)
export const THETA_GREEN = 0.7
export const AVG_CORRECT_RATE_YELLOW = 0.5
export const FREQ_RANK_DARK = 10

const COLORS = {
  unlearned: "#E5E5E5",
  killer: "#DC2626",
  yellow: "#FACC15",
  emerald: "#16A34A",
  blueDark: "#1E40AF",
  blueLight: "#60A5FA",
  blueStroke: "#3B82F6",
  amberStroke: "#F97316",
} as const

export function encodeVisual(
  node: GraphNodeForEncode,
  user: UserStateForEncode,
): VisualAttrs {
  const attemptCount = user.attemptCountByPattern[node.id] ?? 0
  const theta = user.masteryByPattern[node.id]?.theta
  const isCumulativeDeficit = user.deficitCandidates.includes(node.id)
  const recentWrong = user.recentWrongStreak[node.id] ?? 0

  // 1) 미학습
  if (attemptCount === 0) {
    return {
      fillColor: COLORS.unlearned,
      strokeColor: COLORS.unlearned,
      strokeStyle: "dashed",
      opacity: 0.7,
    }
  }

  // 2) 안정 숙련
  if (theta !== undefined && theta >= THETA_GREEN) {
    return {
      fillColor: COLORS.emerald,
      strokeColor: COLORS.emerald,
      strokeStyle: "solid",
      badgeIcon: recentWrong >= 2 ? "warning" : undefined,
      opacity: 1,
    }
  }

  // 3) 정답률 낮음 (콘텐츠 메타)
  if (
    node.avgCorrectRate !== null &&
    node.avgCorrectRate < AVG_CORRECT_RATE_YELLOW
  ) {
    return {
      fillColor: COLORS.yellow,
      strokeColor: COLORS.yellow,
      strokeStyle: "solid",
      borderColor: node.isKiller ? COLORS.killer : undefined,
      opacity: 1,
    }
  }

  // 4) 기본 — 빈출/누적 결손/킬러 조합
  const isFrequent = (node.frequencyRank ?? 999) <= FREQ_RANK_DARK
  const fillColor = isFrequent ? COLORS.blueDark : COLORS.blueLight
  const strokeColor = isCumulativeDeficit
    ? COLORS.amberStroke
    : COLORS.blueStroke

  return {
    fillColor,
    strokeColor,
    strokeStyle: isCumulativeDeficit ? "dashed" : "solid",
    borderColor: node.isKiller ? COLORS.killer : undefined,
    opacity: 1,
  }
}
