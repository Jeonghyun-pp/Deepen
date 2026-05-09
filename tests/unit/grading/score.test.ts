/**
 * lib/grading/score.ts — 8 케이스 lock.
 * Spec: docs/build-spec/12-acceptance.md §9.1.
 */

import { describe, expect, it } from "vitest"
import {
  classifyAttempt,
  confidenceScore,
  ruleBaseTags,
  TAU_HIGH,
  type AttemptSignals,
} from "@/lib/grading/score"

const baseSignals: AttemptSignals = {
  correct: true,
  timeMs: 60_000,
  timeZ: 0,
  hintsUsed: 0,
  aiQuestions: 0,
  selfConfidence: "sure",
}

describe("classifyAttempt", () => {
  it("1. 정답 + 빠름 + 자신감 sure → correct", () => {
    const cs = confidenceScore(baseSignals)
    expect(cs).toBeGreaterThanOrEqual(TAU_HIGH)
    expect(classifyAttempt(baseSignals).label).toBe("correct")
  })

  it("2. 오답 → 항상 wrong (cs 무관)", () => {
    const s = { ...baseSignals, correct: false }
    expect(classifyAttempt(s).label).toBe("wrong")
  })

  it("3. 정답 + selfConfidence=unsure → unsure (cs<0.6)", () => {
    const s: AttemptSignals = { ...baseSignals, selfConfidence: "unsure" }
    const cs = confidenceScore(s)
    expect(cs).toBeLessThan(TAU_HIGH)
    expect(classifyAttempt(s).label).toBe("unsure")
  })

  it("4. 정답 + 힌트 1회 → unsure (1 - 0.4 = 0.6 경계 근처)", () => {
    const s: AttemptSignals = { ...baseSignals, hintsUsed: 1 }
    const cs = confidenceScore(s)
    expect(cs).toBeCloseTo(0.6, 5)
    // 임계 정확히 0.6 = correct (≥ TAU_HIGH)
    expect(classifyAttempt(s).label).toBe("correct")
  })

  it("5. 정답 + 힌트 2회 → unsure (1 - 0.8 = 0.2)", () => {
    const s: AttemptSignals = { ...baseSignals, hintsUsed: 2 }
    expect(classifyAttempt(s).label).toBe("unsure")
  })

  it("6. 정답 + timeZ=2 (시간 초과 강함) → unsure (1 - 0.6 = 0.4)", () => {
    const s: AttemptSignals = { ...baseSignals, timeZ: 2 }
    const cs = confidenceScore(s)
    expect(cs).toBeCloseTo(0.4, 5)
    expect(classifyAttempt(s).label).toBe("unsure")
  })

  it("7. timeZ 음수 (빠름) 는 cs 에 보너스 X (max(0, z) clamp)", () => {
    const fast: AttemptSignals = { ...baseSignals, timeZ: -5 }
    const normal: AttemptSignals = { ...baseSignals, timeZ: 0 }
    expect(confidenceScore(fast)).toBe(confidenceScore(normal))
  })

  it("8. AI 질문 2회 + 힌트 1회 + unsure → unsure (1-0.4-0.4-0.5 < 0)", () => {
    const s: AttemptSignals = {
      ...baseSignals,
      hintsUsed: 1,
      aiQuestions: 2,
      selfConfidence: "unsure",
    }
    const cs = confidenceScore(s)
    expect(cs).toBeLessThan(0)
    expect(classifyAttempt(s).label).toBe("unsure")
  })
})

describe("ruleBaseTags", () => {
  it("timeZ > 2 → time_overrun", () => {
    const tags = ruleBaseTags({ signals: { ...baseSignals, timeZ: 2.5 } })
    expect(tags).toContain("time_overrun")
  })

  it("hintsUsed > 0 → hint_dependent", () => {
    const tags = ruleBaseTags({ signals: { ...baseSignals, hintsUsed: 1 } })
    expect(tags).toContain("hint_dependent")
  })

  it("bnMaxP ≥ 0.6 → prereq_deficit", () => {
    const tags = ruleBaseTags({ signals: baseSignals, bnMaxP: 0.7 })
    expect(tags).toContain("prereq_deficit")
  })

  it("bnMaxP < 0.6 → prereq_deficit 없음", () => {
    const tags = ruleBaseTags({ signals: baseSignals, bnMaxP: 0.5 })
    expect(tags).not.toContain("prereq_deficit")
  })

  it("아무 신호 없음 → 빈 배열", () => {
    const tags = ruleBaseTags({ signals: baseSignals })
    expect(tags).toEqual([])
  })
})
