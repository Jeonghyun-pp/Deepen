/**
 * Pattern→Pattern prereq 사이클 검증.
 * Spec: 알고리즘 문서 1-C — DAG 토폴로지 정렬 가능해야 함.
 *
 * 새 엣지 (source → target) 추가 시:
 *   - target 에서 source 로 도달하는 경로가 이미 존재하면 cycle.
 */

import { db } from "@/lib/db"
import { edges, nodes } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function wouldCreatePrereqCycle(
  sourceNodeId: string,
  targetNodeId: string,
): Promise<boolean> {
  if (sourceNodeId === targetNodeId) return true

  // 모든 prereq 엣지 (Pattern→Pattern)
  const all = await db
    .select({
      source: edges.sourceNodeId,
      target: edges.targetNodeId,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(and(eq(edges.type, "prerequisite"), eq(nodes.type, "pattern")))

  // adjacency: target → list of sources (역방향 BFS)
  const adj = new Map<string, string[]>()
  for (const e of all) {
    const arr = adj.get(e.target) ?? []
    arr.push(e.source)
    adj.set(e.target, arr)
  }
  // 새 엣지 가상 추가 — target→source 경로 검증을 위해 forward 방향 BFS
  const fwd = new Map<string, string[]>()
  for (const e of all) {
    const arr = fwd.get(e.source) ?? []
    arr.push(e.target)
    fwd.set(e.source, arr)
  }
  // 가상 엣지 추가
  const arr = fwd.get(sourceNodeId) ?? []
  arr.push(targetNodeId)
  fwd.set(sourceNodeId, arr)

  // target 에서 source 로 도달 가능한가? — DFS
  const visited = new Set<string>()
  const stack = [targetNodeId]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (cur === sourceNodeId) return true
    if (visited.has(cur)) continue
    visited.add(cur)
    const next = fwd.get(cur) ?? []
    for (const n of next) stack.push(n)
  }
  return false
}
