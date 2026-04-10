import type { NodeType, EdgeType } from "./types";

export const NODE_COLORS: Record<NodeType, string> = {
  paper: "#8b5cf6",       // violet
  concept: "#10b981",     // emerald
  technique: "#14b8a6",   // teal
  application: "#f43f5e", // rose
  question: "#eab308",    // yellow-dark
  memo: "#f59e0b",        // amber
  document: "#3b82f6",    // blue
};

export const EDGE_COLORS: Record<EdgeType, string> = {
  // legacy
  citation: "#ef4444",
  shared_concept: "#9ca3af",
  similarity: "#9ca3af",
  manual: "#9ca3af",
  contains: "#d1d5db",
  // v2 typed relations
  introduces: "#8b5cf6",   // violet (paper → concept 제안)
  uses: "#64748b",         // slate
  extends: "#0ea5e9",      // sky (paper → paper 계승)
  appliedIn: "#f43f5e",    // rose
  raises: "#eab308",       // yellow
  relatedTo: "#94a3b8",    // slate-light
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
  citation: "인용",
  shared_concept: "공유 개념",
  manual: "수동 연결",
  contains: "포함",
  similarity: "유사",
  introduces: "제안",
  uses: "사용",
  extends: "확장",
  appliedIn: "응용",
  raises: "질문 제기",
  relatedTo: "관련",
};
