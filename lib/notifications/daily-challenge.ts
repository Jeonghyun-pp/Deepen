/**
 * 데일리 챌린지 — 매일 약점 3 Pattern × 안 푼 1문제씩.
 * Spec: 09-q3-build.md M3.4.
 *
 * 절차:
 *   1) pattern_state.theta ASC + attempt_count >= 3 → top 3 약점 Pattern
 *   2) 각 Pattern 의 미풀이 (또는 7일+ 미풀이) Item 1개 — difficulty ≈ theta
 *   3) (item, pattern) tuple 3개 반환
 *
 * 빈 케이스:
 *   - patternState 없으면 (cold-start) → "출제 빈도 상위 Pattern 1개 + 첫 Item"
 *     단순 fallback. 단원 진입 화면이 그 역할이라 cron 은 빈 [] 만 반환해도 무방.
 */
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  edges,
  nodes,
  patternState,
  userItemHistory,
  type DailyChallengeItem,
} from "@/lib/db/schema"

const MIN_ATTEMPTS_PER_PATTERN = 3
const RECENT_SOLVED_DAYS = 7

export async function pickDailyChallengeItems(
  userId: string,
): Promise<DailyChallengeItem[]> {
  // 1) 약점 Pattern top 3
  const weakRows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
      label: nodes.label,
    })
    .from(patternState)
    .innerJoin(nodes, eq(nodes.id, patternState.patternId))
    .where(
      and(
        eq(patternState.userId, userId),
        gte(patternState.attemptCount, MIN_ATTEMPTS_PER_PATTERN),
        eq(nodes.type, "pattern"),
        eq(nodes.status, "published"),
      ),
    )
    .orderBy(asc(patternState.theta))
    .limit(3)

  if (weakRows.length === 0) return []

  // 2) 사용자가 7일 내 푼 Item 제외 셋
  const since = new Date(Date.now() - RECENT_SOLVED_DAYS * 24 * 3600 * 1000)
  const recentRows = await db
    .select({ itemId: userItemHistory.itemId })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, userId),
        gte(userItemHistory.lastSolvedAt, since),
      ),
    )
  const recentSet = new Set(recentRows.map((r) => r.itemId))

  // 3) 각 Pattern 에서 difficulty ≈ theta 인 Item 1개
  const result: DailyChallengeItem[] = []
  for (const w of weakRows) {
    const itemRows = await db
      .select({ id: nodes.id, difficulty: nodes.itemDifficulty })
      .from(edges)
      .innerJoin(nodes, eq(nodes.id, edges.targetNodeId))
      .where(
        and(
          eq(edges.sourceNodeId, w.patternId),
          eq(edges.type, "contains"),
          eq(nodes.type, "item"),
          eq(nodes.status, "published"),
        ),
      )

    const candidates = itemRows.filter((r) => !recentSet.has(r.id))
    const pool = candidates.length > 0 ? candidates : itemRows
    if (pool.length === 0) continue

    // difficulty 가까운 1개. null difficulty 는 0.5 가정.
    const sorted = pool.sort(
      (a, b) =>
        Math.abs((a.difficulty ?? 0.5) - w.theta) -
        Math.abs((b.difficulty ?? 0.5) - w.theta),
    )
    const pick = sorted[0]
    result.push({
      itemId: pick.id,
      patternId: w.patternId,
      patternLabel: w.label,
    })
  }

  return result
}

/** cohort sweep 대상 — 14일 내 활동 사용자. */
export async function getActiveUserIds(
  withinDays = 14,
): Promise<string[]> {
  const since = new Date(Date.now() - withinDays * 24 * 3600 * 1000)
  const rows = await db.execute<{ user_id: string }>(sql`
    SELECT DISTINCT user_id
    FROM user_item_history
    WHERE last_solved_at >= ${since}
  `)
  return (rows as unknown as Array<{ user_id: string }>).map(
    (r) => r.user_id,
  )
}

/** 단순 카피 — Haiku 미연결 시 fallback. */
export function defaultDailyCopy(
  items: DailyChallengeItem[],
): string | null {
  if (items.length === 0) return null
  const head = items[0].patternLabel
  return `오늘의 도전: ${head} 등 ${items.length}문제 (~5분)`
}
