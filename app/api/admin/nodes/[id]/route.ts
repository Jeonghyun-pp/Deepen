/**
 * GET·PATCH·DELETE /api/admin/nodes/[id] — 시드 작업용.
 * Spec: docs/build-spec/03-api-contracts.md §10.
 *
 *   GET: 노드 1건 + 양방향 엣지 동봉
 *   PATCH: 메타 수정 (label·grade·signature·item* 등)
 *   DELETE: 강제 삭제 (status=draft 인 것만 — published 는 discard X)
 */

import { and, eq, or } from "drizzle-orm"
import { db } from "@/lib/db"
import { edges, nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"
import {
  PatchNodeRequest,
  type NodeDetailResponse,
  type QueueNodeDto,
  type EdgeDto,
} from "@/lib/api/schemas/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const nodeToDto = (n: typeof nodes.$inferSelect): QueueNodeDto => ({
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

const edgeToDto = (e: typeof edges.$inferSelect): EdgeDto => ({
  id: e.id,
  sourceNodeId: e.sourceNodeId,
  targetNodeId: e.targetNodeId,
  type: e.type,
})

export const GET = withAdmin<{ id: string }>(
  "GET /api/admin/nodes/[id]",
  async (_request, { params }) => {
    const [node] = await db
      .select()
      .from(nodes)
      .where(eq(nodes.id, params.id))
      .limit(1)
    if (!node) return apiError.notFound("node_not_found")

    const allEdges = await db
      .select()
      .from(edges)
      .where(
        or(
          eq(edges.sourceNodeId, params.id),
          eq(edges.targetNodeId, params.id),
        ),
      )

    const response: NodeDetailResponse = {
      node: nodeToDto(node),
      outgoingEdges: allEdges
        .filter((e) => e.sourceNodeId === params.id)
        .map(edgeToDto),
      incomingEdges: allEdges
        .filter((e) => e.targetNodeId === params.id)
        .map(edgeToDto),
    }
    return Response.json(response, { status: 200 })
  },
)

export const PATCH = withAdmin<{ id: string }>(
  "PATCH /api/admin/nodes/[id]",
  async (request, { params }) => {
    let body: ReturnType<typeof PatchNodeRequest.parse>
    try {
      body = PatchNodeRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // type 별 허용 필드 화이트리스트 (서버 측 추가 검증)
    const [existing] = await db
      .select({ type: nodes.type })
      .from(nodes)
      .where(eq(nodes.id, params.id))
      .limit(1)
    if (!existing) return apiError.notFound("node_not_found")

    const allowedKeys =
      existing.type === "pattern"
        ? new Set([
            "label",
            "grade",
            "displayLayer",
            "signature",
            "isKiller",
            "frequencyRank",
            "avgCorrectRate",
          ])
        : new Set([
            "label",
            "itemSource",
            "itemYear",
            "itemNumber",
            "itemDifficulty",
            "itemAnswer",
            "itemSolution",
            "itemChoices",
          ])

    const update: Record<string, unknown> = { updatedAt: new Date() }
    for (const [k, v] of Object.entries(body)) {
      if (allowedKeys.has(k)) update[k] = v
    }

    if (Object.keys(update).length === 1) {
      return apiError.badRequest("no_valid_fields")
    }

    const [updated] = await db
      .update(nodes)
      .set(update)
      .where(eq(nodes.id, params.id))
      .returning()

    return Response.json({ node: nodeToDto(updated) }, { status: 200 })
  },
)

export const DELETE = withAdmin<{ id: string }>(
  "DELETE /api/admin/nodes/[id]",
  async (_request, { params }) => {
    const [existing] = await db
      .select({ status: nodes.status })
      .from(nodes)
      .where(eq(nodes.id, params.id))
      .limit(1)
    if (!existing) return apiError.notFound("node_not_found")
    if (existing.status === "published") {
      return apiError.conflict("published_cannot_delete")
    }

    await db.delete(nodes).where(and(eq(nodes.id, params.id), eq(nodes.status, "draft")))
    return Response.json({ ok: true }, { status: 200 })
  },
)
