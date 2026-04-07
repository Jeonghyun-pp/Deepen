import type { NodeType, EdgeType } from "./types";

export const NODE_COLORS: Record<NodeType, string> = {
  paper: "#8b5cf6",
  concept: "#10b981",
  memo: "#f59e0b",
  document: "#3b82f6",
};

export const EDGE_COLORS: Record<EdgeType, string> = {
  citation: "#ef4444",
  shared_concept: "#6366f1",
  manual: "#94a3b8",
  contains: "#10b981",
  similarity: "#f59e0b",
};

export const TYPE_LABELS: Record<NodeType, string> = {
  paper: "논문",
  concept: "개념",
  memo: "메모",
  document: "문서",
};

export const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  citation: "인용",
  shared_concept: "공유 개념",
  manual: "수동 연결",
  contains: "포함",
  similarity: "유사",
};
