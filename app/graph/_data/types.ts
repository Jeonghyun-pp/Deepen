export type NodeType = "paper" | "concept" | "memo" | "document";
export type EdgeType = "citation" | "shared_concept" | "manual" | "contains" | "similarity";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  content: string;
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
}

export interface RoadmapEntry {
  nodeId: string;
  order: number;
  reason?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  estimatedMinutes?: number;
}

export interface RoadmapModule {
  id: string;
  name: string;
  entries: RoadmapEntry[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  roadmaps: RoadmapModule[];
}

export type CanvasTabType = "graph" | "doc" | "roadmap-timeline" | "note";

export interface CanvasTab {
  id: string;
  type: CanvasTabType;
  label: string;
  closeable: boolean;
  nodeId?: string;
  roadmapId?: string;
  noteId?: string;
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
