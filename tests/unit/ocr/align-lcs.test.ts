/**
 * lib/ocr/align-lcs.ts — Jaro-Winkler + LCS DP.
 * Spec: docs/build-spec/04-algorithms.md §7.2, 12-acceptance.md §10.
 */

import { describe, expect, it } from "vitest"
import { alignLCS, jaroWinkler, SIM_THRESHOLD } from "@/lib/ocr/align-lcs"
import { splitCanonicalSteps } from "@/lib/ocr/canonical-steps"

describe("jaroWinkler", () => {
  it("동일 문자열 = 1", () => {
    expect(jaroWinkler("D = b^2 - 4ac", "D = b^2 - 4ac")).toBe(1)
  })

  it("완전 다름 = 0 (또는 매우 낮음)", () => {
    const sim = jaroWinkler("xxx", "yyy")
    expect(sim).toBeLessThan(0.3)
  })

  it("부분 일치", () => {
    const sim = jaroWinkler("D = b^2 - 4ac", "D = b² - 4ac")
    expect(sim).toBeGreaterThan(SIM_THRESHOLD)
  })

  it("빈 문자열 = 0", () => {
    expect(jaroWinkler("", "abc")).toBe(0)
    expect(jaroWinkler("abc", "")).toBe(0)
  })

  it("Winkler bonus — 같은 prefix", () => {
    const a = jaroWinkler("abcdef", "abcxyz") // 같은 prefix abc
    const b = jaroWinkler("xyzdef", "xyzxyz") // 같은 prefix xyz
    // 둘 다 prefix bonus 받지만 둘 다 0 < x < 1
    expect(a).toBeGreaterThan(0.6)
    expect(b).toBeGreaterThan(0.6)
  })
})

describe("alignLCS", () => {
  it("빈 배열 → aligned 빈 배열", () => {
    const r = alignLCS({ userSteps: [], canonicalSteps: [] })
    expect(r.aligned).toEqual([])
    expect(r.unmatchedUserIdxs).toEqual([])
  })

  it("user 만 있고 canonical 빈 → 모두 unmatched user", () => {
    const r = alignLCS({
      userSteps: ["a", "b"],
      canonicalSteps: [],
    })
    expect(r.aligned).toHaveLength(2)
    expect(r.aligned.every((s) => !!s.userText && !s.canonicalText)).toBe(true)
    expect(r.unmatchedUserIdxs).toEqual([0, 1])
  })

  it("canonical 만 있고 user 빈 → 모두 누락 row", () => {
    const r = alignLCS({
      userSteps: [],
      canonicalSteps: ["x", "y"],
    })
    expect(r.aligned).toHaveLength(2)
    expect(r.aligned.every((s) => !s.userText && !!s.canonicalText)).toBe(true)
    expect(r.unmatchedUserIdxs).toEqual([])
  })

  it("완전 일치 → match 페어 N개", () => {
    const lines = ["D = b^2 - 4ac", "D = 0 이면 중근", "x = -b/2a"]
    const r = alignLCS({ userSteps: lines, canonicalSteps: lines })
    expect(r.aligned).toHaveLength(3)
    expect(r.aligned.every((s) => s.errorKind === "match")).toBe(true)
    expect(r.unmatchedUserIdxs).toEqual([])
  })

  it("순서 같지만 한 줄만 다름 → 1개 unmatched user + 1개 누락 canonical", () => {
    const r = alignLCS({
      userSteps: ["같은 줄 1", "다른 학생 줄", "같은 줄 3"],
      canonicalSteps: ["같은 줄 1", "정답 줄 2", "같은 줄 3"],
    })
    // matched 2개 (1, 3) + 학생 다른 줄 1개 + 정답 누락 1개 = 4 row
    expect(r.aligned.length).toBeGreaterThanOrEqual(3)
    const matchedCount = r.aligned.filter((s) => s.errorKind === "match")
      .length
    expect(matchedCount).toBe(2)
    expect(r.unmatchedUserIdxs).toContain(1)
  })

  it("순서 거꾸로 → LCS 가 1개만 매칭 (또는 0)", () => {
    const r = alignLCS({
      userSteps: ["a", "b", "c"],
      canonicalSteps: ["c", "b", "a"],
    })
    const matched = r.aligned.filter((s) => s.errorKind === "match").length
    // "b" 하나는 LCS 로 매칭 가능
    expect(matched).toBeLessThanOrEqual(1)
  })
})

describe("splitCanonicalSteps", () => {
  it("null/undefined → 빈 배열", () => {
    expect(splitCanonicalSteps(null)).toEqual([])
    expect(splitCanonicalSteps(undefined)).toEqual([])
  })

  it("빈 줄·whitespace 제거", () => {
    expect(
      splitCanonicalSteps("\n\nstep 1\n   \nstep 2\n\n"),
    ).toEqual(["step 1", "step 2"])
  })

  it("단일 줄", () => {
    expect(splitCanonicalSteps("solo")).toEqual(["solo"])
  })

  it("CRLF 도 분리", () => {
    expect(splitCanonicalSteps("a\r\nb\r\nc")).toEqual(["a", "b", "c"])
  })
})
