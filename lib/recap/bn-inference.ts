/**
 * Phase 3 BN 본격 추론 — brute-force exact (≤ 20 노드) + DB 어댑터.
 * Spec: docs/build-spec/04-algorithms.md §3.2, M2.3.
 *
 * 알고리즘:
 *   1. ancestor closure (현재 item 의 prereq 닫힘) 추출 → ≤ 20 노드 가정.
 *   2. 모든 binary assignment (2^N) enumerate.
 *   3. 각 assignment 의 joint = ∏ P(v=a[v] | parents) · ∏ P(obs | v).
 *   4. evidence 일치하는 assignment 만 유효.
 *   5. P(v_target=1 | obs) = sum_a [a[v]=1] joint / sum joint.
 *
 * DAG > 20 노드 시 ancestor closure 자르기 (Q1 fallback).
 * Q2 polish: loopy BP 또는 variable elimination.
 */

import { and, eq, gte } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  edges,
  nodes,
  patternState,
  userItemHistory,
  type AttemptResult,
} from "@/lib/db/schema"
import { cpt, obsLikelihood, type Mastery, type ObsLabel } from "./bn-cpt"
import { ancestorClosure, type DagEdge } from "./topo-sort"

const MAX_NODES_EXACT = 20
export const BN_OBS_WINDOW_DAYS = 30

// ────────── Pure inference (테스트 가능) ──────────

export interface BnInferenceInput {
  /** 노드 ID 목록 (ancestor closure). */
  nodeIds: string[]
  /** Pattern→Pattern prereq edges (subgraph). */
  edges: DagEdge[]
  /** 관측: nodeId → 그 노드의 attempt label 배열 (최근 N일). */
  observations: Map<string, ObsLabel[]>
}

export interface BnInferenceResult {
  /** 노드별 P(mastery=0 | obs) — 결손 확률. */
  deficitProb: Map<string, number>
}

export function inferExact(input: BnInferenceInput): BnInferenceResult {
  const { nodeIds, edges, observations } = input
  if (nodeIds.length === 0) {
    return { deficitProb: new Map() }
  }
  if (nodeIds.length > MAX_NODES_EXACT) {
    throw new Error(
      `bn_too_large (${nodeIds.length} > ${MAX_NODES_EXACT}); fallback needed`,
    )
  }

  // adjacency: target → list of source (parent)
  const parentsOf = new Map<string, string[]>()
  for (const id of nodeIds) parentsOf.set(id, [])
  for (const e of edges) {
    if (parentsOf.has(e.target) && parentsOf.has(e.source)) {
      parentsOf.get(e.target)!.push(e.source)
    }
  }

  const N = nodeIds.length
  const total = 1 << N
  // assignment 인덱싱: bit i 는 nodeIds[i] 의 mastery (0 or 1)
  const idxOf = new Map<string, number>()
  nodeIds.forEach((id, i) => idxOf.set(id, i))

  // 각 노드의 mastery=1 사후 marginal
  const numerator = new Array(N).fill(0) // P(v=1 ∧ obs)
  let denominator = 0 // P(obs)

  for (let a = 0; a < total; a++) {
    let joint = 1
    for (let i = 0; i < N; i++) {
      const m = ((a >> i) & 1) as Mastery
      const parents = parentsOf.get(nodeIds[i])!
      let mastered = 0
      for (const p of parents) {
        if ((a >> idxOf.get(p)!) & 1) mastered++
      }
      joint *= cpt(m, parents.length, mastered)
    }
    if (joint === 0) continue

    // observation likelihood
    let obsProb = 1
    for (const [nid, labels] of observations) {
      const i = idxOf.get(nid)
      if (i === undefined) continue
      const m = ((a >> i) & 1) as Mastery
      for (const lbl of labels) {
        obsProb *= obsLikelihood(lbl, m)
      }
    }
    const weighted = joint * obsProb
    if (weighted === 0) continue

    denominator += weighted
    for (let i = 0; i < N; i++) {
      if ((a >> i) & 1) numerator[i] += weighted
    }
  }

  const result = new Map<string, number>()
  if (denominator === 0) {
    // observation 이 inconsistent — fallback: 0.5 결손
    for (const id of nodeIds) result.set(id, 0.5)
    return { deficitProb: result }
  }
  for (let i = 0; i < N; i++) {
    const pMastered = numerator[i] / denominator
    result.set(nodeIds[i], 1 - pMastered)
  }
  return { deficitProb: result }
}

// ────────── DB 어댑터 ──────────

/**
 * runBN: spec 04 §3.2 lock 시그니처.
 * - immediate: 현재 item 의 직접 prereq Pattern 들 (edges target=현재 Pattern).
 * - cumulative: ancestor closure 안 모든 Pattern 의 결손 확률.
 */
export async function runBN(args: {
  userId: string
  currentItemId: string
}): Promise<{
  immediate: { patternId: string; prob: number }[]
  cumulative: Map<string, number>
}> {
  // 1) 현재 item 의 Pattern (Pattern--contains-->Item)
  const currentPatternRows = await db
    .select({ patternId: edges.sourceNodeId })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        eq(edges.targetNodeId, args.currentItemId),
        eq(edges.type, "contains"),
        eq(nodes.type, "pattern"),
      ),
    )

  const currentPatternIds = currentPatternRows.map((r) => r.patternId)
  if (currentPatternIds.length === 0) {
    return { immediate: [], cumulative: new Map() }
  }

  // 2) prereq edges (Pattern--prerequisite-->Pattern) 전부 — DAG 작은 가정
  const allPrereqEdges = await db
    .select({ source: edges.sourceNodeId, target: edges.targetNodeId })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(eq(edges.type, "prerequisite"), eq(nodes.type, "pattern")),
    )

  // 3) ancestor closure (현재 Pattern 들의 prereq 닫힘)
  const closure = new Set<string>()
  for (const pid of currentPatternIds) {
    for (const id of ancestorClosure(pid, allPrereqEdges)) closure.add(id)
  }
  const subgraphIds = [...closure]
  if (subgraphIds.length === 0) {
    return { immediate: [], cumulative: new Map() }
  }

  // 4) 사용자 관측 — closure 안 Pattern 들의 Item attempts
  const containsEdges = await db
    .select({ source: edges.sourceNodeId, target: edges.targetNodeId })
    .from(edges)
    .where(eq(edges.type, "contains"))

  const itemToPatterns = new Map<string, string[]>()
  for (const e of containsEdges) {
    if (!subgraphIds.includes(e.source)) continue
    const arr = itemToPatterns.get(e.target) ?? []
    arr.push(e.source)
    itemToPatterns.set(e.target, arr)
  }

  const since = new Date(Date.now() - BN_OBS_WINDOW_DAYS * 24 * 3600 * 1000)
  const histRows = await db
    .select({
      itemId: userItemHistory.itemId,
      resultHistory: userItemHistory.resultHistory,
    })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, args.userId),
        gte(userItemHistory.lastSolvedAt, since),
      ),
    )

  const observations = new Map<string, ObsLabel[]>()
  for (const h of histRows) {
    const patterns = itemToPatterns.get(h.itemId)
    if (!patterns) continue
    const labels: ObsLabel[] = (h.resultHistory as AttemptResult[])
      .filter((r) => new Date(r.timestamp).getTime() >= since.getTime())
      .map((r) => r.label as ObsLabel)
    for (const pid of patterns) {
      const arr = observations.get(pid) ?? []
      arr.push(...labels)
      observations.set(pid, arr)
    }
  }

  // 5) BN 추론 (≤ MAX_NODES_EXACT)
  let result: BnInferenceResult
  if (subgraphIds.length > MAX_NODES_EXACT) {
    // Fallback: pattern_state.theta 기반 단순 추정 (M2.3 polish 에서 loopy BP)
    result = await fallbackFromPatternState(args.userId, subgraphIds)
  } else {
    result = inferExact({
      nodeIds: subgraphIds,
      edges: allPrereqEdges,
      observations,
    })
  }

  // 6) immediate = 현재 Pattern 의 직접 prereq (Pattern --prerequisite--> currentPattern)
  const immediate: { patternId: string; prob: number }[] = []
  for (const e of allPrereqEdges) {
    if (currentPatternIds.includes(e.target)) {
      const prob = result.deficitProb.get(e.source)
      if (prob !== undefined) {
        immediate.push({ patternId: e.source, prob })
      }
    }
  }
  // 중복 제거 (한 prereq 가 여러 currentPattern 의 prereq 일 때)
  const seen = new Set<string>()
  const uniqImmediate = immediate.filter((x) => {
    if (seen.has(x.patternId)) return false
    seen.add(x.patternId)
    return true
  })

  return { immediate: uniqImmediate, cumulative: result.deficitProb }
}

async function fallbackFromPatternState(
  userId: string,
  patternIds: string[],
): Promise<BnInferenceResult> {
  const rows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
    })
    .from(patternState)
    .where(eq(patternState.userId, userId))
  const map = new Map<string, number>()
  const stateMap = new Map(rows.map((r) => [r.patternId, r.theta]))
  for (const id of patternIds) {
    const theta = stateMap.get(id) ?? 0.5
    map.set(id, 1 - theta)
  }
  return { deficitProb: map }
}
