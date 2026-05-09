/**
 * /api/recap/* zod 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §4.
 */

import { z } from "zod"

// ────────── /api/recap/diagnose ──────────

export const RecapDiagnoseRequest = z.object({
  currentItemId: z.string().uuid(),
})
export type RecapDiagnoseRequest = z.infer<typeof RecapDiagnoseRequest>

export const RecapDiagnoseCandidate = z.object({
  patternId: z.string().uuid(),
  patternLabel: z.string(),
  grade: z.string().nullable(),
  deficitProb: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative().optional(),
})
export type RecapDiagnoseCandidate = z.infer<typeof RecapDiagnoseCandidate>

export const RecapDiagnoseResponse = z.object({
  recapNeeded: z.boolean(),
  candidates: z.array(RecapDiagnoseCandidate),
})
export type RecapDiagnoseResponse = z.infer<typeof RecapDiagnoseResponse>

// ────────── /api/recap/build-card ──────────

export const RecapBuildCardRequest = z.object({
  patternId: z.string().uuid(),
  currentItemId: z.string().uuid(),
})
export type RecapBuildCardRequest = z.infer<typeof RecapBuildCardRequest>

export const RecapCardSchema = z.object({
  patternId: z.string().uuid(),
  grade: z.string(),
  name: z.string(),
  durationMin: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  whyNeeded: z.string(),
  coreBullets: z.tuple([z.string(), z.string(), z.string()]),
  checkQuiz: z.object({
    question: z.string(),
    answer: z.string(),
    hint: z.string(),
  }),
  triggerItemId: z.string().uuid(),
})
export type RecapCardPayload = z.infer<typeof RecapCardSchema>

export const RecapBuildCardResponse = z.object({
  card: RecapCardSchema,
})
export type RecapBuildCardResponse = z.infer<typeof RecapBuildCardResponse>

// ────────── /api/recap/quiz/submit ──────────

export const RecapQuizSubmitRequest = z.object({
  patternId: z.string().uuid(),
  expectedAnswer: z.string(),
  userAnswer: z.string(),
})
export type RecapQuizSubmitRequest = z.infer<typeof RecapQuizSubmitRequest>

export const RecapQuizSubmitResponse = z.object({
  correct: z.boolean(),
  hint: z.string().optional(),
})
export type RecapQuizSubmitResponse = z.infer<typeof RecapQuizSubmitResponse>
