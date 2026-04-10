import type { Tool } from "./types";
import type { GraphNode, GraphEdge, EdgeType, NodeType } from "@/app/graph/_data/types";
import { getNeighbors, findNodeByLabel } from "@/app/graph/_data/projection";

interface Args extends Record<string, unknown> {
  nodeId?: string;
  label?: string;
  type?: NodeType;
  relationType?: EdgeType;
  depth?: number;
}

export const queryGraphTool: Tool<Args> = {
  name: "query_graph",
  description:
    "지식 그래프에서 노드와 엣지를 조회한다. nodeId/label/type/relationType 조건으로 필터링할 수 있다. 노드 중심 조회 시 1-hop 이웃을 함께 반환한다.",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      nodeId: {
        type: "string",
        description: "조회할 중심 노드의 ID",
      },
      label: {
        type: "string",
        description: "nodeId 대신 label로 노드를 찾는다 (fuzzy 매칭)",
      },
      type: {
        type: "string",
        enum: [
          "paper",
          "concept",
          "technique",
          "application",
          "question",
          "memo",
          "document",
        ],
        description: "특정 타입의 노드만 필터링",
      },
      relationType: {
        type: "string",
        enum: [
          "introduces",
          "uses",
          "extends",
          "appliedIn",
          "raises",
          "citation",
          "relatedTo",
        ],
        description: "특정 관계 타입의 엣지만 필터링",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, { graphData }) => {
    // 1. 중심 노드 해석 (nodeId 우선, 없으면 label fuzzy)
    let center: GraphNode | null = null;
    if (args.nodeId) {
      center = graphData.nodes.find((n) => n.id === args.nodeId) ?? null;
    } else if (args.label) {
      center = findNodeByLabel(graphData, args.label);
    }

    // 2. 중심 노드 기반 1-hop 조회
    if (center) {
      const { nodes: neighbors, edges } = getNeighbors(graphData, center.id);
      const filteredEdges = args.relationType
        ? edges.filter((e) => e.type === args.relationType)
        : edges;
      const neighborIds = new Set<string>();
      for (const e of filteredEdges) {
        if (e.source !== center.id) neighborIds.add(e.source);
        if (e.target !== center.id) neighborIds.add(e.target);
      }
      const filteredNeighbors = neighbors
        .filter((n) => neighborIds.has(n.id))
        .filter((n) => (args.type ? n.type === args.type : true));

      return {
        summary: `${center.label}: ${filteredNeighbors.length}개 이웃 노드, ${filteredEdges.length}개 엣지`,
        data: {
          center,
          nodes: [center, ...filteredNeighbors],
          edges: filteredEdges,
        },
      };
    }

    // 3. 중심 노드 없는 경우 — 전역 타입/관계 필터
    const nodes: GraphNode[] = args.type
      ? graphData.nodes.filter((n) => n.type === args.type)
      : graphData.nodes;
    const edges: GraphEdge[] = args.relationType
      ? graphData.edges.filter((e) => e.type === args.relationType)
      : [];

    return {
      summary: `전역 조회: ${nodes.length}개 노드${edges.length > 0 ? `, ${edges.length}개 엣지` : ""}`,
      data: { nodes, edges },
    };
  },
};
