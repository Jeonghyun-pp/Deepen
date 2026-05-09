/**
 * GET /api/items/[id] 응답 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §7 GraphNode + Q1 Item.
 */

import { z } from "zod"

/**
 * Item 단건 조회 결과. Pattern 메타는 클라가 별도로 fetchPattern 으로 가져온다.
 * itemAnswer/itemSolution 는 정답 비교 후에만 노출 (M1.4 결과 화면에서 사용).
 *
 * 정답을 클라에 노출하지 말지 — Q1 단순화 위해 GET 시 함께 보냄.
 * (실 운영에선 attempt POST 응답에서만 보내고 GET 에선 빼야 함. M3.1 보안 강화에서 분리.)
 */
export const ItemResponse = z.object({
  id: z.string().uuid(),
  type: z.literal("item"),
  label: z.string(),
  itemSource: z.string().nullable(),
  itemYear: z.number().int().nullable(),
  itemNumber: z.number().int().nullable(),
  itemDifficulty: z.number().nullable(),
  itemChoices: z.array(z.string()).nullable(),
  itemAnswer: z.string().nullable(),
  itemSolution: z.string().nullable(),
  patternIds: z.array(z.string().uuid()),
})
export type ItemResponse = z.infer<typeof ItemResponse>
