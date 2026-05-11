/**
 * lib/north-star/badge.ts — 완주 뱃지 발급 판정.
 * Spec: docs/north-star-spec-2026-05-11.md §3
 */

import { describe, expect, it } from "vitest"
import { canIssueBadge } from "@/lib/north-star/badge"
import type { CoverageReport } from "@/lib/north-star/coverage"
import type { DagReport } from "@/lib/north-star/dag"
import type { MasteryState } from "@/lib/north-star/mastery"

const completeCoverage: CoverageReport = {
  totalChunks: 5,
  mappedChunks: 5,
  unmappedChunkIds: [],
  coveragePct: 100,
}

const incompleteCoverage: CoverageReport = {
  totalChunks: 5,
  mappedChunks: 3,
  unmappedChunkIds: ["c4", "c5"],
  coveragePct: 60,
}

const cleanDag: DagReport = {
  hasCycle: false,
  cycles: [],
  layers: [["A", "B"]],
  rootNodeIds: ["A", "B"],
}

const cyclicDag: DagReport = {
  hasCycle: true,
  cycles: [["A", "B"]],
  layers: [],
  rootNodeIds: [],
}

function masteryAll(state: MasteryState, ...ids: string[]) {
  return new Map<string, MasteryState>(ids.map((id) => [id, state]))
}

describe("canIssueBadge", () => {
  it("3 불변식 모두 통과 → ok", () => {
    const r = canIssueBadge({
      coverage: completeCoverage,
      dag: cleanDag,
      masteryByNode: masteryAll("mastered", "A", "B"),
      nodeIds: ["A", "B"],
    })
    expect(r.ok).toBe(true)
  })

  it("coverage 미완 → incomplete_coverage", () => {
    const r = canIssueBadge({
      coverage: incompleteCoverage,
      dag: cleanDag,
      masteryByNode: masteryAll("mastered", "A", "B"),
      nodeIds: ["A", "B"],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe("incomplete_coverage")
      expect(r.detail.coveragePct).toBe(60)
      expect(r.detail.unmappedCount).toBe(2)
    }
  })

  it("DAG 사이클 → dag_has_cycle", () => {
    const r = canIssueBadge({
      coverage: completeCoverage,
      dag: cyclicDag,
      masteryByNode: masteryAll("mastered", "A", "B"),
      nodeIds: ["A", "B"],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("dag_has_cycle")
  })

  it("미숙련 노드 존재 → unmastered_nodes", () => {
    const mastery = new Map<string, MasteryState>([
      ["A", "mastered"],
      ["B", "tested"],
    ])
    const r = canIssueBadge({
      coverage: completeCoverage,
      dag: cleanDag,
      masteryByNode: mastery,
      nodeIds: ["A", "B"],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.reason).toBe("unmastered_nodes")
      expect(r.detail.unmasteredNodeIds).toEqual(["B"])
    }
  })

  it("우선순위: coverage 미완 + 사이클 → coverage 먼저", () => {
    const r = canIssueBadge({
      coverage: incompleteCoverage,
      dag: cyclicDag,
      masteryByNode: masteryAll("tested", "A"),
      nodeIds: ["A"],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toBe("incomplete_coverage")
  })
})
