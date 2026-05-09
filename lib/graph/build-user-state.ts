/**
 * 학습자 상태 builder — pattern_state + user_item_history → UserStateForEncode.
 * Spec: docs/build-spec/03-api-contracts.md §7, 04-algorithms.md §8.
 *
 * Q1:
 *   - deficitCandidates 는 빈 배열 (M2.3 prereq_deficit_log 도입 시 채움).
 *   - recentWrongStreak 은 최근 user_item_history 의 wrong 카운트로 단순 계산.
 */

import { eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  patternState,
  userItemHistory,
  edges,
  type AttemptResult,
} from "@/lib/db/schema"
import type { UserStateForEncode } from "./encode-visual"

const RECENT_LIMIT = 3

export async function buildUserState(args: {
  userId: string
  /** 인덱싱 대상 patternIds (그래프에 표시될 Pattern들). */
  patternIds: string[]
  /** 인덱싱 대상 itemIds (Pattern 의 자식 Item들). recentWrongStreak 집계 용. */
  itemIds: string[]
}): Promise<UserStateForEncode> {
  const masteryByPattern: Record<string, { theta: number; beta: number }> = {}
  const attemptCountByPattern: Record<string, number> = {}
  const recentWrongStreak: Record<string, number> = {}

  if (args.patternIds.length > 0) {
    const psRows = await db
      .select({
        patternId: patternState.patternId,
        theta: patternState.theta,
        beta: patternState.beta,
        attemptCount: patternState.attemptCount,
      })
      .from(patternState)
      .where(eq(patternState.userId, args.userId))

    for (const row of psRows) {
      if (!args.patternIds.includes(row.patternId)) continue
      masteryByPattern[row.patternId] = { theta: row.theta, beta: row.beta }
      attemptCountByPattern[row.patternId] = row.attemptCount
    }
  }

  // Pattern 별 최근 wrongStreak 집계 — Pattern--contains-->Item 의 user_item_history wrong.
  if (args.itemIds.length > 0 && args.patternIds.length > 0) {
    const histRows = await db
      .select({
        itemId: userItemHistory.itemId,
        resultHistory: userItemHistory.resultHistory,
      })
      .from(userItemHistory)
      .where(
        eq(userItemHistory.userId, args.userId),
      )

    // Pattern--contains-->Item 매핑
    const containsRows = await db
      .select({ patternId: edges.sourceNodeId, itemId: edges.targetNodeId })
      .from(edges)
      .where(
        eq(edges.type, "contains"),
      )
    const itemToPatterns = new Map<string, string[]>()
    for (const r of containsRows) {
      if (!args.itemIds.includes(r.itemId)) continue
      if (!args.patternIds.includes(r.patternId)) continue
      const arr = itemToPatterns.get(r.itemId) ?? []
      arr.push(r.patternId)
      itemToPatterns.set(r.itemId, arr)
    }

    for (const h of histRows) {
      const patterns = itemToPatterns.get(h.itemId)
      if (!patterns) continue
      const recent = (h.resultHistory as AttemptResult[]).slice(-RECENT_LIMIT)
      const wrongs = recent.filter((r) => r.label === "wrong").length
      if (wrongs === 0) continue
      for (const pid of patterns) {
        recentWrongStreak[pid] = Math.max(
          recentWrongStreak[pid] ?? 0,
          wrongs,
        )
      }
    }
  }

  return {
    masteryByPattern,
    attemptCountByPattern,
    deficitCandidates: [], // M2.3 prereq_deficit_log
    recentWrongStreak,
  }
}
