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
import { type ViewMode, type LayoutId, toReagraphLayoutType } from "../_hooks/useGraphData";

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

function toReagraphNodes(data: GraphData): RGNode[] {
  const degreeMap = new Map<string, number>();
  for (const e of data.edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) || 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) || 0) + 1);
  }

  return data.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    fill: NODE_COLORS[n.type],
    size: Math.max(3, (degreeMap.get(n.id) || 0) * 1.5),
    data: n,
  }));
}

function toReagraphEdges(data: GraphData): RGEdge[] {
  return data.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    fill: EDGE_COLORS[e.type],
    size: e.type === "citation" ? 2 : 1,
    arrowPlacement: e.type === "citation" ? "end" as const : "none" as const,
    dashed: e.type === "shared_concept" || e.type === "similarity",
    label: undefined,
    data: e,
  }));
}

export interface GraphCanvasHandle {
  centerGraph: (ids?: string[]) => void;
  fitView: () => void;
}

interface Props {
  data: GraphData;
  viewMode: ViewMode;
  layoutId: LayoutId;
  selections: string[];
  actives: string[];
  onNodeClick: (id: string) => void;
  onCanvasClick: () => void;
}

const GraphCanvasWrapper = forwardRef<GraphCanvasHandle, Props>(
  function GraphCanvasWrapper({ data, viewMode, layoutId, selections, actives, onNodeClick, onCanvasClick }, ref) {
    const graphRef = useRef<GraphCanvasRef>(null);

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

    const nodes = useMemo(() => toReagraphNodes(data), [data]);
    const edges = useMemo(() => toReagraphEdges(data), [data]);

    const layoutType = toReagraphLayoutType(layoutId, viewMode) as LayoutTypes;
    const cameraMode = viewMode === "3d" ? "rotate" : ("pan" as const);

    return (
      <div style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
      <ReagraphCanvas
        ref={graphRef}
        nodes={nodes}
        edges={edges}
        layoutType={layoutType}
        cameraMode={cameraMode}
        theme={theme}
        selections={selections}
        actives={actives}
        edgeInterpolation="curved"
        edgeArrowPosition="end"
        sizingType="none"
        defaultNodeSize={5}
        minNodeSize={3}
        maxNodeSize={15}
        labelType="auto"
        draggable
        animated
        onNodeClick={(node) => onNodeClick(node.id)}
        onCanvasClick={onCanvasClick}
      />
      </div>
    );
  }
);

export default GraphCanvasWrapper;
