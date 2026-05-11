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

// ────────── /api/ai-coach/chat (AI SDK v6 UI message stream) ──────────
//
// AI SDK v6 의 useChat 이 body 에 messages: UIMessage[] 를 직접 보냄.
// 라우트는 마지막 user 메시지의 text 를 추출 + itemId/chipKey 로 context 빌드.
// 기존 CoachChatRequest (단일 message 문자열) 는 v1 호환용으로 더 이상 사용 X.

export const CoachChatRequest = z.object({
  itemId: z.string().uuid(),
  chipKey: ChipKey.optional(),
  /** AI SDK UIMessage[] — convertToModelMessages 로 ModelMessage 변환. */
  messages: z.array(z.unknown()),
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
