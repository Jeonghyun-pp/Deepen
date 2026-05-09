import { describe, expect, it } from "vitest"
import {
  challengeNextAction,
  challengeReducer,
  initialChallengeState,
  type ChallengeState,
} from "@/lib/session/challenge-machine"

const PID = "11111111-1111-1111-1111-111111111111"
const PID2 = "22222222-2222-2222-2222-222222222222"

function start(theta = 0.4): ChallengeState {
  return challengeReducer(initialChallengeState, {
    type: "START",
    targetPatternId: PID,
    patternLabel: "함수의 극한 계산",
    startingDifficulty: theta + 0.1,
  })
}

function many(state: ChallengeState, corrects: boolean[]): ChallengeState {
  return corrects.reduce(
    (s, c) => challengeReducer(s, { type: "ATTEMPT", correct: c }),
    state,
  )
}

describe("challenge-machine", () => {
  it("idle → solving on START with current difficulty", () => {
    const s = start(0.4)
    expect(s.name).toBe("solving")
    expect(s.ctx.targetPatternId).toBe(PID)
    expect(s.ctx.currentDifficulty).toBeCloseTo(0.5, 5)
    expect(s.ctx.consecutiveCorrect).toBe(0)
  })

  it("정답 1회 — streak 1, difficulty +0.1", () => {
    const s = many(start(0.4), [true])
    expect(s.name).toBe("solving")
    expect(s.ctx.consecutiveCorrect).toBe(1)
    expect(s.ctx.currentDifficulty).toBeCloseTo(0.6, 5)
  })

  it("5연속 정답 → level_up", () => {
    const s = many(start(0.4), [true, true, true, true, true])
    expect(s.name).toBe("level_up")
    expect(s.ctx.consecutiveCorrect).toBe(5)
    expect(challengeNextAction(s)).toEqual({ type: "level_up" })
  })

  it("LEVEL_UP_TARGET 시 새 Pattern, streak reset, levelsCleared++", () => {
    const a = many(start(0.4), [true, true, true, true, true])
    const b = challengeReducer(a, {
      type: "LEVEL_UP_TARGET",
      targetPatternId: PID2,
      patternLabel: "다항함수의 극한",
      startingDifficulty: 0.6,
    })
    expect(b.name).toBe("solving")
    expect(b.ctx.targetPatternId).toBe(PID2)
    expect(b.ctx.consecutiveCorrect).toBe(0)
    expect(b.ctx.consecutiveWrong).toBe(0)
    expect(b.ctx.currentDifficulty).toBeCloseTo(0.6, 5)
    expect(b.ctx.levelsCleared).toBe(1)
  })

  it("오답 1회 — streak reset, difficulty -0.1, solving 유지", () => {
    const a = many(start(0.4), [true, true])
    const b = challengeReducer(a, { type: "ATTEMPT", correct: false })
    expect(b.name).toBe("solving")
    expect(b.ctx.consecutiveCorrect).toBe(0)
    expect(b.ctx.consecutiveWrong).toBe(1)
    expect(b.ctx.currentDifficulty).toBeCloseTo(0.6, 5)
  })

  it("연속 2회 오답 → session_end", () => {
    const s = many(start(0.4), [false, false])
    expect(s.name).toBe("session_end")
    expect(challengeNextAction(s)).toEqual({ type: "session_end" })
  })

  it("정답 사이에 오답 1회 — wrong reset 안 됨, 다음 정답 시 wrong=0", () => {
    const s1 = many(start(0.4), [false]) // wrong=1
    const s2 = many(s1, [true]) // correct → wrong=0
    expect(s2.ctx.consecutiveWrong).toBe(0)
    expect(s2.ctx.consecutiveCorrect).toBe(1)
  })

  it("ABORT — 어디서든 session_end", () => {
    const a = many(start(0.4), [true, true])
    const b = challengeReducer(a, { type: "ABORT" })
    expect(b.name).toBe("session_end")
  })

  it("difficulty 상한 1.0 / 하한 0.0 clamp", () => {
    const high = many(start(0.85), [true, true, true, true]) // 0.95→1.05 clamp
    expect(high.ctx.currentDifficulty).toBeLessThanOrEqual(1)
    const low = many(start(0.05), [false]) // 0.15-0.1 = 0.05, but actually start has +0.1
    expect(low.ctx.currentDifficulty).toBeGreaterThanOrEqual(0)
  })

  it("nextAction(solving) 은 same pattern + difficulty", () => {
    const s = many(start(0.4), [true])
    expect(challengeNextAction(s)).toEqual({
      type: "next_item",
      samePattern: true,
      difficulty: s.ctx.currentDifficulty,
    })
  })
})
