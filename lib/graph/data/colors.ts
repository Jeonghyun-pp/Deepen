import type { NodeType, EdgeType } from "./types";

// v2 mint-aligned palette: concept anchors to v2-green (#22C55E) so the
// brand color reads as the visual focus; other types keep hue identity but
// are desaturated/earthened to live inside the same tonal family.
export const NODE_COLORS: Record<NodeType, string> = {
  paper: "#7C6FD4",       // muted violet
  concept: "#22C55E",     // v2-green (brand anchor)
  technique: "#3FB39A",   // muted teal — still adjacent to green
  application: "#D96B7A", // dusty rose
  question: "#C9A43D",    // muted gold
  memo: "#D88E3D",        // warm amber, softened
  document: "#6B8ED6",    // slate-blue
};

export const EDGE_COLORS: Record<EdgeType, string> = {
  prerequisite: "#4ADE80", // v2-green-soft — 학습 순서(DAG), 브랜드 강조
  contains: "#D1D5DB",     // slate-light — 계층 포함
  relatedTo: "#94A3B8",    // slate — 같은 맥락 공출현
};

export const TYPE_LABELS: Record<NodeType, string> = {
  paper: "논문",
  concept: "개념",
  technique: "기법",
  application: "응용",
  question: "질문",
  memo: "메모",
  document: "문서",
};

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  prerequisite: "선수",
  contains: "포함",
  relatedTo: "관련",
};
