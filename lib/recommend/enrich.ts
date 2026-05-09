/**
 * Item ranking enrichment — M3.3.
 *
 * Item 풀 N개에 대해 ranking 에 필요한 메타 일괄 조회:
 *   - signature
 *   - patternIds (Pattern --contains--> Item)
 *   - requiresPrereq (patternIds 의 직접 prereq closure)
 *
 * SQL 호출 횟수 최소화 — 후보 10~50개 고정 비용.
 */
import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges, patternState, prereqDeficitLog } from "@/lib/db/schema"

export interface EnrichedItem {
  id: string
  signature: string[] | null
  patternIds: string[]
  /** patternIds + 그 직접 prereq Pattern. 4 §4.3 의 requiresPrereq. */
  requiresPrereq: string[]
}

export async function enrichItems(itemIds: string[]): Promise<
  Map<string, EnrichedItem>
> {
  if (itemIds.length === 0) return new Map()

  const itemRows = await db
    .select({ id: nodes.id, signature: nodes.signature })
    .from(nodes)
    .where(inArray(nodes.id, itemIds))

  // Item → patternIds (Pattern--contains-->Item)
  const containsRows = await db
    .select({
      itemId: edges.targetNodeId,
      patternId: edges.sourceNodeId,
    })
    .from(edges)
    .where(
      and(eq(edges.type, "contains"), inArray(edges.targetNodeId, itemIds)),
    )
  const patternsByItem = new Map<string, string[]>()
  for (const r of containsRows) {
    const arr = patternsByItem.get(r.itemId) ?? []
    arr.push(r.patternId)
    patternsByItem.set(r.itemId, arr)
  }

  // 모든 patternIds 의 prereq edges (Pattern--prerequisite-->Pattern)
  const allPatternIds = [...new Set(containsRows.map((r) => r.patternId))]
  const prereqRows =
    allPatternIds.length === 0
      ? []
      : await db
          .select({
            target: edges.targetNodeId, // child
            source: edges.sourceNodeId, // prereq parent
          })
          .from(edges)
          .where(
            and(
              eq(edges.type, "prerequisite"),
              inArray(edges.targetNodeId, allPatternIds),
            ),
          )
  const prereqsOf = new Map<string, string[]>()
  for (const r of prereqRows) {
    const arr = prereqsOf.get(r.target) ?? []
    arr.push(r.source)
    prereqsOf.set(r.target, arr)
  }

  const result = new Map<string, EnrichedItem>()
  for (const it of itemRows) {
    const pids = patternsByItem.get(it.id) ?? []
    const closure = new Set(pids)
    for (const pid of pids) {
      for (const prereq of prereqsOf.get(pid) ?? []) closure.add(prereq)
    }
    result.set(it.id, {
      id: it.id,
      signature: (it.signature as string[] | null) ?? null,
      patternIds: pids,
      requiresPrereq: [...closure],
    })
  }
  return result
}

/** 사용자 mastery + deficit 한 번에 조회. */
export async function loadUserState(userId: string): Promise<{
  thetaByPattern: Map<string, number>
  deficitByPattern: Map<string, number>
}> {
  const masteryRows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
    })
    .from(patternState)
    .where(eq(patternState.userId, userId))

  const thetaByPattern = new Map<string, number>(
    masteryRows.map((r) => [r.patternId, r.theta]),
  )

  // Pattern 별 가장 최근 deficit row
  const deficitRows = await db
    .select({
      patternId: prereqDeficitLog.patternId,
      deficitProbability: prereqDeficitLog.deficitProbability,
      createdAt: prereqDeficitLog.createdAt,
    })
    .from(prereqDeficitLog)
    .where(eq(prereqDeficitLog.userId, userId))

  const latest = new Map<string, { prob: number; ts: Date }>()
  for (const r of deficitRows) {
    const cur = latest.get(r.patternId)
    if (!cur || r.createdAt > cur.ts) {
      latest.set(r.patternId, {
        prob: r.deficitProbability,
        ts: r.createdAt,
      })
    }
  }
  const deficitByPattern = new Map<string, number>()
  for (const [pid, v] of latest) deficitByPattern.set(pid, v.prob)

  return { thetaByPattern, deficitByPattern }
}
