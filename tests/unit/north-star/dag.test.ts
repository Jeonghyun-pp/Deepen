/**
 * lib/north-star/dag.ts — 위상정렬 + Tarjan SCC 사이클 감지.
 * Spec: docs/north-star-spec-2026-05-11.md §3
 */

import { describe, expect, it } from "vitest"
import { analyzeDag } from "@/lib/north-star/dag"

describe("analyzeDag", () => {
  it("빈 그래프 — 사이클 없음, 레이어 빈 배열", () => {
    const r = analyzeDag({ nodeIds: [], edges: [] })
    expect(r.hasCycle).toBe(false)
    expect(r.layers).toEqual([])
    expect(r.rootNodeIds).toEqual([])
  })

  it("선형 chain A → B → C — 레이어 3개", () => {
    const r = analyzeDag({
      nodeIds: ["A", "B", "C"],
      edges: [
        { source: "A", target: "B", kind: "logical" },
        { source: "B", target: "C", kind: "logical" },
      ],
    })
    expect(r.hasCycle).toBe(false)
    expect(r.layers).toEqual([["A"], ["B"], ["C"]])
    expect(r.rootNodeIds).toEqual(["A"])
  })

  it("두 root + 합쳐지는 노드", () => {
    const r = analyzeDag({
      nodeIds: ["A", "B", "C", "D"],
      edges: [
        { source: "A", target: "C", kind: "logical" },
        { source: "B", target: "C", kind: "logical" },
        { source: "C", target: "D", kind: "logical" },
      ],
    })
    expect(r.hasCycle).toBe(false)
    expect(r.layers[0].sort()).toEqual(["A", "B"])
    expect(r.layers[1]).toEqual(["C"])
    expect(r.layers[2]).toEqual(["D"])
  })

  it("사이클 감지 — A→B→A", () => {
    const r = analyzeDag({
      nodeIds: ["A", "B"],
      edges: [
        { source: "A", target: "B", kind: "logical" },
        { source: "B", target: "A", kind: "logical" },
      ],
    })
    expect(r.hasCycle).toBe(true)
    expect(r.layers).toEqual([])
    expect(r.cycles.length).toBe(1)
    expect(r.cycles[0].sort()).toEqual(["A", "B"])
  })

  it("self-loop 도 사이클", () => {
    const r = analyzeDag({
      nodeIds: ["A"],
      edges: [{ source: "A", target: "A", kind: "logical" }],
    })
    expect(r.hasCycle).toBe(true)
    expect(r.cycles.length).toBe(1)
  })

  it("pedagogical edge 는 DAG 판정에서 무시", () => {
    const r = analyzeDag({
      nodeIds: ["A", "B"],
      edges: [
        { source: "A", target: "B", kind: "pedagogical" },
        { source: "B", target: "A", kind: "pedagogical" },
      ],
    })
    expect(r.hasCycle).toBe(false)
    expect(r.rootNodeIds.sort()).toEqual(["A", "B"])
  })

  it("외부 노드 참조 edge 는 무시", () => {
    const r = analyzeDag({
      nodeIds: ["A", "B"],
      edges: [
        { source: "A", target: "B", kind: "logical" },
        { source: "C", target: "A", kind: "logical" }, // C 가 nodeIds 에 없음
      ],
    })
    expect(r.hasCycle).toBe(false)
    expect(r.rootNodeIds).toEqual(["A"])
  })
})
