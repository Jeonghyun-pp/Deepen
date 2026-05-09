import type { Tool } from "./types";
import type { EdgeType, GraphEdge } from "@/lib/graph/data/types";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { edges, nodes } from "@/lib/db/schema";

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
    "그래프에 새 엣지를 추가한다. 사용자 승인 필요. type은 사용자 발화·문맥에서 너가 추론한다: 사용자가 'A가 B의 기초/선수/전제' 같은 의미를 드러내면 prerequisite, 'A 안에 B 포함/소속' 의미면 contains, 그 외 (단순 연결·연관) relatedTo. 확신 없으면 relatedTo.",
  requiresApproval: true,
  parameters: {
    type: "object",
    properties: {
      source: { type: "string", description: "시작 노드 ID" },
      target: { type: "string", description: "끝 노드 ID" },
      type: {
        type: "string",
        enum: ["prerequisite", "contains", "relatedTo"],
        description:
          "관계 종류. 사용자가 명시적으로 말하지 않으면 문맥에서 추론. 기본 relatedTo.",
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
  execute: async (args, { userId }) => {
    if (args.source === args.target) {
      throw new Error("self-loop은 허용되지 않음");
    }

    const owned = await db
      .select({ id: nodes.id, label: nodes.label })
      .from(nodes)
      .where(
        and(eq(nodes.userId, userId), inArray(nodes.id, [args.source, args.target])),
      );
    if (owned.length !== 2) {
      throw new Error(`엣지 추가 실패: source/target 노드가 DB에 없거나 소유자가 다름`);
    }

    const sourceLabel = owned.find((n) => n.id === args.source)?.label ?? args.source;
    const targetLabel = owned.find((n) => n.id === args.target)?.label ?? args.target;

    const [created] = await db
      .insert(edges)
      .values({
        userId,
        sourceNodeId: args.source,
        targetNodeId: args.target,
        type: args.type,
        label: args.label ?? null,
        note: args.note ?? null,
        weight: args.weight ?? 0.5,
      })
      .returning();

    const edge: GraphEdge = {
      id: created.id,
      source: created.sourceNodeId,
      target: created.targetNodeId,
      type: created.type,
      label: created.label ?? undefined,
      note: created.note ?? undefined,
      weight: created.weight ?? undefined,
    };

    return {
      summary: `엣지 "${sourceLabel}" → "${targetLabel}" (${args.type}) 추가됨`,
      data: { edge },
    };
  },
};
