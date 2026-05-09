/**
 * /api/graph/* zod 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §7.
 */

import { z } from "zod"

export const VisualAttrsSchema = z.object({
  fillColor: z.string(),
  strokeColor: z.string(),
  strokeStyle: z.enum(["solid", "dashed"]),
  borderColor: z.string().optional(),
  badgeIcon: z.enum(["warning", "killer"]).optional(),
  opacity: z.number().min(0).max(1),
})
export type VisualAttrsDto = z.infer<typeof VisualAttrsSchema>

export const GraphNodeDto = z.object({
  id: z.string().uuid(),
  type: z.enum(["pattern", "item"]),
  label: z.string(),
  grade: z.string().nullable(),
  displayLayer: z.enum(["concept", "pattern"]).nullable(),
  signature: z.array(z.string()).nullable(),
  isKiller: z.boolean(),
  frequencyRank: z.number().int().nullable(),
  avgCorrectRate: z.number().nullable(),
  visualAttrs: VisualAttrsSchema,
})
export type GraphNodeDto = z.infer<typeof GraphNodeDto>

export const GraphEdgeDto = z.object({
  id: z.string().uuid(),
  source: z.string().uuid(),
  target: z.string().uuid(),
  type: z.enum(["prerequisite", "contains", "relatedTo"]),
  weight: z.number().nullable(),
})
export type GraphEdgeDto = z.infer<typeof GraphEdgeDto>

export const GraphUnitResponse = z.object({
  unitKey: z.string(),
  nodes: z.array(GraphNodeDto),
  edges: z.array(GraphEdgeDto),
  userState: z.object({
    masteryByPattern: z.record(
      z.string(),
      z.object({ theta: z.number(), beta: z.number() }),
    ),
    deficitCandidates: z.array(z.string().uuid()),
  }),
})
export type GraphUnitResponse = z.infer<typeof GraphUnitResponse>
