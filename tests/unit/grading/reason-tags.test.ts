/**
 * lib/grading/reason-tags.ts mergeReasonTags lock 검증.
 * Spec: docs/build-spec/08-q2-build.md M2.4.
 */

import { describe, expect, it } from "vitest"
import {
  AI_CONFIDENCE_THRESHOLD,
  mergeReasonTags,
} from "@/lib/grading/reason-tags"
import type { ReasonTag } from "@/lib/db/schema"

const RULE: ReasonTag[] = ["time_overrun", "hint_dependent"]

describe("mergeReasonTags", () => {
  it("confidence < THRESHOLD → existing 그대로", () => {
    const r = mergeReasonTags(RULE, ["calculation_error"], 0.4)
    expect(r).toEqual(RULE)
  })

  it("confidence ≥ THRESHOLD → AI 태그 추가", () => {
    const r = mergeReasonTags(RULE, ["calculation_error"], 0.8)
    expect(r).toContain("calculation_error")
    expect(r).toContain("time_overrun")
    expect(r).toContain("hint_dependent")
  })

  it("중복 태그 제거", () => {
    const r = mergeReasonTags(
      ["time_overrun"],
      ["time_overrun", "concept_lack"],
      0.9,
    )
    expect(r.filter((t) => t === "time_overrun")).toHaveLength(1)
    expect(r).toContain("concept_lack")
  })

  it("AI 태그 빈 배열 → existing 그대로", () => {
    const r = mergeReasonTags(RULE, [], 1.0)
    expect(r).toEqual(RULE)
  })

  it("existing 빈 + AI confidence 충족 → AI 태그만", () => {
    const r = mergeReasonTags([], ["calculation_error", "graph_misread"], 0.7)
    expect(r).toEqual(["calculation_error", "graph_misread"])
  })

  it("AI_CONFIDENCE_THRESHOLD = 0.5 (lock)", () => {
    expect(AI_CONFIDENCE_THRESHOLD).toBe(0.5)
  })

  it("경계 값 confidence = 0.5 → 통과", () => {
    const r = mergeReasonTags([], ["concept_lack"], 0.5)
    expect(r).toContain("concept_lack")
  })
})
