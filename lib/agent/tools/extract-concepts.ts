import type { Tool } from "./types";
import { findNodeByLabel } from "@/lib/graph/data/projection";

interface Args extends Record<string, unknown> {
  paperId?: string;
  paperLabel?: string;
}

export const extractConceptsTool: Tool<Args> = {
  name: "extract_concepts",
  description:
    "특정 노드(주로 paper/document)에서 이어지는 개념·기법을 추출한다. 엣지 타입에 무관하게 연결된 concept/technique 이웃을 반환.",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      paperId: { type: "string", description: "논문/문서 노드 ID" },
      paperLabel: {
        type: "string",
        description: "ID 대신 label로 노드 지정",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, { graphData }) => {
    const paper =
      (args.paperId && graphData.nodes.find((n) => n.id === args.paperId)) ||
      (args.paperLabel && findNodeByLabel(graphData, args.paperLabel)) ||
      null;

    if (!paper) {
      return {
        summary: "노드를 찾지 못했습니다.",
        data: { concepts: [] },
      };
    }

    const nodeById = new Map(graphData.nodes.map((n) => [n.id, n]));
    const outgoing = graphData.edges.filter((e) => e.source === paper.id);
    const concepts: { node: unknown; note?: string; type: string }[] = [];

    for (const e of outgoing) {
      const target = nodeById.get(e.target);
      if (!target) continue;
      if (target.type !== "concept" && target.type !== "technique") continue;
      concepts.push({ node: target, note: e.note, type: e.type });
    }

    return {
      summary: `${paper.label}: 연결된 개념/기법 ${concepts.length}개`,
      data: { paper, concepts },
    };
  },
};
