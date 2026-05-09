/**
 * 토폴로지 정렬 (Kahn).
 * Spec: 알고리즘 문서 1-C "사이클 발견 시 사람이 끊음", M2.3.
 *
 * Pattern → Pattern prerequisite edges 위에서 학습 순서.
 * 사이클이면 cycle 노드 ID 와 함께 throw.
 */

export interface DagEdge {
  /** prereq Pattern (학습 먼저). */
  source: string
  /** 후행 Pattern. */
  target: string
}

export class CycleError extends Error {
  constructor(public nodes: string[]) {
    super(`cycle in DAG involving ${nodes.length} nodes`)
    this.name = "CycleError"
  }
}

/**
 * Kahn 알고리즘. nodeIds 의 부분 집합으로 한정 (subgraph).
 * 반환은 학습 가능한 순서 (prereq → 후행).
 */
export function topoSort(nodeIds: string[], edges: DagEdge[]): string[] {
  const nodeSet = new Set(nodeIds)
  const inDegree = new Map<string, number>()
  const adj = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adj.set(id, [])
  }

  for (const e of edges) {
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const order: string[] = []
  while (queue.length > 0) {
    const cur = queue.shift()!
    order.push(cur)
    for (const next of adj.get(cur) ?? []) {
      const d = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, d)
      if (d === 0) queue.push(next)
    }
  }

  if (order.length !== nodeIds.length) {
    const remaining = nodeIds.filter((id) => !order.includes(id))
    throw new CycleError(remaining)
  }
  return order
}

/**
 * 한 노드의 ancestor 집합 (prereq closure). DAG 안에서 sourceNodeId 들로
 * 도달 가능한 모든 노드. 자기 자신 포함.
 */
export function ancestorClosure(
  nodeId: string,
  edges: DagEdge[],
): Set<string> {
  // adj 역방향 (prereq 따라 위로 올라감 = source ← target)
  const reverseAdj = new Map<string, string[]>()
  for (const e of edges) {
    const arr = reverseAdj.get(e.target) ?? []
    arr.push(e.source)
    reverseAdj.set(e.target, arr)
  }
  const visited = new Set<string>()
  const stack = [nodeId]
  while (stack.length > 0) {
    const cur = stack.pop()!
    if (visited.has(cur)) continue
    visited.add(cur)
    for (const prev of reverseAdj.get(cur) ?? []) {
      stack.push(prev)
    }
  }
  return visited
}
