import { MarkerType, type Edge as RFEdge } from "@xyflow/react";
import type { GraphEdge, EdgeType } from "../../_data/types";
import { EDGE_COLORS, EDGE_TYPE_LABELS } from "../../_data/colors";

// 엣지 카테고리: 학습 관점에서 3가지로 분류
// - prereq: 선수/계승 관계 (실선 화살표, 강조)
// - reference: 참조/인용 (점선, 회색 톤)
// - soft: 약한 관계 (옅은 실선)
type EdgeCategory = "prereq" | "reference" | "soft";

const EDGE_CATEGORY: Record<EdgeType, EdgeCategory> = {
  // 선수관계에 해당
  extends: "prereq",
  introduces: "prereq",
  uses: "prereq",
  // 참조/인용
  citation: "reference",
  similarity: "reference",
  shared_concept: "reference",
  // 기타(응용/질문/수동 등)
  appliedIn: "soft",
  raises: "soft",
  relatedTo: "soft",
  manual: "soft",
  contains: "soft",
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

  if (cat === "reference") {
    return {
      ...base,
      type: "default",
      style: {
        stroke: color,
        strokeWidth: 1.25,
        strokeDasharray: "4 3",
      },
    };
  }

  // soft
  return {
    ...base,
    type: "default",
    style: { stroke: color, strokeWidth: 1, opacity: 0.7 },
  };
}
