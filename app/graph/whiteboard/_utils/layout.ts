import Dagre from "@dagrejs/dagre";
import type { GraphData } from "../../_data/types";

// Whiteboard 초기 배치 계산 (dagre 기반).
// 사용자 배치가 없는 노드에 한해 힌트로 사용됨.
// Phase 7에서 "DAG 정렬" 버튼으로 재사용.

const NODE_W = 240;
const NODE_H = 120;

export interface LayoutOptions {
  direction?: "TB" | "LR";
  // nodeId → clusterId 매핑. 같은 cluster의 노드들이 공간적으로 인접하게 배치됨.
  // 주 용도: Roadmap 단위 클러스터링 (같은 로드맵 = 같이 묶임).
  clusters?: Record<string, string>;
}

export function computeDagreLayout(
  data: GraphData,
  options: LayoutOptions | "TB" | "LR" = "TB",
): Record<string, { x: number; y: number }> {
  const opts: LayoutOptions =
    typeof options === "string" ? { direction: options } : options;
  const direction = opts.direction ?? "TB";
  const useCompound = !!opts.clusters && Object.keys(opts.clusters).length > 0;

  const g = new Dagre.graphlib.Graph({ compound: useCompound });
  g.setGraph({
    rankdir: direction,
    nodesep: 40,
    ranksep: 80,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Cluster(부모) 노드 먼저 등록
  if (useCompound && opts.clusters) {
    const clusterIds = new Set(Object.values(opts.clusters));
    for (const cid of clusterIds) {
      g.setNode(cid, {});
    }
  }

  for (const n of data.nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
    if (useCompound && opts.clusters) {
      const cid = opts.clusters[n.id];
      if (cid) g.setParent(n.id, cid);
    }
  }
  for (const e of data.edges) {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  Dagre.layout(g);

  const result: Record<string, { x: number; y: number }> = {};
  for (const n of data.nodes) {
    const node = g.node(n.id);
    if (!node) continue;
    result[n.id] = {
      x: node.x - NODE_W / 2,
      y: node.y - NODE_H / 2,
    };
  }
  return result;
}

// Roadmap 배열 → nodeId별 cluster 매핑 생성.
// 노드가 여러 로드맵에 속하면 첫 번째 것을 사용(단순화).
export function buildRoadmapClusters(
  roadmaps: { id: string; nodeIds: string[] }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const rm of roadmaps) {
    for (const nid of rm.nodeIds) {
      if (!map[nid]) map[nid] = rm.id;
    }
  }
  return map;
}
