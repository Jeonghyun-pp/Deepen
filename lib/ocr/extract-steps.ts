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
- 수식은 LaTeX. 한글 설명은 한글 그대로.`

const TOOL = {
  name: "emit_steps",
  description: "이미지의 풀이 단계를 위에서 아래로 추출.",
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
    },
    required: ["steps", "overallConfidence"],
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
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: "위 이미지에서 풀이 단계를 추출해 emit_steps 도구를 호출하세요.",
    imageBase64: args.imageBase64,
    tool: TOOL,
    maxTokens: 2048,
  })

  return {
    steps: result.data.steps,
    overallConfidence: result.data.overallConfidence,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    model: result.model,
  }
}
