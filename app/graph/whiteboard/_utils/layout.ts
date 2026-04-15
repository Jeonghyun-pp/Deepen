import Dagre from "@dagrejs/dagre";
import type { GraphData } from "../../_data/types";

// Whiteboard 초기 배치 계산 (dagre 기반).
// 사용자 배치가 없는 노드에 한해 힌트로 사용됨.
// Phase 7에서 "DAG 정렬" 버튼으로 재사용.

const NODE_W = 240;
const NODE_H = 120;

export function computeDagreLayout(
  data: GraphData,
  direction: "TB" | "LR" = "TB",
): Record<string, { x: number; y: number }> {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of data.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const e of data.edges) {
    // dagre는 존재하는 노드에 대해서만 엣지 추가 가능
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  Dagre.layout(g);

  const result: Record<string, { x: number; y: number }> = {};
  for (const n of data.nodes) {
    const node = g.node(n.id);
    if (!node) continue;
    // dagre는 중심 좌표를 반환 → React Flow는 좌상단 기준이라 변환
    result[n.id] = {
      x: node.x - NODE_W / 2,
      y: node.y - NODE_H / 2,
    };
  }
  return result;
}
