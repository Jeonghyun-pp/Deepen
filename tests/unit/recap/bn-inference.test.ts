/**
 * lib/recap/{bn-cpt, bn-inference, topo-sort, sequence-builder}
 * Spec: docs/build-spec/04-algorithms.md §3.2, 12-acceptance.md §10.
 */

import { describe, expect, it } from "vitest"
import {
  cpt,
  obsLikelihood,
  ROOT_PRIOR,
  NOISY_AND_BASE,
  FAILED_PARENT_FACTOR,
} from "@/lib/recap/bn-cpt"
import {
  ancestorClosure,
  CycleError,
  topoSort,
  type DagEdge,
} from "@/lib/recap/topo-sort"
import { inferExact } from "@/lib/recap/bn-inference"
import { buildRecapSequence } from "@/lib/recap/sequence-builder"
import type { ObsLabel } from "@/lib/recap/bn-cpt"

describe("bn-cpt", () => {
  it("root (no parents) → ROOT_PRIOR", () => {
    expect(cpt(1, 0, 0)).toBeCloseTo(ROOT_PRIOR, 6)
    expect(cpt(0, 0, 0)).toBeCloseTo(1 - ROOT_PRIOR, 6)
  })

  it("all parents mastered → NOISY_AND_BASE", () => {
    expect(cpt(1, 3, 3)).toBeCloseTo(NOISY_AND_BASE, 6)
  })

  it("no parents mastered → 0.9 · 0.1^3", () => {
    expect(cpt(1, 3, 0)).toBeCloseTo(
      NOISY_AND_BASE * Math.pow(FAILED_PARENT_FACTOR, 3),
      6,
    )
  })

  it("부분 mastered → 단조 증가", () => {
    const a = cpt(1, 3, 1)
    const b = cpt(1, 3, 2)
    const c = cpt(1, 3, 3)
    expect(a).toBeLessThan(b)
    expect(b).toBeLessThan(c)
  })

  it("obs likelihood: correct → mastered 가 더 높음", () => {
    expect(obsLikelihood("correct", 1)).toBeGreaterThan(
      obsLikelihood("correct", 0),
    )
  })

  it("obs likelihood: wrong → unmastered 가 더 높음", () => {
    expect(obsLikelihood("wrong", 0)).toBeGreaterThan(
      obsLikelihood("wrong", 1),
    )
  })
})

describe("topoSort", () => {
  it("단순 chain a→b→c", () => {
    const order = topoSort(["c", "b", "a"], [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ])
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"))
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"))
  })

  it("cycle 감지 → CycleError", () => {
    expect(() =>
      topoSort(["a", "b"], [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ]),
    ).toThrow(CycleError)
  })

  it("subgraph (nodeIds 부분 집합) — 외부 edge 무시", () => {
    const order = topoSort(["b"], [
      { source: "a", target: "b" }, // a 가 nodeIds 에 없음
    ])
    expect(order).toEqual(["b"])
  })

  it("ancestorClosure — chain", () => {
    const edges: DagEdge[] = [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ]
    const closure = ancestorClosure("c", edges)
    expect(closure.has("a")).toBe(true)
    expect(closure.has("b")).toBe(true)
    expect(closure.has("c")).toBe(true)
  })

  it("ancestorClosure — fork", () => {
    const edges: DagEdge[] = [
      { source: "a", target: "c" },
      { source: "b", target: "c" },
    ]
    const closure = ancestorClosure("c", edges)
    expect(closure.size).toBe(3)
  })
})

describe("inferExact (BN brute-force)", () => {
  it("단일 노드 + observed correct → mastered 확률 ↑", () => {
    const r = inferExact({
      nodeIds: ["a"],
      edges: [],
      observations: new Map<string, ObsLabel[]>([["a", ["correct"]]]),
    })
    const deficit = r.deficitProb.get("a")!
    expect(deficit).toBeLessThan(0.5)
    // P(m=1 | correct) = 0.85·0.5 / (0.85·0.5 + 0.15·0.5) = 0.85
    expect(deficit).toBeCloseTo(0.15, 2)
  })

  it("단일 노드 + observed wrong → 결손 확률 ↑", () => {
    const r = inferExact({
      nodeIds: ["a"],
      edges: [],
      observations: new Map<string, ObsLabel[]>([["a", ["wrong"]]]),
    })
    const deficit = r.deficitProb.get("a")!
    expect(deficit).toBeCloseTo(0.85, 2)
  })

  it("단일 노드 + observation 없음 → ROOT_PRIOR 결손=0.5", () => {
    const r = inferExact({
      nodeIds: ["a"],
      edges: [],
      observations: new Map(),
    })
    expect(r.deficitProb.get("a")!).toBeCloseTo(0.5, 6)
  })

  it("chain a→b. b 에서 wrong 관측 → a 도 결손 확률 상승", () => {
    const r = inferExact({
      nodeIds: ["a", "b"],
      edges: [{ source: "a", target: "b" }],
      observations: new Map<string, ObsLabel[]>([["b", ["wrong"]]]),
    })
    expect(r.deficitProb.get("a")!).toBeGreaterThan(0.5)
    expect(r.deficitProb.get("b")!).toBeGreaterThan(0.5)
  })

  it("b 에서 correct 가 여러 번 → b 의 prereq a 도 mastered 확률 ↑", () => {
    const r = inferExact({
      nodeIds: ["a", "b"],
      edges: [{ source: "a", target: "b" }],
      observations: new Map<string, ObsLabel[]>([
        ["b", ["correct", "correct", "correct"]],
      ]),
    })
    // b 가 자주 정답이면 a 도 mastered 확률 상승 — 결손 < 0.5
    expect(r.deficitProb.get("a")!).toBeLessThan(0.5)
  })

  it("noisy-AND: parents 1, 2 모두 mastered 일 때 child 정답 더 잘 설명", () => {
    // parent1 → child, parent2 → child
    // child correct 관측 → 두 parent 모두 결손 확률 낮아야 함
    const r = inferExact({
      nodeIds: ["p1", "p2", "c"],
      edges: [
        { source: "p1", target: "c" },
        { source: "p2", target: "c" },
      ],
      observations: new Map<string, ObsLabel[]>([["c", ["correct", "correct"]]]),
    })
    expect(r.deficitProb.get("p1")!).toBeLessThan(0.5)
    expect(r.deficitProb.get("p2")!).toBeLessThan(0.5)
  })
})

describe("buildRecapSequence", () => {
  it("TAU_RECAP 미달 → 빈 시퀀스", () => {
    const r = buildRecapSequence({
      immediate: [
        { patternId: "a", prob: 0.4 },
        { patternId: "b", prob: 0.55 },
      ],
      patternEdges: [],
    })
    expect(r.patternIds).toEqual([])
  })

  it("TAU_RECAP 통과 + 토폴로지 정렬", () => {
    const r = buildRecapSequence({
      immediate: [
        { patternId: "후행", prob: 0.7 },
        { patternId: "선행", prob: 0.8 },
      ],
      patternEdges: [{ source: "선행", target: "후행" }],
    })
    expect(r.patternIds).toEqual(["선행", "후행"])
  })

  it("MAX 3 슬라이스", () => {
    const r = buildRecapSequence({
      immediate: [
        { patternId: "p1", prob: 0.7 },
        { patternId: "p2", prob: 0.7 },
        { patternId: "p3", prob: 0.7 },
        { patternId: "p4", prob: 0.7 },
      ],
      patternEdges: [],
    })
    expect(r.patternIds).toHaveLength(3)
  })

  it("사이클 → prob 내림차순 fallback", () => {
    const r = buildRecapSequence({
      immediate: [
        { patternId: "a", prob: 0.7 },
        { patternId: "b", prob: 0.9 },
      ],
      patternEdges: [
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ],
    })
    // 사이클 → fallback → b (0.9) 먼저
    expect(r.patternIds[0]).toBe("b")
  })
})
