/**
 * lib/north-star/mastery.ts — 상태 머신 단위 테스트.
 * Spec: docs/north-star-spec-2026-05-11.md §3
 */

import { describe, expect, it } from "vitest"
import { nextMasteryState } from "@/lib/north-star/mastery"

describe("nextMasteryState", () => {
  it("unseen + view → viewed", () => {
    expect(
      nextMasteryState({
        current: "unseen",
        event: { type: "view" },
        history: [],
      }),
    ).toBe("viewed")
  })

  it("viewed + view → viewed (idempotent)", () => {
    expect(
      nextMasteryState({
        current: "viewed",
        event: { type: "view" },
        history: [],
      }),
    ).toBe("viewed")
  })

  it("viewed + check_pass → tested", () => {
    expect(
      nextMasteryState({
        current: "viewed",
        event: { type: "check_pass", itemType: "cloze" },
        history: [],
      }),
    ).toBe("tested")
  })

  it("tested + 다른 type check_pass → mastered", () => {
    const now = new Date()
    expect(
      nextMasteryState({
        current: "tested",
        event: { type: "check_pass", itemType: "mcq" },
        history: [
          { itemType: "cloze", correct: true, attemptedAt: now },
        ],
        now,
      }),
    ).toBe("mastered")
  })

  it("tested + 같은 type pass 만 있고 24h 미만 → tested 유지", () => {
    const now = new Date("2026-05-11T10:00:00Z")
    const earlier = new Date("2026-05-11T08:00:00Z") // 2h 전
    expect(
      nextMasteryState({
        current: "tested",
        event: { type: "check_pass", itemType: "cloze" },
        history: [
          { itemType: "cloze", correct: true, attemptedAt: earlier },
        ],
        now,
      }),
    ).toBe("tested")
  })

  it("tested + 같은 type pass + 24h 이상 → mastered", () => {
    const now = new Date("2026-05-12T10:00:00Z")
    const earlier = new Date("2026-05-11T08:00:00Z") // 26h 전
    expect(
      nextMasteryState({
        current: "tested",
        event: { type: "check_pass", itemType: "cloze" },
        history: [
          { itemType: "cloze", correct: true, attemptedAt: earlier },
        ],
        now,
      }),
    ).toBe("mastered")
  })

  it("mastered + check_fail → tested (정직성 회수)", () => {
    expect(
      nextMasteryState({
        current: "mastered",
        event: { type: "check_fail" },
        history: [],
      }),
    ).toBe("tested")
  })

  it("mastered + check_pass → mastered 유지", () => {
    expect(
      nextMasteryState({
        current: "mastered",
        event: { type: "check_pass", itemType: "cloze" },
        history: [],
      }),
    ).toBe("mastered")
  })

  it("unseen + check_pass → tested (viewed 우회)", () => {
    expect(
      nextMasteryState({
        current: "unseen",
        event: { type: "check_pass", itemType: "mcq" },
        history: [],
      }),
    ).toBe("tested")
  })
})
