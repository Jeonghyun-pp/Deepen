export type NodeType =
  | "paper"
  | "concept"
  | "technique"
  | "application"
  | "question"
  | "memo"
  | "document";

export type EdgeType =
  // legacy / structural
  | "citation"
  | "shared_concept"
  | "manual"
  | "contains"
  | "similarity"
  // typed relations (v2)
  | "introduces"
  | "uses"
  | "extends"
  | "appliedIn"
  | "raises"
  | "relatedTo";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  content: string;
  tldr?: string;
  meta?: {
    authors?: string;
    year?: number;
    citations?: number;
    contexts?: { paperId: string; paperLabel: string; year: number; description: string }[];
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  weight?: number; // 0~1, 연관성 강도. 미지정 시 0.5 취급
  note?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type CanvasTabType = "graph" | "doc" | "note";

export interface CanvasTab {
  id: string;
  type: CanvasTabType;
  label: string;
  closeable: boolean;
  nodeId?: string;
  noteId?: string;
}

// Roadmap = 일급 객체. 그래프에서 학습 경로(노드 시퀀스)를 영속적으로 보관.
// source: 시드(큐레이션) / agent 생성 / 사용자 직접 만든 것 구분.
export interface Roadmap {
  id: string;
  title: string;
  nodeIds: string[];
  source: "seed" | "agent" | "user";
  description?: string;
  createdAt: string;
}

// 현재 활성화된 로드맵의 view state.
// roadmapId가 있으면 저장된 Roadmap 참조. 없으면 ad-hoc path (agent find_path 등).
export interface RoadmapOverlayState {
  pathNodeIds: string[];
  currentIndex: number;
  title?: string;
  roadmapId?: string;
}

// ==================== Highlights ====================

export interface Highlight {
  id: string;
  documentNodeId: string;
  range: { page?: number; startOffset: number; endOffset: number };
  color: string;
  memo?: string;
  linkedNodeIds?: string[];
  createdAt: string;
}

// ==================== Note / Writing Canvas ====================

export type NoteBlock =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; language?: string; code: string }
  | { type: "node-ref"; nodeId: string; label: string }
  | { type: "divider" };

export interface NoteDocument {
  id: string;
  title: string;
  blocks: NoteBlock[];
  references: string[];
  template?: string;
  createdAt: string;
  updatedAt: string;
}
