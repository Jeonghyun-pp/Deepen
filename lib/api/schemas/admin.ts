/**
 * /api/admin/* zod 스키마.
 * Spec: docs/build-spec/03-api-contracts.md §10.
 *
 * Q1 임시 어드민 (M2.6 본격 화면의 simplified 버전). 강사 외주 + 팀원 1명
 * 시드 작업 위함.
 */

import { z } from "zod"

// ────────── /api/admin/seed/queue ──────────

export const SeedQueueRequest = z.object({
  type: z.enum(["pattern", "item"]).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
  limit: z.number().int().positive().max(200).default(50),
  offset: z.number().int().nonnegative().default(0),
})

export const QueueNodeDto = z.object({
  id: z.string().uuid(),
  type: z.enum(["pattern", "item"]),
  label: z.string(),
  grade: z.string().nullable(),
  displayLayer: z.enum(["concept", "pattern"]).nullable(),
  signature: z.array(z.string()).nullable(),
  isKiller: z.boolean(),
  frequencyRank: z.number().int().nullable(),
  avgCorrectRate: z.number().nullable(),
  itemSource: z.string().nullable(),
  itemYear: z.number().int().nullable(),
  itemNumber: z.number().int().nullable(),
  itemDifficulty: z.number().nullable(),
  itemAnswer: z.string().nullable(),
  itemSolution: z.string().nullable(),
  itemChoices: z.array(z.string()).nullable(),
  status: z.enum(["draft", "published"]),
  createdAt: z.string(),
})
export type QueueNodeDto = z.infer<typeof QueueNodeDto>

export const SeedQueueResponse = z.object({
  items: z.array(QueueNodeDto),
  total: z.number().int().nonnegative(),
})
export type SeedQueueResponse = z.infer<typeof SeedQueueResponse>

// ────────── PATCH /api/admin/nodes/[id] ──────────

export const PatchNodeRequest = z.object({
  label: z.string().min(1).max(500).optional(),
  grade: z.string().nullable().optional(),
  displayLayer: z.enum(["concept", "pattern"]).nullable().optional(),
  signature: z.array(z.string()).nullable().optional(),
  isKiller: z.boolean().optional(),
  frequencyRank: z.number().int().nullable().optional(),
  avgCorrectRate: z.number().nullable().optional(),
  itemSource: z.string().nullable().optional(),
  itemYear: z.number().int().nullable().optional(),
  itemNumber: z.number().int().nullable().optional(),
  itemDifficulty: z.number().min(0).max(1).nullable().optional(),
  itemAnswer: z.string().nullable().optional(),
  itemSolution: z.string().nullable().optional(),
  itemChoices: z.array(z.string()).nullable().optional(),
})
export type PatchNodeRequest = z.infer<typeof PatchNodeRequest>

// ────────── /api/admin/edges ──────────

export const CreateEdgeRequest = z.object({
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  type: z.enum(["prerequisite", "contains", "relatedTo"]),
})
export type CreateEdgeRequest = z.infer<typeof CreateEdgeRequest>

export const EdgeDto = z.object({
  id: z.string().uuid(),
  sourceNodeId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
  type: z.enum(["prerequisite", "contains", "relatedTo"]),
})
export type EdgeDto = z.infer<typeof EdgeDto>

// ────────── 단일 노드 + 엣지 조회 ──────────

export const NodeDetailResponse = z.object({
  node: QueueNodeDto,
  outgoingEdges: z.array(EdgeDto),
  incomingEdges: z.array(EdgeDto),
})
export type NodeDetailResponse = z.infer<typeof NodeDetailResponse>
