import type { GraphData, GraphNode, GraphEdge } from "@/app/graph/_data/types"
import type { Node as DbNode, Edge as DbEdge } from "@/lib/db/schema"

export function dbNodeToGraphNode(row: DbNode): GraphNode {
  return {
    id: row.id,
    label: row.label,
    type: row.type,
    content: row.content ?? "",
    tldr: row.tldr ?? undefined,
    meta: (row.meta as GraphNode["meta"]) ?? undefined,
    whiteboardPos: (row.whiteboardPos as GraphNode["whiteboardPos"]) ?? undefined,
    sectionId: row.sectionId ?? undefined,
  }
}

export function dbEdgeToGraphEdge(row: DbEdge): GraphEdge {
  return {
    id: row.id,
    source: row.sourceNodeId,
    target: row.targetNodeId,
    type: row.type,
    label: row.label ?? undefined,
    weight: row.weight ?? undefined,
    note: row.note ?? undefined,
  }
}

export function apiResponseToGraphData(raw: {
  nodes: DbNode[]
  edges: DbEdge[]
}): GraphData {
  return {
    nodes: raw.nodes.map(dbNodeToGraphNode),
    edges: raw.edges.map(dbEdgeToGraphEdge),
  }
}
