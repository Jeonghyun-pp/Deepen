import type { Tool } from "./types";
import type { NodeType, GraphNode } from "@/lib/graph/data/types";
import { db } from "@/lib/db";
import { nodes } from "@/lib/db/schema";

interface Args extends Record<string, unknown> {
  label: string;
  type: NodeType;
  content?: string;
  tldr?: string;
}

export const addNodeTool: Tool<Args> = {
  name: "add_node",
  description:
    "그래프에 새 노드를 추가한다. 사용자 승인이 필요하다. 승인 후 DB에 저장되고 UI에 즉시 반영된다.",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      label: { type: "string", description: "노드 라벨" },
      type: {
        type: "string",
        enum: ["pattern", "item"],
      },
      content: { type: "string", description: "상세 설명" },
      tldr: { type: "string", description: "1-line 요약" },
    },
    required: ["label", "type"],
    additionalProperties: false,
  },
  buildPreview: (args) => `+ ${args.type} 노드 "${args.label}" 추가`,
  execute: async (args, { userId }) => {
    const label = args.label?.trim();
    if (!label) {
      throw new Error("label이 비어있음");
    }

    const [created] = await db
      .insert(nodes)
      .values({
        userId,
        label,
        type: args.type,
        content: args.content ?? "",
        tldr: args.tldr ?? null,
      })
      .returning();

    const node: GraphNode = {
      id: created.id,
      label: created.label,
      type: created.type,
      content: created.content ?? "",
      tldr: created.tldr ?? undefined,
    };

    return {
      summary: `노드 "${label}" (${args.type}) 추가됨 [${created.id}]`,
      data: { node },
    };
  },
};
