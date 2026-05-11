/**
 * Coverage — chunk → node 매핑 커버리지 계산 (북극성 Stage 1).
 * Spec: docs/north-star-spec-2026-05-11.md §3
 *
 * 원칙: LLM 결과 무시. 코드가 직접 집합 연산으로 판정한다.
 * "완결 100%" 배지는 unclaimed.isEmpty() 일 때만.
 */

import type { ChunkMapState } from "@/lib/db/schema"

export interface CoverageReport {
  totalChunks: number
  /** state='confirmed' 인 chunk 수 (unique). proposed/rejected 제외. */
  mappedChunks: number
  /** confirmed 매핑이 하나도 없는 chunk id 목록. */
  unmappedChunkIds: string[]
  /** 0~100. totalChunks=0 이면 0. */
  coveragePct: number
}

export interface ChunkInput {
  id: string
}

export interface MappingInput {
  chunkId: string
  nodeId: string
  state: ChunkMapState
}

export function computeCoverage(args: {
  chunks: ChunkInput[]
  mappings: MappingInput[]
}): CoverageReport {
  const totalChunks = args.chunks.length
  if (totalChunks === 0) {
    return {
      totalChunks: 0,
      mappedChunks: 0,
      unmappedChunkIds: [],
      coveragePct: 0,
    }
  }

  // confirmed 만 카운트. unique chunkId 만 (한 chunk 가 여러 node 에 매핑돼도 1로).
  const mappedSet = new Set<string>()
  for (const m of args.mappings) {
    if (m.state === "confirmed") {
      mappedSet.add(m.chunkId)
    }
  }

  const unmappedChunkIds: string[] = []
  for (const c of args.chunks) {
    if (!mappedSet.has(c.id)) unmappedChunkIds.push(c.id)
  }

  const mappedChunks = totalChunks - unmappedChunkIds.length
  const coveragePct = Math.round((mappedChunks / totalChunks) * 10000) / 100

  return {
    totalChunks,
    mappedChunks,
    unmappedChunkIds,
    coveragePct,
  }
}

/** 100% 통과 판정 — badge 게이트에서 사용. */
export function isCoverageComplete(report: CoverageReport): boolean {
  return report.totalChunks > 0 && report.unmappedChunkIds.length === 0
}
