import type { Tool } from "./types";
import type { EdgeType } from "@/app/graph/_data/types";

interface Args extends Record<string, unknown> {
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  note?: string;
  weight?: number;
}

export const addEdgeTool: Tool<Args> = {
  name: "add_edge",
  description:
    "그래프에 새 엣지를 추가한다. 사용자 승인이 필요하다. typed relation (introduces/uses/extends/appliedIn/raises/relatedTo) 또는 구조적 엣지 (citation/manual 등)를 생성할 수 있다.",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      source: { type: "string", description: "시작 노드 ID" },
      target: { type: "string", description: "끝 노드 ID" },
      type: {
        type: "string",
        enum: [
          "introduces",
          "uses",
          "extends",
          "appliedIn",
          "raises",
          "relatedTo",
          "citation",
          "manual",
          "shared_concept",
          "similarity",
          "contains",
        ],
      },
      label: { type: "string", description: "엣지 라벨 (표시용)" },
      note: { type: "string", description: "관계의 이유·설명" },
      weight: {
        type: "number",
        description: "0~1 가중치. 기본 0.5",
      },
    },
    required: ["source", "target", "type"],
    additionalProperties: false,
  },
  buildPreview: (args) =>
    `+ 엣지 ${args.source} --[${args.type}]--> ${args.target}`,
  execute: async (args, { graphData }) => {
    const sourceNode = graphData.nodes.find((n) => n.id === args.source);
    const targetNode = graphData.nodes.find((n) => n.id === args.target);
    if (!sourceNode || !targetNode) {
      return {
        summary: `엣지 추가 실패: ${!sourceNode ? "source" : "target"} 노드가 존재하지 않음`,
        data: null,
      };
    }
    const edge = {
      id: `ai-e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      source: args.source,
      target: args.target,
      type: args.type,
      label: args.label,
      note: args.note,
      weight: args.weight ?? 0.5,
    };
    return {
      summary: `엣지 "${sourceNode.label}" → "${targetNode.label}" (${args.type}) 추가 준비됨`,
      data: { edge },
    };
  },
};
