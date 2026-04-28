import type {
  GraphData,
  GraphNode,
  RoadmapOverlayState,
} from "../_data/types";
import type { RelevanceDensity } from "./useGraphData";

// useGraphData에서 추출한 순수 셀렉터 모음.
// 모두 입력만 받고 새 값을 반환 — useMemo와 결합해 사용.

export interface GapNode {
  node: GraphNode;
  connectionCount: number;
  memoCount: number;
}

interface FilterParams {
  data: GraphData;
  activeFilters: Set<string>;
  localNodeIds: Set<string> | null;
  relevanceDensity: RelevanceDensity;
  roadmapOverlay: RoadmapOverlayState | null;
}

export function computeFilteredData({
  data,
  activeFilters,
  localNodeIds,
  relevanceDensity,
  roadmapOverlay,
}: FilterParams): GraphData {
  let nodes = data.nodes.filter((n) => activeFilters.has(n.type));
  if (localNodeIds) {
    nodes = nodes.filter((n) => localNodeIds.has(n.id));
  }
  if (roadmapOverlay) {
    const pathSet = new Set(roadmapOverlay.pathNodeIds);
    nodes = nodes.filter((n) => pathSet.has(n.id));
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  const threshold = roadmapOverlay
    ? 0
    : relevanceDensity === "compact"
      ? 0.7
      : relevanceDensity === "default"
        ? 0.4
        : 0;
  const edges = data.edges.filter(
    (e) =>
      nodeIds.has(e.source) &&
      nodeIds.has(e.target) &&
      (e.weight ?? 0.5) >= threshold,
  );
  return { nodes, edges };
}

export function computeLocalNodeIds(
  data: GraphData,
  selectedNodeId: string | null,
  enabled: boolean,
): Set<string> | null {
  if (!enabled || !selectedNodeId) return null;
  const ids = new Set<string>([selectedNodeId]);
  for (const e of data.edges) {
    if (e.source === selectedNodeId) ids.add(e.target);
    if (e.target === selectedNodeId) ids.add(e.source);
  }
  const hop1 = new Set(ids);
  for (const e of data.edges) {
    if (hop1.has(e.source)) ids.add(e.target);
    if (hop1.has(e.target)) ids.add(e.source);
  }
  return ids;
}

export function computeGapNodes(data: GraphData): GapNode[] {
  return data.nodes
    .filter((n) => n.type === "paper" || n.type === "concept")
    .map((n) => {
      const connections = data.edges.filter(
        (e) => e.source === n.id || e.target === n.id,
      );
      const memoConnections = connections.filter((e) => {
        const otherId = e.source === n.id ? e.target : e.source;
        const other = data.nodes.find((nd) => nd.id === otherId);
        return other?.type === "memo";
      });
      return {
        node: n,
        connectionCount: connections.length,
        memoCount: memoConnections.length,
      };
    })
    .filter((g) => g.memoCount === 0 && g.connectionCount < 3);
}

export function exportMarkdown(filteredData: GraphData): string {
  const now = new Date().toISOString().split("T")[0];
  const concepts = filteredData.nodes.filter((n) => n.type === "concept");
  const papers = filteredData.nodes.filter((n) => n.type === "paper");
  const memos = filteredData.nodes.filter((n) => n.type === "memo");
  let md = `# 지식 스냅샷\n*${now} 생성*\n\n`;
  if (concepts.length) {
    md += `## 핵심 개념 (${concepts.length})\n`;
    concepts.forEach((c) => (md += `- **${c.label}**: ${c.content}\n`));
    md += "\n";
  }
  if (papers.length) {
    md += `## 논문 (${papers.length})\n`;
    papers.forEach((p) => (md += `- **${p.label}** (${p.meta?.year ?? "?"})\n`));
    md += "\n";
  }
  if (memos.length) {
    md += `## 내 메모 (${memos.length})\n`;
    memos.forEach((m) => (md += `- ${m.label}: ${m.content}\n`));
  }
  return md;
}

export function searchKnowledge(
  data: GraphData,
  query: string,
): { answer: string; sources: GraphNode[] } {
  const q = query.toLowerCase();
  const matched = data.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q),
  );
  if (matched.length === 0) {
    return {
      answer:
        "관련된 지식을 찾을 수 없습니다. 그래프에 더 많은 논문과 메모를 추가해보세요.",
      sources: [],
    };
  }
  const snippets = matched
    .slice(0, 3)
    .map((n) => `"${n.label}: ${n.content.slice(0, 80)}..."`)
    .join("\n\n");
  return {
    answer: `당신의 지식에 따르면:\n\n${snippets}`,
    sources: matched.slice(0, 5),
  };
}
