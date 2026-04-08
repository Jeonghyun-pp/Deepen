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

export type CanvasTabType = "graph" | "paper-detail" | "roadmap-timeline";

export interface CanvasTab {
  id: string;
  type: CanvasTabType;
  label: string;
  closeable: boolean;
  paperId?: string;
  roadmapId?: string;
}
