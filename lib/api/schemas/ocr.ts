/**
 * /api/ocr zod 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §6, M2.2.
 */

import { z } from "zod"

export const ErrorKind = z.enum([
  "match",
  "extra_step",
  "wrong_substitution",
  "sign_error",
  "missing_condition",
  "arithmetic_error",
])
export type ErrorKind = z.infer<typeof ErrorKind>

export const OcrStepType = z.enum(["equation", "condition", "conclusion", "note"])
export type OcrStepType = z.infer<typeof OcrStepType>

export const OcrRequest = z.object({
  itemId: z.string().uuid(),
  /** PNG base64 (data URL or raw). 4MB cap 서버에서 검증. */
  imageBase64: z.string().min(1),
})
export type OcrRequest = z.infer<typeof OcrRequest>

export const AlignedStep = z.object({
  stepIdx: z.number().int().nonnegative(),
  /** 학생이 쓴 줄 (없으면 canonical 만 매칭) */
  userText: z.string().optional(),
  /** 정답 풀이 줄 (없으면 학생 extra_step) */
  canonicalText: z.string().optional(),
  errorKind: ErrorKind.optional(),
  suggestion: z.string().optional(),
  /** Vision 이 식별한 step type. */
  type: OcrStepType.optional(),
})
export type AlignedStep = z.infer<typeof AlignedStep>

export const OcrResponse = z.object({
  steps: z.array(AlignedStep),
  /** 0~1 — Vision 의 self-reported overall confidence. */
  overallConfidence: z.number().min(0).max(1),
  processingTimeMs: z.number().int().nonnegative(),
  /**
   * Phase 4 Path C (lock #8): 5지선다 문제일 때 학생이 풀이 마지막에 동그라미·
   * 체크·"답: N" 등으로 표시한 답 번호 (1~5). 감지 못 했거나 객관식이 아니면 null.
   * 클라는 이 값을 itemChoices[n-1] 로 매핑해 solve-store.setSelectedAnswer 호출.
   */
  detectedAnswerChoice: z.number().int().min(1).max(5).nullable(),
  /** Vision 의 답 감지 신뢰도 (0~1). detectedAnswerChoice 가 null 이면 0. */
  answerConfidence: z.number().min(0).max(1),
})
export type OcrResponse = z.infer<typeof OcrResponse>
