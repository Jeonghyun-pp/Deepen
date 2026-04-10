"use client";

import { useRef, useMemo, useImperativeHandle, forwardRef } from "react";
import {
  GraphCanvas as ReagraphCanvas,
  GraphCanvasRef,
  lightTheme,
  type GraphNode as RGNode,
  type GraphEdge as RGEdge,
  type LayoutTypes,
} from "reagraph";
import type { GraphData } from "../_data/types";
import { NODE_COLORS, EDGE_COLORS } from "../_data/colors";
import { type ViewMode, type LayoutId, type EdgeStyle, toReagraphLayoutType } from "../_hooks/useGraphData";

const theme = {
  ...lightTheme,
  canvas: { background: "#FFFFFF" },
  node: {
    ...lightTheme.node,
    fill: "#9CA3AF",
    activeFill: "#4A90FF",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.15,
    label: {
      ...lightTheme.node.label,
      color: "#4A4A6A",
      stroke: "#FFFFFF",
      activeColor: "#4A90FF",
    },
  },
  ring: { fill: "#E8E8F0", activeFill: "#4A90FF" },
  edge: {
    ...lightTheme.edge,
    fill: "#D8D8E8",
    activeFill: "#4A90FF",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.08,
    label: {
      ...lightTheme.edge.label,
      color: "#8888A0",
      stroke: "#FFFFFF",
      activeColor: "#4A90FF",
    },
  },
  arrow: { fill: "#D8D8E8", activeFill: "#4A90FF" },
  lasso: { background: "rgba(74,144,255,0.08)", border: "1px solid #4A90FF" },
  cluster: {
    stroke: "#E8E8F0",
    fill: "#EEF3FF",
    opacity: 0.2,
    label: { color: "#8888A0", fontSize: 2 },
  },
};

// 타입별 기본 크기: paper(핵심, 크게) > memo/document(중간) > concept(위성, 작게)
const NODE_BASE_SIZE: Record<string, number> = {
  paper: 18,
  concept: 8,
  memo: 12,
  document: 12,
};

function toReagraphNodes(data: GraphData, gapNodeIds?: Set<string>): RGNode[] {
  const degreeMap = new Map<string, number>();
  for (const e of data.edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  }

  return data.nodes.map((n) => {
    const base = NODE_BASE_SIZE[n.type] ?? 10;
    const degree = degreeMap.get(n.id) || 0;
    // degree 보정: paper는 연결 많을수록 더 커짐, 나머지는 소폭 보정
    const degreeBonus = n.type === "paper" ? degree * 1.5 : degree * 0.5;
    return {
      id: n.id,
      label: n.label,
      fill: gapNodeIds?.has(n.id) ? "#f59e0b" : NODE_COLORS[n.type],
      size: Math.min(40, base + degreeBonus),
      data: n,
    };
  });
}

// 엣지 3단계 시각 계층:
//   1단계 — citation: 빨간 굵은 화살표 (논문 간 직접 인용)
//   2단계 — shared_concept/similarity/manual: 회색 점선 (느슨한 연관)
//   3단계 — contains: 연한 얇은 선 (개념↔논문 소속)
function toReagraphEdges(data: GraphData): RGEdge[] {
  return data.edges.map((e) => {
    const w = e.weight ?? 0.5;

    let size: number;
    let dashed: boolean;
    let arrowPlacement: "end" | "none";

    if (e.type === "citation") {
      // 1단계: 굵은 화살표, weight로 굵기 보정
      size = 2 + w * 2.5;
      dashed = false;
      arrowPlacement = "end";
    } else if (e.type === "contains") {
      // 3단계: 연한 얇은 선
      size = 0.3 + w * 0.5;
      dashed = false;
      arrowPlacement = "none";
    } else {
      // 2단계: 회색 점선 (shared_concept, similarity, manual)
      size = 0.8 + w * 1.0;
      dashed = true;
      arrowPlacement = "none";
    }

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      fill: EDGE_COLORS[e.type],
      size,
      arrowPlacement,
      dashed,
      label: e.label || undefined,
      data: e,
    };
  });
}

export interface GraphCanvasHandle {
  centerGraph: (ids?: string[]) => void;
  fitView: () => void;
}

export interface NodeClickEvent {
  id: string;
  screenX: number;
  screenY: number;
  shiftKey: boolean;
}

export interface NodeHoverEvent {
  id: string;
  screenX: number;
  screenY: number;
}

interface Props {
  data: GraphData;
  viewMode: ViewMode;
  layoutId: LayoutId;
  edgeStyle: EdgeStyle;
  selections: string[];
  actives: string[];
  gapNodeIds?: Set<string>;
  onNodeClick: (event: NodeClickEvent) => void;
  onNodeDoubleClick?: (id: string) => void;
  onCanvasClick: () => void;
  onNodeHover?: (event: NodeHoverEvent | null) => void;
}

const GraphCanvasWrapper = forwardRef<GraphCanvasHandle, Props>(
  function GraphCanvasWrapper({ data, viewMode, layoutId, edgeStyle, selections, actives, gapNodeIds, onNodeClick, onNodeDoubleClick, onCanvasClick, onNodeHover }, ref) {
    const graphRef = useRef<GraphCanvasRef>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    useImperativeHandle(ref, () => ({
      centerGraph: (ids?: string[]) => {
        if (ids?.length) {
          graphRef.current?.centerGraph(ids);
        } else {
          graphRef.current?.centerGraph();
        }
      },
      fitView: () => {
        graphRef.current?.fitNodesInView();
      },
    }));

    const nodes = useMemo(() => toReagraphNodes(data, gapNodeIds), [data, gapNodeIds]);
    const edges = useMemo(() => toReagraphEdges(data), [data]);

    const layoutType = toReagraphLayoutType(layoutId, viewMode) as LayoutTypes;
    const cameraMode = viewMode === "3d" ? "rotate" : ("pan" as const);

    // 중력장 레이아웃: 중요 노드가 중심, 위성은 자연스럽게 퍼짐
    // clusterAttribute 없이 순수 중력+반발력으로 배치
    const layoutOverrides = useMemo(() => {
      if (layoutId !== "forceDirected") return undefined;
      return {
        centerInertia: 0.8,    // 약한 중심 인력 → 노드가 중앙에 뭉치지 않음
        nodeStrength: -350,    // 강한 반발력 → 노드 간격 충분히 확보
        linkDistance: 170,     // 넉넉한 링크 거리 → 선 교차 감소
      };
    }, [layoutId]);

    return (
      <div
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
        onPointerMove={(e) => {
          lastPointer.current = { x: e.clientX, y: e.clientY };
        }}
      >
      <ReagraphCanvas
        ref={graphRef}
        nodes={nodes}
        edges={edges}
        layoutType={layoutType}
        layoutOverrides={layoutOverrides}
        cameraMode={cameraMode}
        theme={theme}
        selections={selections}
        actives={actives}
        edgeInterpolation={edgeStyle}
        edgeArrowPosition="end"
        sizingType="none"
        defaultNodeSize={12}
        minNodeSize={8}
        maxNodeSize={30}
        labelType="auto"
        draggable
        animated
        onNodeClick={(node, _props, event) => {
          const e = event?.nativeEvent;
          onNodeClick({
            id: node.id,
            screenX: e?.clientX ?? 0,
            screenY: e?.clientY ?? 0,
            shiftKey: Boolean(e?.shiftKey),
          });
        }}
        onNodeDoubleClick={(node) => onNodeDoubleClick?.(node.id)}
        onCanvasClick={() => {
          if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
          }
          onNodeHover?.(null);
          onCanvasClick();
        }}
        onNodePointerOver={(node) => {
          if (!onNodeHover) return;
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          const { x, y } = lastPointer.current;
          hoverTimer.current = setTimeout(() => {
            onNodeHover({ id: node.id, screenX: x, screenY: y });
          }, 150);
        }}
        onNodePointerOut={() => {
          if (!onNodeHover) return;
          if (hoverTimer.current) {
            clearTimeout(hoverTimer.current);
            hoverTimer.current = null;
          }
          onNodeHover(null);
        }}
      />
      </div>
    );
  }
);

export default GraphCanvasWrapper;
