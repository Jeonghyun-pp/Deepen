/**
 * /api/recommend/* zod 스키마.
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
    /** M3.3 — practice 모드 ranking 시 base 로 쓸 itemId (없으면 cosine 비활성). */
    baseItemId: z.string().uuid().optional(),
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
  reason: z
    .enum(["challenge", "retry", "practice_default", "ranked"])
    .nullable(),
  difficulty: z.number().nullable(),
  /** mode='challenge' 시 다음 Pattern 으로 LEVEL_UP 했다면 ID 첨부. session_end 시 null. */
  nextPatternId: z.string().uuid().nullable().optional(),
  nextPatternLabel: z.string().nullable().optional(),
  /** M3.3 — score breakdown (디버그·A/B 측정용). */
  scoreBreakdown: z
    .object({
      jac: z.number(),
      cos: z.number(),
      ovl: z.number(),
      wal: z.number(),
      dft: z.number(),
      total: z.number(),
    })
    .nullable()
    .optional(),
})
export type NextRecommendResponse = z.infer<typeof NextRecommendResponse>

// ============================================================
// /api/recommend/similar — M3.3
// ============================================================

export const SimilarRequest = z.object({
  itemId: z.string().uuid(),
  k: z.number().int().min(1).max(20).default(5),
})
export type SimilarRequest = z.infer<typeof SimilarRequest>

export const SimilarItem = z.object({
  itemId: z.string().uuid(),
  label: z.string(),
  similarity: z.number(),
  rankScore: z.number(),
  difficulty: z.number().nullable(),
})
export type SimilarItem = z.infer<typeof SimilarItem>

export const SimilarResponse = z.object({
  baseItemId: z.string().uuid(),
  items: z.array(SimilarItem),
  embeddingMissing: z.boolean(),
})
export type SimilarResponse = z.infer<typeof SimilarResponse>
