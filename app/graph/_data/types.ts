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

// Roadmap = graph path overlay (사용자가 학습 중인 node sequence)
export interface RoadmapOverlayState {
  pathNodeIds: string[];
  currentIndex: number;
  title?: string;
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
