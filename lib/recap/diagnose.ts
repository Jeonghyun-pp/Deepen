/**
 * Q1 진단 (단순 룰 — BN은 M2.3).
 * Spec: docs/build-spec/04-algorithms.md §3.1.
 *
 * 절차:
 *   1) 현재 Item 의 Pattern 들 (Pattern --contains--> Item).
 *   2) 그 Pattern 들의 직접 prereq Pattern 들 (Pattern --prerequisite--> currentPattern).
 *   3) 각 prereq 의 deficitProb 계산:
 *        score = (1 - theta) · 0.7 + min(recentWrong / 3, 1) · 0.3
 *      theta 는 patternState 에서, recentWrong 은 7일 내 그 prereq Pattern 의
 *      Item 풀이 중 'wrong' label 개수 (해당 Pattern 의 Item 들).
 *   4) score 최대 1개를 candidate 로. score ≥ TAU_RECAP(0.6) 이면 recapNeeded.
 *
 * Q1 단순화:
 *   - 단일 카드만 (MAX_RECAP_CARDS_Q1 = 1). Q2 BN 시퀀스로 확장.
 *   - cumulative deficit_log 누적은 미적용 (M2.3 prereq_deficit_log 도입 시).
 */

import { and, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  edges,
  nodes,
  patternState,
  userItemHistory,
} from "@/lib/db/schema"
import {
  TAU_RECAP,
  MAX_RECAP_CARDS_Q1,
  type Diagnosis,
  type DiagnosisCandidate,
} from "./types"

const RECENT_WINDOW_DAYS = 7
const RECENT_WRONG_CAP = 3

interface PatternMeta {
  id: string
  label: string
  grade: string | null
  signature: string[] | null
}

/** Item id 로부터 Pattern--contains-->Item 의 source Pattern 들. */
async function getItemPatterns(itemId: string): Promise<PatternMeta[]> {
  const rows = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      grade: nodes.grade,
      signature: nodes.signature,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        eq(edges.targetNodeId, itemId),
        eq(edges.type, "contains"),
        eq(nodes.type, "pattern"),
      ),
    )

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    grade: r.grade,
    signature: (r.signature as string[] | null) ?? null,
  }))
}

/** 현재 Pattern 들의 직접 prereq Pattern 들. */
async function getDirectPrereqs(
  patternIds: string[],
): Promise<PatternMeta[]> {
  if (patternIds.length === 0) return []

  const rows = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      grade: nodes.grade,
      signature: nodes.signature,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        inArray(edges.targetNodeId, patternIds),
        eq(edges.type, "prerequisite"),
        eq(nodes.type, "pattern"),
      ),
    )

  // 중복 제거 (한 prereq 가 여러 Pattern 의 prereq 일 수 있음)
  const dedup = new Map<string, PatternMeta>()
  for (const r of rows) {
    if (!dedup.has(r.id)) {
      dedup.set(r.id, {
        id: r.id,
        label: r.label,
        grade: r.grade,
        signature: (r.signature as string[] | null) ?? null,
      })
    }
  }
  return [...dedup.values()]
}

/** 사용자 patternState 에서 theta 조회. 없으면 default 0.5. */
async function getTheta(
  userId: string,
  patternId: string,
): Promise<number> {
  const [row] = await db
    .select({ theta: patternState.theta })
    .from(patternState)
    .where(
      and(eq(patternState.userId, userId), eq(patternState.patternId, patternId)),
    )
    .limit(1)
  return row?.theta ?? 0.5
}

/**
 * 7일 내 해당 Pattern 의 Item 들에서 사용자가 'wrong' 으로 끝낸 횟수.
 * jsonb 에서 마지막 result label='wrong' 인 row 만 카운트 (단순 휴리스틱).
 */
async function countRecentWrong(
  userId: string,
  patternId: string,
): Promise<number> {
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 3600 * 1000)

  // pattern --contains--> items
  const itemRows = await db
    .select({ id: edges.targetNodeId })
    .from(edges)
    .where(
      and(
        eq(edges.sourceNodeId, patternId),
        eq(edges.type, "contains"),
      ),
    )
  const itemIds = itemRows.map((r) => r.id)
  if (itemIds.length === 0) return 0

  const [{ count }] = (await db.execute<{ count: number }>(sql`
    SELECT COUNT(*)::int AS count
    FROM ${userItemHistory}
    WHERE ${userItemHistory.userId} = ${userId}
      AND ${userItemHistory.itemId} IN ${sql.raw(`(${itemIds.map((id) => `'${id}'`).join(",")})`)}
      AND ${userItemHistory.lastSolvedAt} >= ${since}
      AND COALESCE(
        (${userItemHistory.resultHistory} -> -1 ->> 'label'),
        ''
      ) = 'wrong'
  `)) as Array<{ count: number }>

  return count ?? 0
}

export async function diagnoseQ1(args: {
  userId: string
  currentItemId: string
}): Promise<Diagnosis> {
  const itemPatterns = await getItemPatterns(args.currentItemId)
  if (itemPatterns.length === 0) {
    return { recapNeeded: false, candidates: [] }
  }

  const prereqs = await getDirectPrereqs(itemPatterns.map((p) => p.id))
  if (prereqs.length === 0) {
    return { recapNeeded: false, candidates: [] }
  }

  const scored: DiagnosisCandidate[] = await Promise.all(
    prereqs.map(async (p) => {
      const theta = await getTheta(args.userId, p.id)
      const recentWrong = await countRecentWrong(args.userId, p.id)
      const score =
        (1 - theta) * 0.7 +
        Math.min(recentWrong / RECENT_WRONG_CAP, 1) * 0.3
      return {
        patternId: p.id,
        patternLabel: p.label,
        grade: p.grade,
        signature: p.signature,
        deficitProb: score,
      }
    }),
  )

  scored.sort((a, b) => b.deficitProb - a.deficitProb)
  const top = scored.slice(0, MAX_RECAP_CARDS_Q1)
  const recapNeeded = top.some((c) => c.deficitProb >= TAU_RECAP)

  return {
    recapNeeded,
    candidates: recapNeeded ? top : [],
  }
}

/** 단위 테스트용 — 순수 score 계산. */
export function deficitScore(args: {
  theta: number
  recentWrong: number
}): number {
  return (
    (1 - args.theta) * 0.7 +
    Math.min(args.recentWrong / RECENT_WRONG_CAP, 1) * 0.3
  )
}
