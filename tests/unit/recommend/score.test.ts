import { describe, expect, it } from "vitest"
import { jaccard } from "@/lib/recommend/jaccard"
import { prereqOverlap } from "@/lib/recommend/prereq-overlap"
import { weaknessAlignment } from "@/lib/recommend/weakness-alignment"
import { deficitBoost } from "@/lib/recommend/deficit-boost"
import { rankScore, W } from "@/lib/recommend/score"

describe("jaccard", () => {
  it("동일 집합 → 1", () => {
    expect(jaccard(["a", "b", "c"], ["a", "b", "c"])).toBeCloseTo(1, 5)
  })
  it("교집합 없음 → 0", () => {
    expect(jaccard(["a"], ["b"])).toBe(0)
  })
  it("부분 교집합 — 정상", () => {
    expect(jaccard(["a", "b"], ["a", "c"])).toBeCloseTo(1 / 3, 5)
  })
  it("null/empty → 0", () => {
    expect(jaccard(null, ["a"])).toBe(0)
    expect(jaccard([], [])).toBe(0)
  })
})

describe("prereqOverlap", () => {
  it("부분 교집합", () => {
    expect(prereqOverlap(["p1", "p2"], ["p2", "p3"])).toBeCloseTo(1 / 3, 5)
  })
})

describe("weaknessAlignment", () => {
  it("theta 낮은 약점이면 score 높음", () => {
    const w = weaknessAlignment({
      itemPatternIds: ["p1", "p2"],
      user: {
        thetaByPattern: new Map([
          ["p1", 0.1],
          ["p2", 0.3],
        ]),
      },
    })
    expect(w).toBeCloseTo((0.9 + 0.7) / 2, 5)
  })
  it("미관측 patternId 는 default 0.5", () => {
    const w = weaknessAlignment({
      itemPatternIds: ["unknown"],
      user: { thetaByPattern: new Map() },
    })
    expect(w).toBeCloseTo(0.5, 5)
  })
})

describe("deficitBoost", () => {
  it("clamp 1.0", () => {
    const b = deficitBoost({
      itemRequiresPrereq: ["a", "b"],
      user: { deficitByPattern: new Map([["a", 0.7], ["b", 0.5]]) },
    })
    expect(b).toBe(1)
  })
  it("부분 누적", () => {
    const b = deficitBoost({
      itemRequiresPrereq: ["a", "b"],
      user: { deficitByPattern: new Map([["a", 0.3]]) },
    })
    expect(b).toBeCloseTo(0.3, 5)
  })
})

describe("rankScore (composite)", () => {
  it("가중합 W = ALPHA+BETA+GAMMA+DELTA+EPSILON = 1.0", () => {
    const sum = W.ALPHA + W.BETA + W.GAMMA + W.DELTA + W.EPSILON
    expect(sum).toBeCloseTo(1, 5)
  })

  it("모든 신호 1 이면 total ≈ 1", () => {
    const score = rankScore({
      item: {
        id: "i1",
        signature: ["a", "b"],
        patternIds: ["p1"],
        requiresPrereq: ["q1"],
        cosineSimilarity: 1,
      },
      base: {
        signature: ["a", "b"],
        requiresPrereq: ["q1"],
      },
      user: {
        thetaByPattern: new Map([["p1", 0]]),
        deficitByPattern: new Map([["q1", 1]]),
      },
    })
    // jac=1 cos=1 ovl=1 wal=1 dft=1 → 0.3+0.3+0.15+0.15+0.10 = 1.0
    expect(score.total).toBeCloseTo(1, 5)
  })

  it("같은 cosine 일 때 약점 alignment 높은 쪽이 더 높음", () => {
    const base = {
      signature: ["x"],
      requiresPrereq: [],
    }
    const user = {
      thetaByPattern: new Map([["weak", 0.1], ["strong", 0.9]]),
      deficitByPattern: new Map(),
    }
    const a = rankScore({
      item: {
        id: "a",
        signature: ["x"],
        patternIds: ["weak"],
        requiresPrereq: [],
        cosineSimilarity: 0.5,
      },
      base,
      user,
    })
    const b = rankScore({
      item: {
        id: "b",
        signature: ["x"],
        patternIds: ["strong"],
        requiresPrereq: [],
        cosineSimilarity: 0.5,
      },
      base,
      user,
    })
    expect(a.total).toBeGreaterThan(b.total)
    expect(a.wal).toBeGreaterThan(b.wal)
  })
})
