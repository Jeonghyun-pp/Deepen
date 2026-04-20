import { MarkerType, type Edge as RFEdge } from "@xyflow/react";
import type { GraphEdge, EdgeType } from "../../_data/types";
import { EDGE_COLORS, EDGE_TYPE_LABELS } from "../../_data/colors";

// 엣지 카테고리: 3종 타입에 직접 대응
// - prereq: prerequisite (선수 학습, 강조 화살표)
// - hierarchy: contains (상위→하위, 가는 화살표)
// - soft: relatedTo (점선, 약한 연관)
type EdgeCategory = "prereq" | "hierarchy" | "soft";

const EDGE_CATEGORY: Record<EdgeType, EdgeCategory> = {
  prerequisite: "prereq",
  contains: "hierarchy",
  relatedTo: "soft",
};

export function toRFEdge(e: GraphEdge): RFEdge {
  const cat = EDGE_CATEGORY[e.type];
  const color = EDGE_COLORS[e.type];

  const base: RFEdge = {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ?? EDGE_TYPE_LABELS[e.type],
    labelStyle: { fontSize: 10, fill: "#6b7280" },
    labelBgStyle: { fill: "#fff", fillOpacity: 0.85 },
    labelBgPadding: [3, 4],
    labelBgBorderRadius: 3,
  };

  if (cat === "prereq") {
    return {
      ...base,
      type: "smoothstep",
      animated: false,
      style: { stroke: color, strokeWidth: 1.75 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 14, height: 14 },
    };
  }

  if (cat === "hierarchy") {
    return {
      ...base,
      type: "default",
      style: { stroke: color, strokeWidth: 1.1 },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 10, height: 10 },
    };
  }

  // soft (relatedTo)
  return {
    ...base,
    type: "default",
    style: {
      stroke: color,
      strokeWidth: 1,
      strokeDasharray: "4 3",
      opacity: 0.75,
    },
  };
}
