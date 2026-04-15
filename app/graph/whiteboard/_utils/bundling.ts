import type { GraphEdge, Roadmap } from "../../_data/types";

// Hierarchical Edge Bundling (MVP)
// 같은 (sourceCluster → targetCluster) 쌍에 속한 inter-cluster 엣지들이
// 공통 제어점을 지나는 곡선 다발이 되도록 각 엣지에 control point를 부여한다.
//
// 전략:
// 1. buildRoadmapClusters로 nodeId → clusterId 매핑
// 2. 각 클러스터의 centroid(멤버 노드 위치 평균) 계산
// 3. inter-cluster 엣지는 (src centroid, dst centroid)의 중간점을 공유 제어점으로 사용
// 4. intra-cluster 엣지는 번들링 대상 아님 (undefined 반환)

export interface Point {
  x: number;
  y: number;
}

export interface BundleInfo {
  control: Point;
  groupKey: string;
  groupSize: number;
}

export function buildClusterCentroids(
  roadmaps: Roadmap[],
  positions: Record<string, Point>,
  cardSize: { w: number; h: number } = { w: 240, h: 130 },
): Record<string, Point> {
  const centroids: Record<string, Point> = {};
  for (const rm of roadmaps) {
    const pts = rm.nodeIds
      .map((id) => positions[id])
      .filter((p): p is Point => !!p);
    if (pts.length === 0) continue;
    const cx =
      pts.reduce((s, p) => s + p.x, 0) / pts.length + cardSize.w / 2;
    const cy =
      pts.reduce((s, p) => s + p.y, 0) / pts.length + cardSize.h / 2;
    centroids[rm.id] = { x: cx, y: cy };
  }
  return centroids;
}

// edgeId → BundleInfo 매핑. intra-cluster/불가능한 엣지는 포함하지 않음.
export function computeEdgeBundles(
  edges: GraphEdge[],
  nodeToCluster: Record<string, string>,
  centroids: Record<string, Point>,
  bundleStrength = 0.85,
): Record<string, BundleInfo> {
  const groupCounts: Record<string, number> = {};
  const pairControl: Record<string, Point> = {};

  for (const e of edges) {
    const sc = nodeToCluster[e.source];
    const tc = nodeToCluster[e.target];
    if (!sc || !tc || sc === tc) continue;
    const key = `${sc}→${tc}`;
    groupCounts[key] = (groupCounts[key] ?? 0) + 1;
    if (!pairControl[key]) {
      const sCen = centroids[sc];
      const tCen = centroids[tc];
      if (!sCen || !tCen) continue;
      // 중간점을 두 centroid 사이의 bundleStrength 비율 위치에 둔다
      // bundleStrength=1 이면 완벽한 중점
      const mx = (sCen.x + tCen.x) / 2;
      const my = (sCen.y + tCen.y) / 2;
      pairControl[key] = { x: mx, y: my };
      // bundleStrength < 1: 제어점을 곧은 선 쪽으로 당김 (번들링 완화)
      if (bundleStrength < 1) {
        pairControl[key] = {
          x: mx * bundleStrength + ((sCen.x + tCen.x) / 2) * (1 - bundleStrength),
          y: my * bundleStrength + ((sCen.y + tCen.y) / 2) * (1 - bundleStrength),
        };
      }
    }
  }

  const result: Record<string, BundleInfo> = {};
  for (const e of edges) {
    const sc = nodeToCluster[e.source];
    const tc = nodeToCluster[e.target];
    if (!sc || !tc || sc === tc) continue;
    const key = `${sc}→${tc}`;
    const ctrl = pairControl[key];
    const size = groupCounts[key] ?? 1;
    if (!ctrl || size < 2) continue; // 묶을 게 최소 2개는 있어야 번들링 의미
    result[e.id] = { control: ctrl, groupKey: key, groupSize: size };
  }
  return result;
}
