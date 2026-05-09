/**
 * lib/graph/encode-visual.ts — 6 케이스 lock.
 * Spec: docs/build-spec/04-algorithms.md §8, deck Slide 8 노드 5종 상태.
 */

import { describe, expect, it } from "vitest"
import {
  encodeVisual,
  THETA_GREEN,
  type GraphNodeForEncode,
  type UserStateForEncode,
} from "@/lib/graph/encode-visual"

const baseNode: GraphNodeForEncode = {
  id: "p1",
  type: "pattern",
  isKiller: false,
  frequencyRank: null,
  avgCorrectRate: null,
}

const emptyState: UserStateForEncode = {
  masteryByPattern: {},
  attemptCountByPattern: {},
  deficitCandidates: [],
  recentWrongStreak: {},
}

describe("encodeVisual", () => {
  it("1. 미학습 (attempt 0) → 회색 점선", () => {
    const v = encodeVisual(baseNode, emptyState)
    expect(v.fillColor).toBe("#E5E5E5")
    expect(v.strokeStyle).toBe("dashed")
    expect(v.opacity).toBeCloseTo(0.7, 6)
  })

  it("2. 안정 숙련 (theta=0.8) → 초록", () => {
    const state: UserStateForEncode = {
      ...emptyState,
      masteryByPattern: { p1: { theta: 0.8, beta: 0.5 } },
      attemptCountByPattern: { p1: 5 },
    }
    const v = encodeVisual(baseNode, state)
    expect(v.fillColor).toBe("#16A34A")
    expect(v.strokeStyle).toBe("solid")
    expect(v.badgeIcon).toBeUndefined()
  })

  it("3. 안정 숙련 + 최근 wrongStreak 2 → 초록 + warning 배지", () => {
    const state: UserStateForEncode = {
      ...emptyState,
      masteryByPattern: { p1: { theta: 0.85, beta: 0.5 } },
      attemptCountByPattern: { p1: 8 },
      recentWrongStreak: { p1: 2 },
    }
    const v = encodeVisual(baseNode, state)
    expect(v.badgeIcon).toBe("warning")
  })

  it("4. theta < 0.7 + avgCorrectRate < 0.5 → 노란색", () => {
    const node: GraphNodeForEncode = {
      ...baseNode,
      avgCorrectRate: 0.3,
    }
    const state: UserStateForEncode = {
      ...emptyState,
      masteryByPattern: { p1: { theta: 0.4, beta: 0.5 } },
      attemptCountByPattern: { p1: 3 },
    }
    const v = encodeVisual(node, state)
    expect(v.fillColor).toBe("#FACC15")
  })

  it("5. 빈출(rank<=10) → 진한 파랑, killer → 빨강 테두리", () => {
    const node: GraphNodeForEncode = {
      ...baseNode,
      frequencyRank: 3,
      isKiller: true,
    }
    const state: UserStateForEncode = {
      ...emptyState,
      masteryByPattern: { p1: { theta: 0.4, beta: 0.5 } },
      attemptCountByPattern: { p1: 1 },
    }
    const v = encodeVisual(node, state)
    expect(v.fillColor).toBe("#1E40AF")
    expect(v.borderColor).toBe("#DC2626")
  })

  it("6. 누적 결손 후보 → 점선 + amber stroke", () => {
    const state: UserStateForEncode = {
      ...emptyState,
      masteryByPattern: { p1: { theta: 0.5, beta: 0.5 } },
      attemptCountByPattern: { p1: 2 },
      deficitCandidates: ["p1"],
    }
    const v = encodeVisual(baseNode, state)
    expect(v.strokeStyle).toBe("dashed")
    expect(v.strokeColor).toBe("#F97316")
  })

  it("THETA_GREEN 임계 = 0.7 (lock)", () => {
    expect(THETA_GREEN).toBe(0.7)
  })
})
