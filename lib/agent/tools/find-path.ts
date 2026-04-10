import type { Tool } from "./types";
import { getPathBetween, findNodeByLabel } from "@/app/graph/_data/projection";

interface Args extends Record<string, unknown> {
  startId?: string;
  startLabel?: string;
  goalId?: string;
  goalLabel?: string;
}

export const findPathTool: Tool<Args> = {
  name: "find_path",
  description:
    "두 노드 사이의 최단 경로를 찾아 학습 순서(roadmap) 형태로 반환한다. startId/goalId 또는 startLabel/goalLabel로 지정할 수 있다.",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      startId: { type: "string", description: "시작 노드 ID" },
      startLabel: {
        type: "string",
        description: "ID 대신 label로 시작 노드 지정",
      },
      goalId: { type: "string", description: "목표 노드 ID" },
      goalLabel: {
        type: "string",
        description: "ID 대신 label로 목표 노드 지정",
      },
    },
    additionalProperties: false,
  },
  execute: async (args, { graphData }) => {
    const startNode =
      (args.startId && graphData.nodes.find((n) => n.id === args.startId)) ||
      (args.startLabel && findNodeByLabel(graphData, args.startLabel)) ||
      null;
    const goalNode =
      (args.goalId && graphData.nodes.find((n) => n.id === args.goalId)) ||
      (args.goalLabel && findNodeByLabel(graphData, args.goalLabel)) ||
      null;

    if (!startNode || !goalNode) {
      return {
        summary: `경로 탐색 실패: ${!startNode ? "start" : "goal"} 노드를 찾지 못했습니다.`,
        data: { pathNodeIds: [] },
      };
    }

    const pathIds = getPathBetween(graphData, startNode.id, goalNode.id);
    if (pathIds.length === 0) {
      return {
        summary: `${startNode.label} → ${goalNode.label}: 경로 없음`,
        data: { pathNodeIds: [] },
      };
    }

    const nodeById = new Map(graphData.nodes.map((n) => [n.id, n]));
    const pathNodes = pathIds
      .map((id) => nodeById.get(id))
      .filter((n): n is NonNullable<typeof n> => n != null);

    const pathLabels = pathNodes.map((n) => n.label).join(" → ");

    return {
      summary: `경로 (${pathIds.length} 단계): ${pathLabels}`,
      data: {
        pathNodeIds: pathIds,
        pathNodes,
        start: startNode,
        goal: goalNode,
      },
    };
  },
};
