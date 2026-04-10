import type { Tool } from "./types";
import type { NodeType } from "@/app/graph/_data/types";

interface Args extends Record<string, unknown> {
  id?: string;
  label: string;
  type: NodeType;
  content?: string;
  tldr?: string;
}

export const addNodeTool: Tool<Args> = {
  name: "add_node",
  description:
    "그래프에 새 노드를 추가한다. 사용자 승인이 필요하다. 실제 mutation은 승인 후 client에서 수행.",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      id: { type: "string", description: "노드 ID (생략 시 자동 생성)" },
      label: { type: "string", description: "노드 라벨" },
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
      },
      content: { type: "string", description: "상세 설명" },
      tldr: { type: "string", description: "1-line 요약" },
    },
    required: ["label", "type"],
    additionalProperties: false,
  },
  buildPreview: (args) => `+ ${args.type} 노드 "${args.label}" 추가`,
  execute: async (args) => {
    const id = args.id ?? `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const node = {
      id,
      label: args.label,
      type: args.type,
      content: args.content ?? "",
      tldr: args.tldr,
    };
    return {
      summary: `노드 "${args.label}" (${args.type}) 추가 준비됨`,
      data: { node },
    };
  },
};
