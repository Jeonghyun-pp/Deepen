/**
 * /api/attempts/classify-reasons zod 스키마.
 * Spec: docs/build-spec/08-q2-build.md M2.4.
 */

import { z } from "zod"
import { ReasonTag } from "./attempts"

export const ClassifyReasonsRequest = z.object({
  itemId: z.string().uuid(),
  /** 분류할 attempt — result_history 안 마지막 row 의 timestamp. */
  attemptTimestamp: z.string(),
  /** OCR steps (있으면 컨텍스트 동봉). */
  ocrSteps: z
    .array(
      z.object({
        stepIdx: z.number().int(),
        userText: z.string().optional(),
        canonicalText: z.string().optional(),
        errorKind: z.string().optional(),
      }),
    )
    .optional(),
})
export type ClassifyReasonsRequest = z.infer<typeof ClassifyReasonsRequest>

export const ClassifyReasonsResponse = z.object({
  tags: z.array(ReasonTag),
  confidence: z.number().min(0).max(1),
  /** merge 후 final reasonTags (룰 + AI 합집합). */
  mergedTags: z.array(ReasonTag),
})
export type ClassifyReasonsResponse = z.infer<typeof ClassifyReasonsResponse>
