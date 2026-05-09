/**
 * 8가지 오답 원인 자동 태깅 — AI 분류 (Haiku 4.5).
 * Spec: docs/build-spec/05-llm-prompts.md §5, 04-algorithms.md §1.5, M2.4.
 *
 * 룰 기반 3태그(time_overrun, hint_dependent, prereq_deficit)는 score.ts
 * 의 ruleBaseTags 가 즉시 부여. 본 모듈은 나머지 7태그를 비동기 분류:
 *   - concept_lack
 *   - pattern_misrecognition
 *   - approach_error
 *   - calculation_error
 *   - condition_misread
 *   - graph_misread
 *   - logic_leap
 *
 * confidence < 0.5 면 결과 무시 (mergeReasonTags 가 처리).
 */

import { callClaudeTool } from "@/lib/clients/claude"
import type { ReasonTag } from "@/lib/db/schema"
import type { AlignedStep } from "@/lib/api/schemas/ocr"

const MODEL = "claude-haiku-4-5-20251001"

/** AI 분류 가능 태그 (룰 3개 제외). */
const AI_TAGS = [
  "concept_lack",
  "pattern_misrecognition",
  "approach_error",
  "calculation_error",
  "condition_misread",
  "graph_misread",
  "logic_leap",
] as const

const SYSTEM_PROMPT = `당신은 한국 입시 수학 문제의 학생 오답을 분석합니다.

문제, 공식 해설, 학생이 시도한 풀이(있으면)를 보고, 다음 중 하나 이상의 카테고리로 분류하세요:

1. concept_lack — 현재 단원의 핵심 개념을 모름 (예: 미분 정의)
2. pattern_misrecognition — 문제 유형을 잘못 인식
3. approach_error — 풀이 접근 방향 자체가 틀림
4. calculation_error — 접근은 맞았으나 계산에서 실수
5. condition_misread — 문제 조건을 잘못 해석
6. graph_misread — 그래프나 도형 해석 오류
7. logic_leap — 논리적 비약, 단계 누락

여러 개 가능. 신뢰도 낮으면 빈 배열.`

const TOOL = {
  name: "classify_wrong_reasons",
  description: "오답 원인 카테고리 분류.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      tags: {
        type: "array",
        items: { type: "string", enum: [...AI_TAGS] },
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
    },
    required: ["tags", "confidence"],
  },
}

export interface ClassifyArgs {
  itemLabel: string
  itemSolution: string | null
  correctAnswer: string
  selectedAnswer: string
  ocrSteps?: AlignedStep[]
  signals: {
    timeZ: number
    hintsUsed: number
  }
}

export interface ClassifyResult {
  tags: ReasonTag[]
  confidence: number
  inputTokens: number
  outputTokens: number
}

export async function classifyWrongReasons(
  args: ClassifyArgs,
): Promise<ClassifyResult> {
  const ocrPart = args.ocrSteps && args.ocrSteps.length > 0
    ? `\n  <ocr_steps>${args.ocrSteps
        .map((s) => `${s.userText ?? ""}${s.errorKind ? ` [${s.errorKind}]` : ""}`)
        .filter(Boolean)
        .join(" / ")}</ocr_steps>`
    : ""

  const userPrompt = [
    "<problem>",
    `  <text>${args.itemLabel}</text>`,
    `  <solution>${(args.itemSolution ?? "").slice(0, 1500)}</solution>`,
    `  <correct_answer>${args.correctAnswer}</correct_answer>`,
    "</problem>",
    "",
    "<student_attempt>",
    `  <selected_answer>${args.selectedAnswer}</selected_answer>${ocrPart}`,
    `  <time_z>${args.signals.timeZ.toFixed(1)}</time_z>`,
    `  <hints_used>${args.signals.hintsUsed}</hints_used>`,
    "</student_attempt>",
  ].join("\n")

  const result = await callClaudeTool<{
    tags: ReasonTag[]
    confidence: number
  }>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    tool: TOOL,
    maxTokens: 256,
    model: MODEL,
  })

  return {
    tags: result.data.tags ?? [],
    confidence: result.data.confidence ?? 0,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  }
}

/**
 * 룰 태그(existing)와 AI 태그(aiTags)를 merge. confidence < 0.5 면 무시.
 * 중복 제거. spec 04 §1.5 + M2.4 lock.
 */
export const AI_CONFIDENCE_THRESHOLD = 0.5

export function mergeReasonTags(
  existing: ReasonTag[],
  aiTags: ReasonTag[],
  aiConfidence: number,
): ReasonTag[] {
  if (aiConfidence < AI_CONFIDENCE_THRESHOLD) return existing
  const merged = new Set<ReasonTag>(existing)
  for (const t of aiTags) merged.add(t)
  return [...merged]
}
