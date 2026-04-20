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

// Palette aligned with landing-v2: v2-green (#22C55E) = selection/active accent,
// v2-mint / v2-paper = surfaces, v2-line-ish neutrals = inactive.
const theme = {
  ...lightTheme,
  canvas: { background: "#F3F8F5" },
  node: {
    ...lightTheme.node,
    fill: "#9CA3AF",
    activeFill: "#22C55E",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.04,
    label: {
      ...lightTheme.node.label,
      color: "#4A4A6A",
      stroke: "#FFFFFF",
      activeColor: "#15803D",
    },
  },
  ring: { fill: "#E4EDE6", activeFill: "#22C55E" },
  edge: {
    ...lightTheme.edge,
    fill: "#D8D8E8",
    activeFill: "#22C55E",
    opacity: 1,
    selectedOpacity: 1,
    inactiveOpacity: 0.02,
    label: {
      ...lightTheme.edge.label,
      color: "#8888A0",
      stroke: "#FFFFFF",
      activeColor: "#15803D",
    },
  },
  arrow: { fill: "#D8D8E8", activeFill: "#22C55E" },
  lasso: { background: "rgba(34,197,94,0.08)", border: "1px solid #22C55E" },
  cluster: {
    stroke: "#E4EDE6",
    fill: "#F0F7F2",
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

// degree 상위 HUB_LABEL_TOP_N 노드만 쉬는 상태에서 라벨 표시.
// 나머지는 hover/select/search 등 actives에 들어가야 라벨이 켜진다.
const HUB_LABEL_TOP_N = 15;

// degreeMap과 hubSet은 data(엣지 구조)가 바뀔 때만 재계산 — hover/select에 무관.
function computeDegreeAndHubs(data: GraphData) {
  const degreeMap = new Map<string, number>();
  for (const e of data.edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  }
  const hubSet = new Set(
    [...degreeMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, HUB_LABEL_TOP_N)
      .map(([id]) => id),
  );
  return { degreeMap, hubSet };
}

function toReagraphNodes(
  data: GraphData,
  degreeMap: Map<string, number>,
  hubSet: Set<string>,
  actives: string[],
  gapNodeIds?: Set<string>,
): RGNode[] {
  const activesSet = new Set(actives);

  return data.nodes.map((n) => {
    const base = NODE_BASE_SIZE[n.type] ?? 10;
    const degree = degreeMap.get(n.id) || 0;
    const degreeBonus = n.type === "paper" ? degree * 1.5 : degree * 0.5;
    const showLabel = hubSet.has(n.id) || activesSet.has(n.id);
    return {
      id: n.id,
      label: showLabel ? n.label : "",
      fill: gapNodeIds?.has(n.id) ? "#f59e0b" : NODE_COLORS[n.type],
      size: Math.min(40, base + degreeBonus),
      data: n,
    };
  });
}

// 엣지 3종 시각 계층:
//   prerequisite — 학습 순서, 화살표 있음, 굵기 강조
//   contains     — 상위→하위 포함, 연한 실선, 화살표 있음
//   relatedTo    — 같은 맥락, 점선, 방향 없음
function toReagraphEdges(data: GraphData): RGEdge[] {
  return data.edges.map((e) => {
    const w = e.weight ?? 0.5;

    let size: number;
    let dashed: boolean;
    let arrowPlacement: "end" | "none";

    if (e.type === "prerequisite") {
      size = 1.4 + w * 2.0;
      dashed = false;
      arrowPlacement = "end";
    } else if (e.type === "contains") {
      size = 0.4 + w * 0.6;
      dashed = false;
      arrowPlacement = "end";
    } else {
      // relatedTo
      size = 0.7 + w * 0.8;
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

    // degreeMap/hubSet은 data 기준으로만 memo — hover/select에 재계산 안 함
    const { degreeMap, hubSet } = useMemo(() => computeDegreeAndHubs(data), [data]);

    const nodes = useMemo(
      () => toReagraphNodes(data, degreeMap, hubSet, actives, gapNodeIds),
      [data, degreeMap, hubSet, actives, gapNodeIds],
    );
    const edges = useMemo(() => toReagraphEdges(data), [data]);

    const layoutType = toReagraphLayoutType(layoutId, viewMode) as LayoutTypes;
    const cameraMode = viewMode === "3d" ? "rotate" : ("pan" as const);

    const layoutOverrides = useMemo(() => {
      if (layoutId !== "forceDirected") return undefined;
      return {
        centerInertia: 0.8,
        nodeStrength: -350,
        linkDistance: 170,
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
