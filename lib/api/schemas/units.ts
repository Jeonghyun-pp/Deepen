/**
 * /api/units/* zod 스키마.
 *
 * Q1: 단원 = "수학Ⅱ 미분/적분" 단일 단원 가정. 응답 hardcoded.
 * Q2+: nodes.meta 또는 별도 unit 테이블로 분리.
 */

import { z } from "zod"

export const UnitDto = z.object({
  key: z.string(),
  label: z.string(),
  patternCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
})
export type UnitDto = z.infer<typeof UnitDto>

export const UnitListResponse = z.object({
  units: z.array(UnitDto),
})
export type UnitListResponse = z.infer<typeof UnitListResponse>

export const NextItemRequest = z.object({
  unitKey: z.string().default("default"),
  /** 방금 푼 itemId — 그 다음 published Item 추천. 없으면 첫 Item. */
  excludeItemId: z.string().uuid().optional(),
})
export type NextItemRequest = z.infer<typeof NextItemRequest>

export const NextItemResponse = z.object({
  /** 다음 published Item id. 없으면 null (단원 끝). */
  itemId: z.string().uuid().nullable(),
})
export type NextItemResponse = z.infer<typeof NextItemResponse>
