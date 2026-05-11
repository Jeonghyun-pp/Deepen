/**
 * Claude Vision (opus) 으로 PNG 풀이 → 단계별 LaTeX 추출.
 * Spec: docs/build-spec/05-llm-prompts.md §6, 04-algorithms.md §7.1.
 */

import { callClaudeVisionTool } from "@/lib/clients/claude"
import type { OcrStepType } from "@/lib/api/schemas/ocr"

const SYSTEM_PROMPT = `당신은 한국 입시 수학 손글씨 풀이 이미지를 분석합니다.

이미지에서 읽을 수 있는 모든 풀이 단계를 위에서 아래로 추출하세요.

각 단계는:
- line: 1부터 시작하는 줄 번호
- text: 그 줄의 풀이 (LaTeX 표기. 예: $D = b^2 - 4ac$)
- type: 'equation' (수식 변형) | 'condition' (조건 도입) | 'conclusion' (결론) | 'note' (메모)

규칙:
- 글씨 못 알아보는 부분은 [...] 표기
- 그림이나 그래프는 type='note' 로, "[그래프: y=x^2 그림]" 같이 표기
- 수식은 LaTeX. 한글 설명은 한글 그대로.

추가로 — 5지선다 답 감지 (Phase 4 Path C):
- 풀이 마지막에 학생이 동그라미·체크·박스·하이라이트로 표시한 답 번호 (1~5) 또는
  "답: N", "정답 N", "∴ N" 형태로 명시한 답 번호가 있으면 detectedAnswerChoice 에 1~5 정수로 반환.
- 동그라미는 ①②③④⑤ 같은 원숫자, 또는 숫자에 동그라미를 친 형태 모두 포함.
- 두 개 이상 표시했거나 명확하지 않으면 detectedAnswerChoice = null.
- 답 표시가 전혀 없으면 detectedAnswerChoice = null.
- answerConfidence: 0~1 — 얼마나 확신하는가. null 이면 0.`

const TOOL = {
  name: "emit_steps",
  description: "이미지의 풀이 단계를 위에서 아래로 추출하고, 5지선다 답 표시가 있으면 함께 보고.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            line: { type: "integer", minimum: 1 },
            text: { type: "string" },
            type: { type: "string", enum: ["equation", "condition", "conclusion", "note"] },
          },
          required: ["line", "text", "type"],
        },
      },
      overallConfidence: { type: "number", minimum: 0, maximum: 1 },
      detectedAnswerChoice: {
        type: ["integer", "null"],
        minimum: 1,
        maximum: 5,
        description: "5지선다 답 번호 1~5. 없거나 애매하면 null.",
      },
      answerConfidence: {
        type: "number",
        minimum: 0,
        maximum: 1,
        description: "답 감지 신뢰도. detectedAnswerChoice 가 null 이면 0.",
      },
    },
    required: ["steps", "overallConfidence", "detectedAnswerChoice", "answerConfidence"],
  },
}

export interface ExtractedStep {
  line: number
  text: string
  type: OcrStepType
}

export interface ExtractStepsResult {
  steps: ExtractedStep[]
  overallConfidence: number
  /** Phase 4 Path C — 5지선다 답 자동 감지 (1~5) 또는 null. */
  detectedAnswerChoice: number | null
  answerConfidence: number
  inputTokens: number
  outputTokens: number
  model: string
}

export async function extractSteps(args: {
  imageBase64: string
}): Promise<ExtractStepsResult> {
  const result = await callClaudeVisionTool<{
    steps: ExtractedStep[]
    overallConfidence: number
    detectedAnswerChoice: number | null
    answerConfidence: number
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt:
      "위 이미지에서 풀이 단계를 추출하고, 학생이 표시한 5지선다 답이 있으면 함께 emit_steps 도구를 호출하세요.",
    imageBase64: args.imageBase64,
    tool: TOOL,
    maxTokens: 2048,
  })

  // 방어 — Vision 이 enum 범위 밖 정수 반환 가능성
  const choice = result.data.detectedAnswerChoice
  const safeChoice =
    typeof choice === "number" && choice >= 1 && choice <= 5
      ? Math.round(choice)
      : null
  const safeAnsConf = safeChoice
    ? Math.max(0, Math.min(1, result.data.answerConfidence ?? 0))
    : 0

  return {
    steps: result.data.steps,
    overallConfidence: result.data.overallConfidence,
    detectedAnswerChoice: safeChoice,
    answerConfidence: safeAnsConf,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
  }
}
