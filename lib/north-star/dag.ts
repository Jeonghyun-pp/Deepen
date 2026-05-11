/**
 * DAG 분석 — prerequisite edge 위상정렬 + 사이클 감지 (북극성 Stage 1).
 * Spec: docs/north-star-spec-2026-05-11.md §3
 *
 * 원칙: 사이클은 버그. LLM 이 괜찮다 해도 코드가 거부한다.
 * Tarjan SCC 로 사이클 감지 → 사이클 있으면 axiom 후보 surface.
 */

export type PrereqKind = "logical" | "pedagogical"

export interface DagEdge {
  source: string
  target: string
  kind: PrereqKind
}

export interface DagReport {
  hasCycle: boolean
  /** Tarjan SCC 에서 size > 1 인 컴포넌트 (사이클 멤버). */
  cycles: string[][]
  /** 위상정렬 후 레이어. 사이클 있으면 빈 배열. */
  layers: string[][]
  /** in-degree 0 노드 (학습 시작 후보). */
  rootNodeIds: string[]
}

export function analyzeDag(args: {
  nodeIds: string[]
  edges: DagEdge[]
}): DagReport {
  const nodeSet = new Set(args.nodeIds)

  // 인접 리스트 (source → target). 'logical' 만 DAG 판정에 사용 (pedagogical 은 hint).
  const adj = new Map<string, string[]>()
  const inDeg = new Map<string, number>()
  for (const id of args.nodeIds) {
    adj.set(id, [])
    inDeg.set(id, 0)
  }
  for (const e of args.edges) {
    if (e.kind !== "logical") continue
    if (!nodeSet.has(e.source) || !nodeSet.has(e.target)) continue
    adj.get(e.source)!.push(e.target)
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1)
  }

  const cycles = findStronglyConnectedCycles(args.nodeIds, adj)

  if (cycles.length > 0) {
    return {
      hasCycle: true,
      cycles,
      layers: [],
      rootNodeIds: args.nodeIds.filter((id) => (inDeg.get(id) ?? 0) === 0),
    }
  }

  // Kahn 알고리즘 — 위상정렬 + 레이어 계산
  const layers: string[][] = []
  const remaining = new Map(inDeg)
  let current: string[] = args.nodeIds.filter((id) => remaining.get(id) === 0)

  while (current.length > 0) {
    layers.push([...current])
    const next: string[] = []
    for (const u of current) {
      for (const v of adj.get(u) ?? []) {
        const d = (remaining.get(v) ?? 0) - 1
        remaining.set(v, d)
        if (d === 0) next.push(v)
      }
    }
    current = next
  }

  return {
    hasCycle: false,
    cycles: [],
    layers,
    rootNodeIds: layers[0] ?? [],
  }
}

/** Tarjan SCC — size > 1 인 컴포넌트만 (self-loop 도 사이클로 잡음). */
function findStronglyConnectedCycles(
  nodeIds: string[],
  adj: Map<string, string[]>,
): string[][] {
  let index = 0
  const stack: string[] = []
  const onStack = new Set<string>()
  const indices = new Map<string, number>()
  const lowlinks = new Map<string, number>()
  const result: string[][] = []

  function strongconnect(v: string) {
    indices.set(v, index)
    lowlinks.set(v, index)
    index++
    stack.push(v)
    onStack.add(v)

    for (const w of adj.get(v) ?? []) {
      if (!indices.has(w)) {
        strongconnect(w)
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!))
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!))
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = []
      while (true) {
        const w = stack.pop()!
        onStack.delete(w)
        scc.push(w)
        if (w === v) break
      }
      // size > 1 = 실제 cycle. size = 1 + self-loop 도 cycle.
      const hasSelfLoop = (adj.get(v) ?? []).includes(v)
      if (scc.length > 1 || hasSelfLoop) {
        result.push(scc)
      }
    }
  }

  for (const v of nodeIds) {
    if (!indices.has(v)) strongconnect(v)
  }

  return result
}
