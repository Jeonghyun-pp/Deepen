/**
 * /api/recommend/next zod 스키마.
 * Spec: 03-api-contracts.md §5.
 */
import { z } from "zod"
import { SessionMode } from "./attempts"

export const NextRecommendRequest = z
  .object({
    mode: SessionMode,
    excludeItemId: z.string().uuid().optional(),
    /** mode='challenge' 필수 — 챌린지가 묶인 Pattern. */
    targetPatternId: z.string().uuid().optional(),
    /** mode='challenge' 옵션 — 머신 ctx.currentDifficulty (없으면 user theta). */
    difficultyAnchor: z.number().min(0).max(1).optional(),
    /** mode='retry' 필수 — recap 직전 wrong 의 itemId. */
    storedRetryItemId: z.string().uuid().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "challenge" && !v.targetPatternId) {
      ctx.addIssue({
        code: "custom",
        path: ["targetPatternId"],
        message: "challenge mode requires targetPatternId",
      })
    }
    if (v.mode === "retry" && !v.storedRetryItemId) {
      ctx.addIssue({
        code: "custom",
        path: ["storedRetryItemId"],
        message: "retry mode requires storedRetryItemId",
      })
    }
  })
export type NextRecommendRequest = z.infer<typeof NextRecommendRequest>

export const NextRecommendResponse = z.object({
  itemId: z.string().uuid().nullable(),
  reason: z.enum(["challenge", "retry", "practice_default"]).nullable(),
  difficulty: z.number().nullable(),
  /** mode='challenge' 시 다음 Pattern 으로 LEVEL_UP 했다면 ID 첨부. session_end 시 null. */
  nextPatternId: z.string().uuid().nullable().optional(),
  nextPatternLabel: z.string().nullable().optional(),
})
export type NextRecommendResponse = z.infer<typeof NextRecommendResponse>
