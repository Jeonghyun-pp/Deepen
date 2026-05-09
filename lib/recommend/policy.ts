/**
 * 추천 풀 정책 (mode 분기) — M3.2.
 * Spec:
 *   - 04-algorithms.md §4.1 (mode별 nextActionXxx)
 *   - 04-algorithms.md §4.2 (추천 풀 필터)
 *   - 09-q3-build.md M3.2 (challenge: same pattern + difficulty 범위 / retry: 강제 itemId)
 *
 * Q3 단순화: weakness alignment + embedding 추천은 M3.3 (pgvector 도입).
 *            본 파일은 mode='challenge' / mode='retry' / mode='practice' 만 분기.
 */
import { and, asc, eq, inArray, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, edges, patternState, userItemHistory } from "@/lib/db/schema"

const DEFAULT_THETA = 0.5
const CHALLENGE_DIFFICULTY_MARGIN_LO = 0.1
const CHALLENGE_DIFFICULTY_MARGIN_HI = 0.3
const RECENT_WINDOW_DAYS = 7

export interface NextItemPick {
  itemId: string
  reason: "challenge" | "retry" | "practice_default"
  difficulty: number | null
}

/**
 * mode='challenge': 같은 Pattern 의 Item 중 difficulty BETWEEN θ+0.1 AND θ+0.3.
 * 후보 없으면 같은 Pattern 의 가장 가까운 difficulty 1개 fallback.
 * "최근 풀이" 제외 — 7일 내 lastSolvedAt 있는 Item 회피.
 */
export async function pickChallengeItem(args: {
  userId: string
  targetPatternId: string
  difficultyAnchor?: number
}): Promise<NextItemPick | null> {
  const theta = await getTheta(args.userId, args.targetPatternId)
  const anchor = args.difficultyAnchor ?? theta
  const lo = Math.max(0, anchor + CHALLENGE_DIFFICULTY_MARGIN_LO)
  const hi = Math.min(1, anchor + CHALLENGE_DIFFICULTY_MARGIN_HI)

  // Pattern --contains--> Item 인 Item 풀
  const itemRows = await db
    .select({ id: edges.targetNodeId })
    .from(edges)
    .where(
      and(
        eq(edges.sourceNodeId, args.targetPatternId),
        eq(edges.type, "contains"),
      ),
    )
  const candidateIds = itemRows.map((r) => r.id)
  if (candidateIds.length === 0) return null

  const recent = await getRecentlySolvedItemIds(args.userId, candidateIds)
  const remaining = candidateIds.filter((id) => !recent.has(id))
  const pool = remaining.length > 0 ? remaining : candidateIds

  // 1차: difficulty BETWEEN [lo, hi]
  const inBand = await db
    .select({ id: nodes.id, difficulty: nodes.itemDifficulty })
    .from(nodes)
    .where(
      and(
        inArray(nodes.id, pool),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
        sql`${nodes.itemDifficulty} BETWEEN ${lo} AND ${hi}`,
      ),
    )
    .orderBy(asc(nodes.itemDifficulty))
    .limit(1)
  if (inBand[0]) {
    return {
      itemId: inBand[0].id,
      reason: "challenge",
      difficulty: inBand[0].difficulty,
    }
  }

  // 2차 fallback: anchor 와 difficulty 차이 가장 작은 1개
  const fallback = await db
    .select({ id: nodes.id, difficulty: nodes.itemDifficulty })
    .from(nodes)
    .where(
      and(
        inArray(nodes.id, pool),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
      ),
    )
    .orderBy(asc(sql`abs(coalesce(${nodes.itemDifficulty}, 0.5) - ${anchor})`))
    .limit(1)
  if (!fallback[0]) return null
  return {
    itemId: fallback[0].id,
    reason: "challenge",
    difficulty: fallback[0].difficulty,
  }
}

/**
 * LEVEL_UP 시 다음 Pattern: 현재 Pattern 의 자식 중 theta 가장 낮은 1개 (DAG).
 * 없으면 null → session_end.
 */
export async function pickNextChallengePattern(args: {
  userId: string
  fromPatternId: string
}): Promise<{ patternId: string; patternLabel: string; theta: number } | null> {
  // children = source-of-prereq edges → source 가 fromPattern, target 이 자식
  // 04 §4.1 의도: "현재 Pattern 의 자식 중 theta 가장 낮은 1개" — 우리 prereq 방향
  // 은 source=prereq → target=current. 즉 fromPattern 이 prereq 인 패턴들 = "다음 단계".
  const childRows = await db
    .select({
      id: nodes.id,
      label: nodes.label,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.targetNodeId))
    .where(
      and(
        eq(edges.sourceNodeId, args.fromPatternId),
        eq(edges.type, "prerequisite"),
        eq(nodes.type, "pattern"),
        eq(nodes.status, "published"),
      ),
    )
  if (childRows.length === 0) return null

  // 사용자 theta 매핑
  const states = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
    })
    .from(patternState)
    .where(
      and(
        eq(patternState.userId, args.userId),
        inArray(
          patternState.patternId,
          childRows.map((r) => r.id),
        ),
      ),
    )
  const thetaMap = new Map(states.map((s) => [s.patternId, s.theta]))

  let pick = childRows[0]
  let lowTheta = thetaMap.get(pick.id) ?? DEFAULT_THETA
  for (const c of childRows.slice(1)) {
    const t = thetaMap.get(c.id) ?? DEFAULT_THETA
    if (t < lowTheta) {
      lowTheta = t
      pick = c
    }
  }
  return { patternId: pick.id, patternLabel: pick.label, theta: lowTheta }
}

/**
 * mode='retry': storedRetryItemId 강제 (단일 후보).
 * 04 §4.2 표 — id = storedRetryItemId.
 */
export async function pickRetryItem(args: {
  userId: string
  storedRetryItemId: string
}): Promise<NextItemPick | null> {
  const [row] = await db
    .select({ id: nodes.id, difficulty: nodes.itemDifficulty })
    .from(nodes)
    .where(
      and(
        eq(nodes.id, args.storedRetryItemId),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
      ),
    )
    .limit(1)
  if (!row) return null
  return { itemId: row.id, reason: "retry", difficulty: row.difficulty }
}

/**
 * mode='practice' 기본: 직전 풀이 없는 published Item 1개 (createdAt 오름차순).
 * 본 함수는 next-item 라우트와 의도가 같지만, /api/recommend/next 통합점 제공.
 */
export async function pickPracticeDefault(args: {
  userId: string
  excludeItemId?: string
}): Promise<NextItemPick | null> {
  const conditions = [
    eq(nodes.type, "item"),
    eq(nodes.status, "published"),
  ]
  if (args.excludeItemId) {
    conditions.push(ne(nodes.id, args.excludeItemId))
  }

  const [row] = await db
    .select({ id: nodes.id, difficulty: nodes.itemDifficulty })
    .from(nodes)
    .where(and(...conditions))
    .orderBy(asc(nodes.createdAt))
    .limit(1)
  if (!row) return null
  return {
    itemId: row.id,
    reason: "practice_default",
    difficulty: row.difficulty,
  }
}

// ============================================================
// helpers
// ============================================================

async function getTheta(userId: string, patternId: string): Promise<number> {
  const [row] = await db
    .select({ theta: patternState.theta })
    .from(patternState)
    .where(
      and(
        eq(patternState.userId, userId),
        eq(patternState.patternId, patternId),
      ),
    )
    .limit(1)
  return row?.theta ?? DEFAULT_THETA
}

async function getRecentlySolvedItemIds(
  userId: string,
  candidates: string[],
): Promise<Set<string>> {
  if (candidates.length === 0) return new Set()
  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 3600 * 1000)
  const rows = await db
    .select({ itemId: userItemHistory.itemId })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, userId),
        inArray(userItemHistory.itemId, candidates),
        sql`${userItemHistory.lastSolvedAt} >= ${since}`,
      ),
    )
  return new Set(rows.map((r) => r.itemId))
}
