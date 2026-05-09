/**
 * AI 코치 tool 정의 — Anthropic tool_use.
 * Spec: docs/build-spec/05-llm-prompts.md §1.
 */

export const COACH_TOOLS = [
  {
    name: "insert_recap_card",
    description:
      "학생이 현재 문제를 풀려면 prereq 결손이 있어 보일 때 호출. patternId 는 결손 의심 prereq Pattern.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        patternId: { type: "string", description: "결손 의심 Pattern UUID" },
        reason: {
          type: "string",
          description: "왜 이 prereq 가 막힌 것 같은지 한 줄",
        },
      },
      required: ["patternId", "reason"],
    },
  },
  {
    name: "highlight_graph_nodes",
    description:
      "현재 답변에서 언급한 Pattern 들을 그래프에서 강조. 학생이 답변과 그래프를 시각 연결할 수 있게.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        nodeIds: {
          type: "array",
          items: { type: "string" },
          description: "강조할 Pattern UUID 목록",
        },
      },
      required: ["nodeIds"],
    },
  },
  {
    name: "find_similar_items",
    description:
      "학생이 'variant' 칩을 누르거나 명시적으로 비슷한 문제 요청 시. 같은 Pattern 의 다른 Item 추천.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        patternId: { type: "string" },
        count: { type: "integer", default: 3 },
      },
      required: ["patternId"],
    },
  },
] as const

export type CoachToolName = (typeof COACH_TOOLS)[number]["name"]

export interface InsertRecapCardArgs {
  patternId: string
  reason: string
}

export interface HighlightGraphNodesArgs {
  nodeIds: string[]
}

export interface FindSimilarItemsArgs {
  patternId: string
  count?: number
}
