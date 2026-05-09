/**
 * GET /api/graph/unit/[unitKey] — 단원 그래프 + 학습자 상태.
 * Spec: docs/build-spec/03-api-contracts.md §7, M1.6.
 *
 * Q1 단순화:
 *   - unitKey 무시 (단일 단원 = 수학Ⅱ 미분/적분 가정).
 *   - 모든 published Pattern + Pattern 의 자식 Item 반환.
 *   - visualAttrs 서버 인코딩.
 *   - Q2+: Pattern.meta 또는 grade 기반 필터.
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"
import { encodeVisual } from "@/lib/graph/encode-visual"
import { buildUserState } from "@/lib/graph/build-user-state"
import type { GraphUnitResponse } from "@/lib/api/schemas/graph"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth<{ unitKey: string }>(
  "GET /api/graph/unit/[unitKey]",
  async (_request, { user, params }) => {
    // 1) Pattern + Item 노드 (Q1: 모든 published, 단일 단원)
    const allNodes = await db
      .select()
      .from(nodes)
      .where(eq(nodes.status, "published"))

    const patternNodes = allNodes.filter((n) => n.type === "pattern")
    const itemNodes = allNodes.filter((n) => n.type === "item")
    const patternIds = patternNodes.map((n) => n.id)
    const itemIds = itemNodes.map((n) => n.id)

    // 2) Edges (Pattern↔Pattern prereq + Pattern--contains-->Item)
    const allEdges = await db.select().from(edges)
    const patternIdSet = new Set(patternIds)
    const itemIdSet = new Set(itemIds)
    const filteredEdges = allEdges.filter((e) => {
      const inPatternToPattern =
        patternIdSet.has(e.sourceNodeId) && patternIdSet.has(e.targetNodeId)
      const inPatternToItem =
        patternIdSet.has(e.sourceNodeId) && itemIdSet.has(e.targetNodeId)
      return inPatternToPattern || inPatternToItem
    })

    // 3) User state
    const userState = await buildUserState({
      userId: user.id,
      patternIds,
      itemIds,
    })

    // 4) Visual encoding (서버 사이드)
    const dtoNodes = allNodes
      .filter((n) => patternIdSet.has(n.id) || itemIdSet.has(n.id))
      .map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        grade: n.grade,
        displayLayer: n.displayLayer,
        signature: (n.signature as string[] | null) ?? null,
        isKiller: n.isKiller,
        frequencyRank: n.frequencyRank,
        avgCorrectRate: n.avgCorrectRate,
        visualAttrs: encodeVisual(
          {
            id: n.id,
            type: n.type,
            isKiller: n.isKiller,
            frequencyRank: n.frequencyRank,
            avgCorrectRate: n.avgCorrectRate,
          },
          userState,
        ),
      }))

    const dtoEdges = filteredEdges.map((e) => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      type: e.type,
      weight: e.weight,
    }))

    const response: GraphUnitResponse = {
      unitKey: params.unitKey,
      nodes: dtoNodes,
      edges: dtoEdges,
      userState: {
        masteryByPattern: userState.masteryByPattern,
        deficitCandidates: userState.deficitCandidates,
      },
    }

    return Response.json(response, { status: 200 })
  },
)
