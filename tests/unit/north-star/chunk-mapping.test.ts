/**
 * lib/north-star/chunk-mapping.ts — 신뢰도 임계 분류.
 * Spec: docs/north-star-spec-2026-05-11.md §5.1
 */

import { describe, expect, it } from "vitest"
import {
  AUTO_CONFIRM_THRESHOLD,
  PROPOSED_THRESHOLD,
  buildMappingRows,
  classifyProposal,
  proposeChunkMappings,
} from "@/lib/north-star/chunk-mapping"

describe("classifyProposal", () => {
  it(`≥${AUTO_CONFIRM_THRESHOLD} → confirmed`, () => {
    expect(classifyProposal({ chunkId: "a", nodeId: "n", confidence: 0.7 })).toBe(
      "confirmed",
    )
    expect(classifyProposal({ chunkId: "a", nodeId: "n", confidence: 0.95 })).toBe(
      "confirmed",
    )
  })
  it(`${PROPOSED_THRESHOLD} ≤ x < ${AUTO_CONFIRM_THRESHOLD} → proposed`, () => {
    expect(classifyProposal({ chunkId: "a", nodeId: "n", confidence: 0.4 })).toBe(
      "proposed",
    )
    expect(classifyProposal({ chunkId: "a", nodeId: "n", confidence: 0.69 })).toBe(
      "proposed",
    )
  })
  it(`<${PROPOSED_THRESHOLD} → discarded`, () => {
    expect(classifyProposal({ chunkId: "a", nodeId: "n", confidence: 0.3 })).toBe(
      "discarded",
    )
    expect(classifyProposal({ chunkId: "a", nodeId: "n", confidence: 0 })).toBe(
      "discarded",
    )
  })
})

describe("buildMappingRows", () => {
  it("discarded 는 row 안 만듦", () => {
    const rows = buildMappingRows({
      proposals: [
        { chunkId: "a", nodeId: "n1", confidence: 0.9 },
        { chunkId: "b", nodeId: "n2", confidence: 0.5 },
        { chunkId: "c", nodeId: "n3", confidence: 0.2 },
      ],
      proposedBy: "llm",
    })
    expect(rows.length).toBe(2)
    expect(rows[0].state).toBe("confirmed")
    expect(rows[1].state).toBe("proposed")
  })

  it("proposedBy 전파", () => {
    const rows = buildMappingRows({
      proposals: [{ chunkId: "a", nodeId: "n", confidence: 0.8 }],
      proposedBy: "user",
    })
    expect(rows[0].proposedBy).toBe("user")
  })
})

describe("proposeChunkMappings mockProposer", () => {
  it("mock 결과 그대로 반환", async () => {
    const out = await proposeChunkMappings({
      chunks: [{ id: "a", content: "x", sectionTitle: null, pageStart: null }],
      nodes: [{ id: "n", label: "y" }],
      mockProposer: async () => [
        { chunkId: "a", nodeId: "n", confidence: 0.85 },
      ],
    })
    expect(out).toEqual([{ chunkId: "a", nodeId: "n", confidence: 0.85 }])
  })

  it("mock 없으면 empty (Stage 2 placeholder)", async () => {
    const out = await proposeChunkMappings({
      chunks: [],
      nodes: [],
    })
    expect(out).toEqual([])
  })
})
