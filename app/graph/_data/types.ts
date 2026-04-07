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
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
