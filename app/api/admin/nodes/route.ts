/**
 * POST /api/admin/nodes — 어드민이 직접 노드 생성.
 * Spec: 시드 작업 quick create. status='draft' 강제.
 *
 * 정책:
 *   - PDF 파이프라인 자동 추출 외에도 강사가 직접 생성 가능.
 *   - 생성 즉시 편집 화면으로 이동 → 메타 채우기.
 *   - status='draft' 고정 (publish 는 별도 endpoint).
 */

import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"
import {
  CreateNodeRequest,
  type CreateNodeResponse,
  type QueueNodeDto,
} from "@/lib/api/schemas/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const toDto = (n: typeof nodes.$inferSelect): QueueNodeDto => ({
  id: n.id,
  type: n.type,
  label: n.label,
  grade: n.grade,
  displayLayer: n.displayLayer,
  signature: (n.signature as string[] | null) ?? null,
  isKiller: n.isKiller,
  frequencyRank: n.frequencyRank,
  avgCorrectRate: n.avgCorrectRate,
  itemSource: n.itemSource,
  itemYear: n.itemYear,
  itemNumber: n.itemNumber,
  itemDifficulty: n.itemDifficulty,
  itemAnswer: n.itemAnswer,
  itemSolution: n.itemSolution,
  itemChoices: (n.itemChoices as string[] | null) ?? null,
  status: n.status,
  createdAt: n.createdAt.toISOString(),
})

export const POST = withAdmin("POST /api/admin/nodes", async (request, { user }) => {
  let body: ReturnType<typeof CreateNodeRequest.parse>
  try {
    body = CreateNodeRequest.parse(await request.json())
  } catch (e) {
    return apiError.badRequest("validation_failed")
  }

  const isPattern = body.type === "pattern"

  const [created] = await db
    .insert(nodes)
    .values({
      userId: user.id,
      type: body.type,
      label: body.label.trim(),
      status: "draft",
      // Pattern 필드
      grade: isPattern ? body.grade ?? null : null,
      displayLayer: isPattern ? body.displayLayer ?? "pattern" : null,
      signature: isPattern ? body.signature ?? null : null,
      isKiller: isPattern ? body.isKiller ?? false : false,
      frequencyRank: isPattern ? body.frequencyRank ?? null : null,
      avgCorrectRate: isPattern ? body.avgCorrectRate ?? null : null,
      // Item 필드
      itemSource: !isPattern ? body.itemSource ?? null : null,
      itemYear: !isPattern ? body.itemYear ?? null : null,
      itemNumber: !isPattern ? body.itemNumber ?? null : null,
      itemDifficulty: !isPattern ? body.itemDifficulty ?? null : null,
      itemAnswer: !isPattern ? body.itemAnswer ?? null : null,
      itemSolution: !isPattern ? body.itemSolution ?? null : null,
      itemChoices: !isPattern ? body.itemChoices ?? null : null,
    })
    .returning()

  const response: CreateNodeResponse = { node: toDto(created) }
  return Response.json(response, { status: 201 })
})
