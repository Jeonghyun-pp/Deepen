"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node as RFNode,
  type Edge as RFEdge,
  type EdgeTypes,
  type NodeChange,
  type NodeTypes,
  type ReactFlowInstance,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  RotateCcw,
  Plus,
  AlignVerticalJustifyCenter,
  Calendar,
  LayoutGrid,
  Waves,
} from "lucide-react";
import { useGraphStore } from "../../_store/graphStore";
import { useWhiteboardStore } from "../../_store/whiteboardStore";
import { computeDagreLayout, buildRoadmapClusters } from "../_utils/layout";
import { toRFEdge } from "../_utils/edgeStyle";
import {
  buildClusterCentroids,
  computeEdgeBundles,
} from "../_utils/bundling";
import {
  computeTimelineLayout,
  computeTimelineTicks,
  TIMELINE_CONSTANTS,
} from "../_utils/timelineLayout";
import { EDGE_COLORS, EDGE_TYPE_LABELS } from "../../_data/colors";
import CardNode from "./CardNode";
import SectionNode from "./SectionNode";
import RoadmapBackdropNode from "./RoadmapBackdropNode";
import ClusterNode from "./ClusterNode";
import TimelineAxisNode from "./TimelineAxisNode";
import BundledEdge from "./BundledEdge";

const nodeTypes: NodeTypes = {
  card: CardNode,
  section: SectionNode,
  roadmapBackdrop: RoadmapBackdropNode,
  cluster: ClusterNode,
  timelineAxis: TimelineAxisNode,
};

const edgeTypes: EdgeTypes = {
  bundled: BundledEdge,
};

// 섹션 기본 색상 팔레트 (Heptabase 스타일 파스텔 톤)
const SECTION_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

function fallbackGrid(index: number): { x: number; y: number } {
  const COLS = 4;
  return { x: (index % COLS) * 280, y: Math.floor(index / COLS) * 180 };
}

function findAnchorPosition(
  nodeId: string,
  edges: { source: string; target: string }[],
  existing: Record<string, { x: number; y: number }>,
  pending: Record<string, { x: number; y: number }>,
): { x: number; y: number } | null {
  const pool = { ...existing, ...pending };
  for (const e of edges) {
    if (e.source === nodeId && pool[e.target]) return pool[e.target];
    if (e.target === nodeId && pool[e.source]) return pool[e.source];
  }
  return null;
}

function findFreeSpace(
  existing: Record<string, { x: number; y: number }>,
  pending: Record<string, { x: number; y: number }>,
): { x: number; y: number } {
  const all = [...Object.values(existing), ...Object.values(pending)];
  if (all.length === 0) return { x: 100, y: 100 };
  const maxX = Math.max(...all.map((p) => p.x));
  const avgY = all.reduce((sum, p) => sum + p.y, 0) / all.length;
  return { x: maxX + 320, y: avgY };
}

const ROADMAP_COLORS = [
  "#6366f1",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];
function roadmapColor(index: number): string {
  return ROADMAP_COLORS[index % ROADMAP_COLORS.length];
}

type ViewMode = "normal" | "timeline";

export default function WhiteboardCanvas() {
  const data = useGraphStore((s) => s.data);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const roadmaps = useGraphStore((s) => s.roadmaps);
  const positions = useWhiteboardStore((s) => s.positions);
  const setPosition = useWhiteboardStore((s) => s.setPosition);
  const setPositions = useWhiteboardStore((s) => s.setPositions);
  const clearPositions = useWhiteboardStore((s) => s.clearPositions);
  const sections = useWhiteboardStore((s) => s.sections);
  const addSection = useWhiteboardStore((s) => s.addSection);
  const updateSection = useWhiteboardStore((s) => s.updateSection);

  // 뷰 모드 / 번들링 토글
  const [viewMode, setViewMode] = useState<ViewMode>("normal");
  const [bundleOn, setBundleOn] = useState(true);
  // 펼쳐진 Roadmap 클러스터 id 집합 (초기값: 비어있음 = 모두 축약 상태).
  // 사용자가 cluster 노드를 클릭하면 이 집합에 추가 → 해당 Roadmap 하위 카드가 보이게 됨.
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleClusterExpand = useCallback((roadmapId: string) => {
    setExpandedClusters((prev) => {
      const next = new Set(prev);
      if (next.has(roadmapId)) next.delete(roadmapId);
      else next.add(roadmapId);
      return next;
    });
  }, []);

  // 초기 배치 (normal 모드에서만 의미 있음)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (data.nodes.length === 0) return;
    const missing = data.nodes.filter((n) => !positions[n.id]);
    if (missing.length === 0) {
      didInitRef.current = true;
      return;
    }

    const isInitialBulk = !didInitRef.current;
    const entries: Record<string, { x: number; y: number }> = {};

    if (isInitialBulk) {
      try {
        const clusters = buildRoadmapClusters(roadmaps);
        const layout = computeDagreLayout(data, {
          direction: "TB",
          clusters,
        });
        for (const n of missing) {
          entries[n.id] = layout[n.id] ?? fallbackGrid(data.nodes.indexOf(n));
        }
      } catch {
        for (const n of missing) {
          entries[n.id] = fallbackGrid(data.nodes.indexOf(n));
        }
      }
      didInitRef.current = true;
    } else {
      for (const n of missing) {
        const anchor = findAnchorPosition(n.id, data.edges, positions, entries);
        if (anchor) {
          entries[n.id] = {
            x: anchor.x + 280 + Math.random() * 40,
            y: anchor.y + (Math.random() * 80 - 40),
          };
        } else {
          entries[n.id] = findFreeSpace(positions, entries);
        }
      }
    }

    setPositions(entries);
  }, [data, positions, roadmaps, setPositions]);

  // Timeline 레이아웃 (뷰 override — store엔 안 씀)
  const timelineResult = useMemo(
    () => (viewMode === "timeline" ? computeTimelineLayout(data) : null),
    [viewMode, data],
  );

  // 실제로 사용할 position 맵: timeline 모드면 timelineResult, 아니면 store positions.
  const effectivePositions = useMemo<Record<string, { x: number; y: number }>>(() => {
    if (viewMode === "timeline" && timelineResult) return timelineResult.positions;
    return positions;
  }, [viewMode, timelineResult, positions]);

  // 클러스터 매핑 / centroid — bundling & semantic zoom 양쪽에서 쓴다
  const nodeToCluster = useMemo(
    () => buildRoadmapClusters(roadmaps),
    [roadmaps],
  );
  const centroids = useMemo(
    () => buildClusterCentroids(roadmaps, effectivePositions),
    [roadmaps, effectivePositions],
  );

  // 각 노드가 "축약 상태 클러스터"에 속해 보이지 않는지 판별하는 헬퍼.
  // nodeId → (hidden이면 roadmapId, 아니면 null)
  const hiddenByCluster = useCallback(
    (nodeId: string): string | null => {
      if (viewMode !== "normal") return null;
      const rid = nodeToCluster[nodeId];
      if (!rid) return null;
      return expandedClusters.has(rid) ? null : rid;
    },
    [viewMode, nodeToCluster, expandedClusters],
  );

  // Roadmap backdrops — 펼쳐진 클러스터에만 배경 그림
  const roadmapBackdrops = useMemo<RFNode[]>(() => {
    if (viewMode !== "normal") return [];
    const PAD = 40;
    const CARD_W = 240;
    const CARD_H = 130;
    return roadmaps
      .map((rm, idx) => {
        if (!expandedClusters.has(rm.id)) return null; // 축약 중이면 backdrop 불필요
        const pts = rm.nodeIds
          .map((id) => effectivePositions[id])
          .filter((p): p is { x: number; y: number } => !!p);
        if (pts.length < 2) return null;
        const minX = Math.min(...pts.map((p) => p.x)) - PAD;
        const minY = Math.min(...pts.map((p) => p.y)) - PAD - 10;
        const maxX = Math.max(...pts.map((p) => p.x)) + CARD_W + PAD;
        const maxY = Math.max(...pts.map((p) => p.y)) + CARD_H + PAD;
        const color = roadmapColor(idx);
        return {
          id: `rm-backdrop-${rm.id}`,
          type: "roadmapBackdrop",
          position: { x: minX, y: minY },
          data: {
            title: rm.title,
            color,
            width: maxX - minX,
            height: maxY - minY,
          },
          draggable: false,
          selectable: false,
          zIndex: -1,
        } as RFNode;
      })
      .filter((n): n is RFNode => n !== null);
  }, [roadmaps, effectivePositions, viewMode, expandedClusters]);

  // Timeline 연도 축 tick 노드들
  const timelineAxisNodes = useMemo<RFNode[]>(() => {
    if (viewMode !== "timeline" || !timelineResult) return [];
    const ticks = computeTimelineTicks(timelineResult.yearRange);
    const height = TIMELINE_CONSTANTS.LANE_HEIGHT * (TIMELINE_CONSTANTS.LANE_ORDER.length + 2);
    return ticks.map((t) => ({
      id: `tl-axis-${t.year}`,
      type: "timelineAxis",
      position: { x: t.x, y: TIMELINE_CONSTANTS.TOP_MARGIN - 10 },
      data: { year: t.year, height },
      draggable: false,
      selectable: false,
      zIndex: -2,
    }));
  }, [viewMode, timelineResult]);

  // 축약 상태(=expandedClusters에 없는) Roadmap만 cluster 노드로 렌더
  const clusterNodes = useMemo<RFNode[]>(() => {
    if (viewMode !== "normal") return [];
    return roadmaps
      .map((rm, idx) => {
        if (expandedClusters.has(rm.id)) return null;
        const centroid = centroids[rm.id];
        if (!centroid) return null;
        const members = rm.nodeIds.filter((id) => effectivePositions[id]);
        if (members.length === 0) return null;
        return {
          id: `cluster-${rm.id}`,
          type: "cluster",
          position: { x: centroid.x - 110, y: centroid.y - 60 },
          data: {
            title: rm.title,
            color: roadmapColor(idx),
            count: members.length,
          },
          draggable: false,
          selectable: true,
          zIndex: 2,
        } as RFNode;
      })
      .filter((n): n is RFNode => n !== null);
  }, [viewMode, roadmaps, expandedClusters, centroids, effectivePositions]);

  // 실제 렌더할 노드 구성
  // - timeline 모드: 모든 카드 표시 (클러스터 개념 없음)
  // - normal 모드: 축약된 Roadmap은 cluster 노드로, 펼쳐진 Roadmap / 소속 없는 노드는 카드로
  const nodes = useMemo<RFNode[]>(() => {
    const sectionNodes: RFNode[] =
      viewMode === "normal"
        ? sections.map((sec) => ({
            id: sec.id,
            type: "section",
            position: { x: sec.bounds?.x ?? 0, y: sec.bounds?.y ?? 0 },
            data: { section: sec },
            draggable: true,
            selectable: true,
            zIndex: 0,
          }))
        : [];
    const cardNodes: RFNode[] = data.nodes
      .filter((n) => hiddenByCluster(n.id) === null)
      .map((n, i) => ({
        id: n.id,
        type: "card",
        position: effectivePositions[n.id] ?? fallbackGrid(i),
        data: { node: n },
        selected: n.id === selectedNodeId,
        draggable: viewMode === "normal",
        zIndex: 1,
      }));
    return [
      ...timelineAxisNodes,
      ...roadmapBackdrops,
      ...clusterNodes,
      ...sectionNodes,
      ...cardNodes,
    ];
  }, [
    timelineAxisNodes,
    clusterNodes,
    roadmapBackdrops,
    viewMode,
    sections,
    data.nodes,
    hiddenByCluster,
    effectivePositions,
    selectedNodeId,
  ]);

  // Edges: 끝점이 숨겨진 카드면 해당 cluster 노드로 rerouting.
  // 양쪽 모두 숨겨진 동일 cluster 쌍끼리는 aggregate 엣지로 병합.
  const edges = useMemo<RFEdge[]>(() => {
    const resolveEndpoint = (
      nodeId: string,
    ): { id: string; hiddenCluster: string | null } => {
      const hidden = hiddenByCluster(nodeId);
      if (hidden) return { id: `cluster-${hidden}`, hiddenCluster: hidden };
      return { id: nodeId, hiddenCluster: null };
    };

    // 1단계: 양쪽 모두 숨겨진(cluster→cluster, 서로 다른 cluster) 엣지를 aggregate로 묶기
    const aggCounts = new Map<string, { src: string; tgt: string; count: number }>();
    const remainingEdges: typeof data.edges = [];
    for (const e of data.edges) {
      const a = resolveEndpoint(e.source);
      const b = resolveEndpoint(e.target);
      if (
        a.hiddenCluster &&
        b.hiddenCluster &&
        a.hiddenCluster !== b.hiddenCluster
      ) {
        const key = `${a.hiddenCluster}→${b.hiddenCluster}`;
        const cur = aggCounts.get(key);
        if (cur) cur.count += 1;
        else
          aggCounts.set(key, {
            src: a.hiddenCluster,
            tgt: b.hiddenCluster,
            count: 1,
          });
        continue;
      }
      // 같은 숨김 cluster 안 → 렌더 skip
      if (
        a.hiddenCluster &&
        b.hiddenCluster &&
        a.hiddenCluster === b.hiddenCluster
      ) {
        continue;
      }
      remainingEdges.push(e);
    }

    const aggregated: RFEdge[] = Array.from(aggCounts.entries()).map(
      ([key, v]) => ({
        id: `agg-${key}`,
        source: `cluster-${v.src}`,
        target: `cluster-${v.tgt}`,
        type: "default",
        style: { stroke: "#9ca3af", strokeWidth: 1 + Math.log2(v.count + 1) },
        label: `${v.count}`,
        labelStyle: { fontSize: 10, fill: "#6b7280" },
        labelBgStyle: { fill: "#fff", fillOpacity: 0.9 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#9ca3af",
          width: 14,
          height: 14,
        },
      }),
    );

    // 2단계: 남은 엣지에 HEB 번들링 적용
    const bundles =
      bundleOn && viewMode === "normal"
        ? computeEdgeBundles(remainingEdges, nodeToCluster, centroids, 0.85)
        : {};

    const rest: RFEdge[] = remainingEdges.map((e) => {
      const a = resolveEndpoint(e.source);
      const b = resolveEndpoint(e.target);
      const rerouted = a.hiddenCluster !== null || b.hiddenCluster !== null;
      const bundle = bundles[e.id];

      if (bundle && !rerouted) {
        const color = EDGE_COLORS[e.type];
        const dashed =
          e.type === "citation" ||
          e.type === "similarity" ||
          e.type === "shared_concept";
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: "bundled",
          data: {
            control: bundle.control,
            groupSize: bundle.groupSize,
            color,
            dashed,
            labelText: e.label ?? EDGE_TYPE_LABELS[e.type],
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 14,
            height: 14,
          },
        } as RFEdge;
      }

      if (rerouted) {
        const color = EDGE_COLORS[e.type];
        return {
          id: e.id,
          source: a.id,
          target: b.id,
          type: "default",
          style: { stroke: color, strokeWidth: 1.25, opacity: 0.85 },
          label: e.label ?? EDGE_TYPE_LABELS[e.type],
          labelStyle: { fontSize: 10, fill: "#6b7280" },
          labelBgStyle: { fill: "#fff", fillOpacity: 0.85 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 14,
            height: 14,
          },
        } as RFEdge;
      }

      return toRFEdge(e);
    });

    return [...aggregated, ...rest];
  }, [data.edges, hiddenByCluster, nodeToCluster, centroids, bundleOn, viewMode]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) {
        if (c.type === "select") {
          const isSection = sections.some((s) => s.id === c.id);
          if (isSection) continue;
          if (typeof c.id === "string" && c.id.startsWith("cluster-")) continue;
          selectNode(c.selected ? c.id : null);
        }
      }
    },
    [selectNode, sections],
  );

  // cluster 노드 클릭 → 해당 Roadmap 펼치기/접기
  const onNodeClick = useCallback(
    (_: unknown, node: RFNode) => {
      if (node.type !== "cluster") return;
      const rid = node.id.replace(/^cluster-/, "");
      toggleClusterExpand(rid);
    },
    [toggleClusterExpand],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: RFNode) => {
      if (viewMode === "timeline") return; // timeline 모드에선 드래그 비활성이지만 안전 가드
      const section = sections.find((s) => s.id === node.id);
      if (section) {
        const prevX = section.bounds?.x ?? 0;
        const prevY = section.bounds?.y ?? 0;
        const dx = node.position.x - prevX;
        const dy = node.position.y - prevY;
        updateSection(section.id, {
          bounds: {
            x: node.position.x,
            y: node.position.y,
            w: section.bounds?.w ?? 400,
            h: section.bounds?.h ?? 300,
          },
        });
        if ((dx !== 0 || dy !== 0) && section.nodeIds.length > 0) {
          const updates: Record<string, { x: number; y: number }> = {};
          for (const nid of section.nodeIds) {
            const pos = positions[nid];
            if (!pos) continue;
            updates[nid] = { x: pos.x + dx, y: pos.y + dy };
          }
          setPositions(updates);
        }
        return;
      }
      setPosition(node.id, { x: node.position.x, y: node.position.y });
    },
    [viewMode, sections, positions, setPosition, setPositions, updateSection],
  );

  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      if (!selectedNodeId) return;
      const pos = positions[selectedNodeId];
      if (!pos) return;
      instance.setCenter(pos.x + 120, pos.y + 80, { zoom: 1, duration: 400 });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleResetLayout = useCallback(() => {
    if (!confirm("배치를 초기화합니다. 저장된 모든 위치가 사라져요.")) return;
    clearPositions();
    didInitRef.current = false;
  }, [clearPositions]);

  const handleDagreAlign = useCallback(() => {
    if (
      !confirm(
        "선수관계 + 로드맵 기반으로 위→아래 정렬합니다. 직접 배치한 위치는 덮어써져요.",
      )
    )
      return;
    try {
      const clusters = buildRoadmapClusters(roadmaps);
      const layout = computeDagreLayout(data, {
        direction: "TB",
        clusters,
      });
      if (Object.keys(layout).length > 0) {
        setPositions(layout);
      }
    } catch {
      alert("정렬에 실패했습니다.");
    }
  }, [data, roadmaps, setPositions]);

  const handleCreateSection = useCallback(() => {
    const title = prompt("섹션 이름을 입력하세요", "새 섹션");
    if (!title) return;
    const color = SECTION_COLORS[sections.length % SECTION_COLORS.length];
    let x = 100;
    let y = 100;
    if (selectedNodeId && positions[selectedNodeId]) {
      x = positions[selectedNodeId].x - 60;
      y = positions[selectedNodeId].y - 60;
    }
    const id = `sec-${Date.now()}`;
    addSection({
      id,
      title,
      color,
      nodeIds: selectedNodeId ? [selectedNodeId] : [],
      roadmapId: "default",
      bounds: { x, y, w: 420, h: 320 },
      createdAt: new Date().toISOString(),
    });
  }, [selectedNodeId, positions, sections.length, addSection]);

  const toggleViewMode = useCallback(() => {
    setViewMode((m) => (m === "normal" ? "timeline" : "normal"));
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedClusters(new Set(roadmaps.map((r) => r.id)));
  }, [roadmaps]);

  const handleCollapseAll = useCallback(() => {
    setExpandedClusters(new Set());
  }, []);

  const allExpanded =
    roadmaps.length > 0 &&
    roadmaps.every((r) => expandedClusters.has(r.id));

  return (
    <div className="w-full h-full relative">
      {/* 툴바 */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleViewMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs shadow-sm ${
            viewMode === "timeline"
              ? "bg-indigo-500 text-white border-indigo-500"
              : "bg-white/90 backdrop-blur border-border text-text hover:bg-gray-50"
          }`}
          title="Timeline / Normal 토글"
        >
          {viewMode === "timeline" ? <LayoutGrid size={12} /> : <Calendar size={12} />}
          {viewMode === "timeline" ? "Normal 보기" : "Timeline 보기"}
        </button>
        <button
          type="button"
          onClick={() => setBundleOn((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs shadow-sm ${
            bundleOn
              ? "bg-amber-500 text-white border-amber-500"
              : "bg-white/90 backdrop-blur border-border text-text hover:bg-gray-50"
          }`}
          title="Hierarchical Edge Bundling 토글"
        >
          <Waves size={12} />
          {bundleOn ? "Bundle On" : "Bundle Off"}
        </button>
        {viewMode === "normal" && (
          <>
            <button
              type="button"
              onClick={allExpanded ? handleCollapseAll : handleExpandAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text hover:bg-gray-50 shadow-sm"
              title="모든 Roadmap 클러스터 펼치기/접기"
            >
              <LayoutGrid size={12} />
              {allExpanded ? "모두 접기" : "모두 펼치기"}
            </button>
            <button
              type="button"
              onClick={handleCreateSection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text hover:bg-gray-50 shadow-sm"
              title="선택한 카드를 포함한 새 섹션 만들기"
            >
              <Plus size={12} />
              새 섹션
            </button>
            <button
              type="button"
              onClick={handleDagreAlign}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text hover:bg-gray-50 shadow-sm"
              title="선수관계 기반 DAG 정렬 (위→아래)"
            >
              <AlignVerticalJustifyCenter size={12} />
              DAG 정렬
            </button>
            <button
              type="button"
              onClick={handleResetLayout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text-muted hover:text-text shadow-sm"
              title="저장된 배치를 지우고 자동 정렬"
            >
              <RotateCcw size={12} />
              배치 초기화
            </button>
          </>
        )}
      </div>

      {/* 상태 힌트 */}
      {viewMode === "normal" && expandedClusters.size === 0 && roadmaps.length > 0 && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-xs text-indigo-700 shadow-sm">
          클러스터를 클릭하면 하위 카드가 펼쳐집니다
        </div>
      )}
      {viewMode === "timeline" && timelineResult && !timelineResult.yearRange && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700 shadow-sm">
          연도 정보가 있는 노드가 없습니다
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={() => selectNode(null)}
        onNodeDragStop={onNodeDragStop}
        onInit={handleInit}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
