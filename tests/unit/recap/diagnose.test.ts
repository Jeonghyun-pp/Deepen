/**
 * lib/recap/diagnose.ts — deficitScore 단위 5 케이스.
 * Spec: docs/build-spec/04-algorithms.md §3.1, 12-acceptance §9.3.
 *
 * 통합 (DB 의존) 케이스는 M1.6 통합 테스트에서.
 */

import { describe, expect, it } from "vitest"
import { deficitScore } from "@/lib/recap/diagnose"
import { TAU_RECAP } from "@/lib/recap/types"

describe("deficitScore", () => {
  it("1. 마스터리 0 + 최근 오답 3 → 1.0 (최대)", () => {
    expect(deficitScore({ theta: 0, recentWrong: 3 })).toBeCloseTo(1.0, 6)
  })

  it("2. 마스터리 1 + 최근 오답 0 → 0 (최소)", () => {
    expect(deficitScore({ theta: 1, recentWrong: 0 })).toBeCloseTo(0, 6)
  })

  it("3. 마스터리 0.5 + 최근 오답 0 → 0.35 (theta 만 영향)", () => {
    expect(deficitScore({ theta: 0.5, recentWrong: 0 })).toBeCloseTo(0.35, 6)
  })

  it("4. 마스터리 0.3 + 최근 오답 1 → 0.59 (TAU_RECAP 약간 미달)", () => {
    const s = deficitScore({ theta: 0.3, recentWrong: 1 })
    expect(s).toBeCloseTo(0.59, 2)
    expect(s).toBeLessThan(TAU_RECAP)
  })

  it("5. 마스터리 0.2 + 최근 오답 2 → TAU_RECAP 넘음 (recap 발동)", () => {
    const s = deficitScore({ theta: 0.2, recentWrong: 2 })
    expect(s).toBeGreaterThanOrEqual(TAU_RECAP)
  })

  it("recentWrong 캡: 3 이상은 동일 점수 (overflow X)", () => {
    const a = deficitScore({ theta: 0.5, recentWrong: 3 })
    const b = deficitScore({ theta: 0.5, recentWrong: 100 })
    expect(a).toBeCloseTo(b, 6)
  })
})
