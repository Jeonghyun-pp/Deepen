/**
 * lib/north-star/coverage.ts — 단위 테스트.
 * Spec: docs/north-star-spec-2026-05-11.md §3
 */

import { describe, expect, it } from "vitest"
import { computeCoverage, isCoverageComplete } from "@/lib/north-star/coverage"

describe("computeCoverage", () => {
  it("빈 chunks → 0%", () => {
    const r = computeCoverage({ chunks: [], mappings: [] })
    expect(r.totalChunks).toBe(0)
    expect(r.coveragePct).toBe(0)
    expect(r.unmappedChunkIds).toEqual([])
  })

  it("모든 chunk 가 confirmed → 100%", () => {
    const r = computeCoverage({
      chunks: [{ id: "a" }, { id: "b" }],
      mappings: [
        { chunkId: "a", nodeId: "n1", state: "confirmed" },
        { chunkId: "b", nodeId: "n2", state: "confirmed" },
      ],
    })
    expect(r.coveragePct).toBe(100)
    expect(r.mappedChunks).toBe(2)
    expect(r.unmappedChunkIds).toEqual([])
  })

  it("proposed/rejected 는 카운트 안 함", () => {
    const r = computeCoverage({
      chunks: [{ id: "a" }, { id: "b" }, { id: "c" }],
      mappings: [
        { chunkId: "a", nodeId: "n1", state: "confirmed" },
        { chunkId: "b", nodeId: "n2", state: "proposed" },
        { chunkId: "c", nodeId: "n3", state: "rejected" },
      ],
    })
    expect(r.mappedChunks).toBe(1)
    expect(r.coveragePct).toBeCloseTo(33.33, 2)
    expect(r.unmappedChunkIds.sort()).toEqual(["b", "c"])
  })

  it("한 chunk 가 여러 node 에 confirmed 매핑 → 1로 카운트", () => {
    const r = computeCoverage({
      chunks: [{ id: "a" }, { id: "b" }],
      mappings: [
        { chunkId: "a", nodeId: "n1", state: "confirmed" },
        { chunkId: "a", nodeId: "n2", state: "confirmed" },
      ],
    })
    expect(r.mappedChunks).toBe(1)
    expect(r.coveragePct).toBe(50)
    expect(r.unmappedChunkIds).toEqual(["b"])
  })

  it("isCoverageComplete — totalChunks>0 + unmapped 0 일 때만 true", () => {
    expect(
      isCoverageComplete(computeCoverage({ chunks: [], mappings: [] })),
    ).toBe(false)
    expect(
      isCoverageComplete(
        computeCoverage({
          chunks: [{ id: "a" }],
          mappings: [{ chunkId: "a", nodeId: "n1", state: "confirmed" }],
        }),
      ),
    ).toBe(true)
    expect(
      isCoverageComplete(
        computeCoverage({
          chunks: [{ id: "a" }, { id: "b" }],
          mappings: [{ chunkId: "a", nodeId: "n1", state: "confirmed" }],
        }),
      ),
    ).toBe(false)
  })
})
