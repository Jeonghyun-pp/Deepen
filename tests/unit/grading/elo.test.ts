/**
 * lib/grading/elo.ts — 6 케이스 lock.
 * Spec: docs/build-spec/12-acceptance.md §9.2.
 */

import { describe, expect, it } from "vitest"
import {
  ELO_K,
  eloToTheta,
  thetaToElo,
  labelToScore,
  updateElo,
} from "@/lib/grading/elo"

describe("eloToTheta / thetaToElo", () => {
  it("center 1500 ↔ theta 0.5", () => {
    expect(eloToTheta(1500)).toBeCloseTo(0.5, 6)
    expect(thetaToElo(0.5)).toBeCloseTo(1500, 6)
  })

  it("round-trip 동일", () => {
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(eloToTheta(thetaToElo(t))).toBeCloseTo(t, 6)
    }
  })

  it("clamp: theta 1·0 끝값에서도 NaN 없음", () => {
    expect(Number.isFinite(thetaToElo(0))).toBe(true)
    expect(Number.isFinite(thetaToElo(1))).toBe(true)
  })
})

describe("labelToScore", () => {
  it("correct=1.0, unsure=0.6, wrong=0.0", () => {
    expect(labelToScore("correct")).toBe(1.0)
    expect(labelToScore("unsure")).toBe(0.6)
    expect(labelToScore("wrong")).toBe(0.0)
  })
})

describe("updateElo", () => {
  it("정답 → thetaUser 상승, betaPattern 하락", () => {
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "correct" })
    expect(r.thetaUser).toBeGreaterThan(0.5)
    expect(r.betaPattern).toBeLessThan(0.5)
    expect(r.expected).toBeCloseTo(0.5, 6)
  })

  it("오답 → thetaUser 하락, betaPattern 상승", () => {
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "wrong" })
    expect(r.thetaUser).toBeLessThan(0.5)
    expect(r.betaPattern).toBeGreaterThan(0.5)
  })

  it("unsure 는 정답·오답 사이 — delta 작음", () => {
    const correct = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "correct" })
    const unsure = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "unsure" })
    expect(unsure.delta).toBeGreaterThan(0)
    expect(unsure.delta).toBeLessThan(correct.delta)
  })

  it("K 클수록 delta 큼 (K=64 이중 변동)", () => {
    const small = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "correct", k: 16 })
    const large = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "correct", k: 64 })
    expect(Math.abs(large.delta)).toBeGreaterThan(Math.abs(small.delta))
  })

  it("K 기본값 = 32", () => {
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "correct" })
    const explicit = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: "correct", k: ELO_K })
    expect(r.delta).toBeCloseTo(explicit.delta, 6)
  })

  it("이미 숙련된 사용자(theta=0.9) 가 어려운 패턴(beta=0.9) 정답 → 약한 갱신", () => {
    const evenMatch = updateElo({ thetaUser: 0.9, betaPattern: 0.9, label: "correct" })
    const easyWin = updateElo({ thetaUser: 0.9, betaPattern: 0.1, label: "correct" })
    // 어려운 정답일수록 expected ≈ 0.5 → delta 큼
    // 쉬운 정답은 expected ≈ 1.0 → delta 작음
    expect(evenMatch.delta).toBeGreaterThan(easyWin.delta)
  })
})
