import type { Tool } from "./types";
import { findNodeByLabel } from "@/app/graph/_data/projection";

interface Args extends Record<string, unknown> {
  paperId?: string;
  paperLabel?: string;
}

export const extractConceptsTool: Tool<Args> = {
  name: "extract_concepts",
  description:
    "특정 논문(paper)이 제안(introduces)하거나 사용(uses)하는 개념·기법을 추출한다.",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      paperId: { type: "string", description: "논문 노드 ID" },
      paperLabel: {
        type: "string",
        description: "ID 대신 label로 논문 지정",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, { graphData }) => {
    const paper =
      (args.paperId && graphData.nodes.find((n) => n.id === args.paperId)) ||
      (args.paperLabel && findNodeByLabel(graphData, args.paperLabel)) ||
      null;

    if (!paper || paper.type !== "paper") {
      return {
        summary: "논문을 찾지 못했습니다.",
        data: { introduces: [], uses: [] },
      };
    }

    const conceptEdges = graphData.edges.filter(
      (e) =>
        e.source === paper.id &&
        (e.type === "introduces" || e.type === "uses"),
    );

    const nodeById = new Map(graphData.nodes.map((n) => [n.id, n]));
    const introduces: { node: unknown; note?: string }[] = [];
    const uses: { node: unknown; note?: string }[] = [];

    for (const e of conceptEdges) {
      const target = nodeById.get(e.target);
      if (!target) continue;
      const item = { node: target, note: e.note };
      if (e.type === "introduces") introduces.push(item);
      else uses.push(item);
    }

    return {
      summary: `${paper.label}: ${introduces.length}개 제안 개념, ${uses.length}개 사용 개념`,
      data: { paper, introduces, uses },
    };
  },
};
