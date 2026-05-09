/**
 * 시퀀스 리캡카드 빌더 — TAU_RECAP 필터 + 토폴로지 정렬 + ≤ MAX 슬라이스.
 * Spec: docs/build-spec/04-algorithms.md §3.3, M2.3.
 */

import { topoSort, type DagEdge } from "./topo-sort"
import { TAU_RECAP } from "./types"

/** Q2: 시퀀스 카드 최대 3장 (04 §9 lock). */
export const MAX_RECAP_CARDS_Q2 = 3

export interface BuildSequenceArgs {
  immediate: { patternId: string; prob: number }[]
  patternEdges: DagEdge[]
}

export interface SequenceResult {
  patternIds: string[]
}

/**
 * - prob ≥ TAU_RECAP 만 후보
 * - 토폴로지 정렬 (prereq 가 먼저)
 * - 앞에서부터 MAX 장 슬라이스
 */
export function buildRecapSequence(
  args: BuildSequenceArgs,
): SequenceResult {
  const filtered = args.immediate
    .filter((x) => x.prob >= TAU_RECAP)
    .map((x) => x.patternId)

  if (filtered.length === 0) return { patternIds: [] }
  if (filtered.length === 1) return { patternIds: filtered }

  // subgraph 안에서 토폴로지 정렬. 사이클이면 prob 내림차순 fallback.
  let ordered: string[]
  try {
    ordered = topoSort(filtered, args.patternEdges)
  } catch {
    ordered = [...filtered].sort((a, b) => {
      const pa = args.immediate.find((x) => x.patternId === a)?.prob ?? 0
      const pb = args.immediate.find((x) => x.patternId === b)?.prob ?? 0
      return pb - pa
    })
  }

  return { patternIds: ordered.slice(0, MAX_RECAP_CARDS_Q2) }
}
