import type { GraphData, GraphNode, GraphEdge, EdgeType } from "./types";

// ============================================================
// Graph projection helpers
// 단일 그래프에서 특정 관점(paper 중심 subgraph, 경로 등)을 추출.
// v2에서 "6-layer 텍스트"를 대체하는 핵심 유틸.
// ============================================================

export interface SubgraphSection {
  relationType: EdgeType;
  items: { edge: GraphEdge; target: GraphNode }[];
}

export interface PaperSubgraph {
  center: GraphNode;
  sections: SubgraphSection[];
}

// 기본 섹션 순서 — DocDetailView 렌더링 우선순위
export const DEFAULT_SECTION_ORDER: EdgeType[] = [
  "prerequisite",
  "contains",
  "relatedTo",
];

/**
 * 특정 노드(주로 Paper)를 중심으로 outgoing typed edges를 섹션별로 묶어 반환.
 * relationTypes 인자로 섹션 필터링 가능. (기본: DEFAULT_SECTION_ORDER)
 */
export function getPaperSubgraph(
  data: GraphData,
  centerId: string,
  relationTypes: EdgeType[] = DEFAULT_SECTION_ORDER,
): PaperSubgraph | null {
  const center = data.nodes.find((n) => n.id === centerId);
  if (!center) return null;

  const nodeById = new Map(data.nodes.map((n) => [n.id, n]));

  const sections: SubgraphSection[] = relationTypes.map((rt) => {
    const items = data.edges
      .filter((e) => e.source === centerId && e.type === rt)
      .map((edge) => {
        const target = nodeById.get(edge.target);
        return target ? { edge, target } : null;
      })
      .filter((x): x is { edge: GraphEdge; target: GraphNode } => x !== null);
    return { relationType: rt, items };
  });

  return { center, sections };
}

/**
 * 두 노드 사이 최단 경로 (undirected). BFS.
 * 경로가 없으면 빈 배열 반환.
 */
export function getPathBetween(
  data: GraphData,
  startId: string,
  goalId: string,
): string[] {
  if (startId === goalId) return [startId];

  const adj = new Map<string, Set<string>>();
  for (const e of data.edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set());
    if (!adj.has(e.target)) adj.set(e.target, new Set());
    adj.get(e.source)!.add(e.target);
    adj.get(e.target)!.add(e.source);
  }

  const queue: string[][] = [[startId]];
  const visited = new Set<string>([startId]);

  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    const neighbors = adj.get(last);
    if (!neighbors) continue;
    for (const next of neighbors) {
      if (next === goalId) return [...path, next];
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }
  return [];
}

/**
 * 특정 노드의 1-hop 이웃(outgoing/incoming)을 모두 반환.
 * Agent tool(query_graph)에서 사용.
 */
export function getNeighbors(
  data: GraphData,
  nodeId: string,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const relatedEdges = data.edges.filter(
    (e) => e.source === nodeId || e.target === nodeId,
  );
  const neighborIds = new Set<string>();
  for (const e of relatedEdges) {
    if (e.source !== nodeId) neighborIds.add(e.source);
    if (e.target !== nodeId) neighborIds.add(e.target);
  }
  const nodes = data.nodes.filter((n) => neighborIds.has(n.id));
  return { nodes, edges: relatedEdges };
}

/**
 * label 기반 fuzzy 매칭으로 노드를 찾는다. Agent가 ID 모를 때 사용.
 */
export function findNodeByLabel(
  data: GraphData,
  query: string,
): GraphNode | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  const exact = data.nodes.find((n) => n.label.toLowerCase() === q);
  if (exact) return exact;
  const partial = data.nodes.find((n) => n.label.toLowerCase().includes(q));
  return partial ?? null;
}
