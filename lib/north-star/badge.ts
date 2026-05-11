/**
 * 완주 뱃지 발급 판정 — 3 불변식 통과 시에만 (북극성 Stage 1).
 * Spec: docs/north-star-spec-2026-05-11.md §3
 *
 *   불변식 = coverage 100% AND ∀ node mastered AND DAG acyclic
 *
 * 원칙: 모든 판정은 LLM 없이 결정론적. snapshot 동결.
 */

import type { CoverageReport } from "./coverage"
import { isCoverageComplete } from "./coverage"
import type { DagReport } from "./dag"
import type { MasteryState } from "./mastery"

export type BadgeFailReason =
  | "incomplete_coverage"
  | "dag_has_cycle"
  | "unmastered_nodes"

export interface BadgeOk {
  ok: true
}

export interface BadgeFail {
  ok: false
  reason: BadgeFailReason
  detail: {
    coveragePct?: number
    unmappedCount?: number
    cycleCount?: number
    unmasteredNodeIds?: string[]
  }
}

export type BadgeDecision = BadgeOk | BadgeFail

export function canIssueBadge(args: {
  coverage: CoverageReport
  dag: DagReport
  masteryByNode: Map<string, MasteryState>
  nodeIds: string[]
}): BadgeDecision {
  if (!isCoverageComplete(args.coverage)) {
    return {
      ok: false,
      reason: "incomplete_coverage",
      detail: {
        coveragePct: args.coverage.coveragePct,
        unmappedCount: args.coverage.unmappedChunkIds.length,
      },
    }
  }

  if (args.dag.hasCycle) {
    return {
      ok: false,
      reason: "dag_has_cycle",
      detail: {
        cycleCount: args.dag.cycles.length,
      },
    }
  }

  const unmastered: string[] = []
  for (const id of args.nodeIds) {
    const state = args.masteryByNode.get(id)
    if (state !== "mastered") unmastered.push(id)
  }
  if (unmastered.length > 0) {
    return {
      ok: false,
      reason: "unmastered_nodes",
      detail: {
        unmasteredNodeIds: unmastered,
      },
    }
  }

  return { ok: true }
}
