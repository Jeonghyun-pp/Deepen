/**
 * /api/ai-coach/* zod 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §3.
 */

import { z } from "zod"

export const ChipKey = z.enum([
  "hint",
  "definition",
  "wrong_reason",
  "unfold",
  "variant",
])
export type ChipKey = z.infer<typeof ChipKey>

// ────────── /api/ai-coach/chat (SSE) ──────────

export const CoachChatRequest = z.object({
  itemId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  message: z.string().min(1).max(2000),
  chipKey: ChipKey.optional(),
})
export type CoachChatRequest = z.infer<typeof CoachChatRequest>

// ────────── /api/ai-coach/suggest ──────────

export const CoachSuggestRequest = z.object({
  itemId: z.string().uuid(),
})
export type CoachSuggestRequest = z.infer<typeof CoachSuggestRequest>

export const CoachSuggestChipDto = z.object({
  key: ChipKey,
  label: z.string(),
})
export type CoachSuggestChipDto = z.infer<typeof CoachSuggestChipDto>

export const CoachSuggestResponse = z.object({
  chips: z.array(CoachSuggestChipDto).length(5),
})
export type CoachSuggestResponse = z.infer<typeof CoachSuggestResponse>
