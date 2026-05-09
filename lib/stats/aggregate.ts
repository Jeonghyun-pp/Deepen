/**
 * 통계 집계 — M3.5. 대시보드 + 보호자 리포트 공통 truth source.
 * Spec: 09-q3-build.md M3.5.
 *
 * 핵심 함수:
 *   - getWeakPatternsAt: 특정 시점의 약점 Pattern 집합 (snapshot 우선, 없으면 현재)
 *   - getMasteryAvgAt: 평균 theta
 *   - getSolveTimeBreakdown: easy/mid/hard 풀이시간·정답률
 *   - getWeeklyComparison: 최근 4주 attempts·mastery
 *   - buildOverview: 대시보드 4카드 데이터 합성
 */
import { and, asc, eq, gte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  nodes,
  patternState,
  patternStateSnapshots,
  userItemHistory,
} from "@/lib/db/schema"
import {
  isoDateInKst,
  snapshotIsoDate,
  weeksAgoSaturday,
} from "./time"

export const WEAK_THETA_THRESHOLD = 0.4

export interface WeakPattern {
  id: string
  label: string
  theta: number
}

/**
 * 특정 'YYYY-MM-DD' (KST 토 boundary) 시점 약점 Pattern.
 * snapshot 이 있으면 snapshot 사용, 없으면 빈 배열 (cold-start 첫 주).
 */
export async function getWeakPatternsAtSnapshot(
  userId: string,
  snapshotDate: string,
): Promise<WeakPattern[]> {
  const rows = await db
    .select({
      id: patternStateSnapshots.patternId,
      theta: patternStateSnapshots.theta,
      label: nodes.label,
    })
    .from(patternStateSnapshots)
    .innerJoin(nodes, eq(nodes.id, patternStateSnapshots.patternId))
    .where(
      and(
        eq(patternStateSnapshots.userId, userId),
        eq(patternStateSnapshots.snapshotDate, snapshotDate),
        sql`${patternStateSnapshots.theta} < ${WEAK_THETA_THRESHOLD}`,
        sql`${patternStateSnapshots.attemptCount} >= 1`,
      ),
    )
  return rows.map((r) => ({ id: r.id, label: r.label, theta: r.theta }))
}

/** 현재 (실시간) 약점 Pattern. */
export async function getWeakPatternsNow(
  userId: string,
): Promise<WeakPattern[]> {
  const rows = await db
    .select({
      id: patternState.patternId,
      theta: patternState.theta,
      label: nodes.label,
    })
    .from(patternState)
    .innerJoin(nodes, eq(nodes.id, patternState.patternId))
    .where(
      and(
        eq(patternState.userId, userId),
        sql`${patternState.theta} < ${WEAK_THETA_THRESHOLD}`,
        sql`${patternState.attemptCount} >= 1`,
      ),
    )
  return rows.map((r) => ({ id: r.id, label: r.label, theta: r.theta }))
}

/**
 * "지난 주 약점 N개 → 이번 주 N-2개" framing.
 * before = 지난 주 토요일 boundary 의 snapshot
 * after = 현재 실시간
 * reduced = before \ after
 */
export async function getWeakNodesDelta(userId: string): Promise<{
  before: number
  after: number
  reduced: WeakPattern[]
}> {
  const lastSatBoundary = weeksAgoSaturday(1)
  const before = await getWeakPatternsAtSnapshot(
    userId,
    isoDateInKst(lastSatBoundary),
  )
  const after = await getWeakPatternsNow(userId)
  const afterIds = new Set(after.map((a) => a.id))
  const reduced = before.filter((b) => !afterIds.has(b.id))
  return { before: before.length, after: after.length, reduced }
}

/**
 * 평균 마스터리 (전체 patternState 평균 theta).
 * snapshot 우선, 없으면 0.5.
 */
export async function getMasteryAvgAtSnapshot(
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const rows = await db
    .select({
      theta: patternStateSnapshots.theta,
    })
    .from(patternStateSnapshots)
    .where(
      and(
        eq(patternStateSnapshots.userId, userId),
        eq(patternStateSnapshots.snapshotDate, snapshotDate),
      ),
    )
  if (rows.length === 0) return 0.5
  return rows.reduce((acc, r) => acc + r.theta, 0) / rows.length
}

export async function getMasteryAvgNow(userId: string): Promise<number> {
  const rows = await db
    .select({ theta: patternState.theta })
    .from(patternState)
    .where(eq(patternState.userId, userId))
  if (rows.length === 0) return 0.5
  return rows.reduce((acc, r) => acc + r.theta, 0) / rows.length
}

/** 이번 주 평균 - 지난 주 평균. */
export async function getMasteryDelta(userId: string): Promise<{
  thisWeek: number
  lastWeek: number
  delta: number
}> {
  const thisWeek = await getMasteryAvgNow(userId)
  const lastWeek = await getMasteryAvgAtSnapshot(
    userId,
    isoDateInKst(weeksAgoSaturday(1)),
  )
  return { thisWeek, lastWeek, delta: thisWeek - lastWeek }
}

// ============================================================
// Solve time breakdown (오르조 C.2 패턴 — 정답률 + 시간 동시)
// ============================================================

export type DifficultyBucket = "easy" | "mid" | "hard"

export interface SolveTimeRow {
  difficulty: DifficultyBucket
  attempts: number
  avgMs: number
  correctRate: number
}

/**
 * 지난 7일 attempt 들의 difficulty 별 평균 시간 + 정답률.
 * easy: difficulty < 0.4, mid: 0.4~0.7, hard: ≥ 0.7.
 */
export async function getSolveTimeBreakdown(
  userId: string,
  sinceDays = 7,
): Promise<SolveTimeRow[]> {
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000)

  const rows = await db
    .select({
      itemId: userItemHistory.itemId,
      resultHistory: userItemHistory.resultHistory,
      difficulty: nodes.itemDifficulty,
    })
    .from(userItemHistory)
    .innerJoin(nodes, eq(nodes.id, userItemHistory.itemId))
    .where(
      and(
        eq(userItemHistory.userId, userId),
        gte(userItemHistory.lastSolvedAt, since),
        eq(nodes.type, "item"),
      ),
    )

  const buckets: Record<
    DifficultyBucket,
    { attempts: number; correct: number; timeMs: number }
  > = {
    easy: { attempts: 0, correct: 0, timeMs: 0 },
    mid: { attempts: 0, correct: 0, timeMs: 0 },
    hard: { attempts: 0, correct: 0, timeMs: 0 },
  }

  for (const r of rows) {
    const diff = r.difficulty ?? 0.5
    const bucket: DifficultyBucket =
      diff < 0.4 ? "easy" : diff < 0.7 ? "mid" : "hard"
    const hist = (r.resultHistory ?? []) as Array<{
      timestamp: string
      label: string
      signals: { timeMs: number; correct: boolean }
    }>
    for (const h of hist) {
      const t = new Date(h.timestamp).getTime()
      if (t < since.getTime()) continue
      buckets[bucket].attempts++
      if (h.label === "correct" || h.signals?.correct) buckets[bucket].correct++
      buckets[bucket].timeMs += h.signals?.timeMs ?? 0
    }
  }

  return (Object.keys(buckets) as DifficultyBucket[]).map((k) => {
    const b = buckets[k]
    return {
      difficulty: k,
      attempts: b.attempts,
      avgMs: b.attempts === 0 ? 0 : b.timeMs / b.attempts,
      correctRate: b.attempts === 0 ? 0 : b.correct / b.attempts,
    }
  })
}

// ============================================================
// Weekly comparison (최근 4주)
// ============================================================

export interface WeeklyRow {
  /** 주의 토요일 'YYYY-MM-DD'. */
  weekEnding: string
  attempts: number
  avgMastery: number
}

export async function getWeeklyComparison(
  userId: string,
  weeksBack = 4,
): Promise<WeeklyRow[]> {
  const result: WeeklyRow[] = []

  // attempt count per week (지난 N주). result_history 의 timestamp 사용.
  const since = weeksAgoSaturday(weeksBack)
  const histRows = await db
    .select({
      resultHistory: userItemHistory.resultHistory,
    })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, userId),
        gte(userItemHistory.lastSolvedAt, since),
      ),
    )

  // 각 주 [weekStart, weekEnd) 에 떨어지는 attempt 카운트
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekEnd = weeksAgoSaturday(i)
    const weekStart = weeksAgoSaturday(i + 1)
    let attempts = 0
    for (const r of histRows) {
      const hist = (r.resultHistory ?? []) as Array<{ timestamp: string }>
      for (const h of hist) {
        const t = new Date(h.timestamp).getTime()
        if (t >= weekStart.getTime() && t < weekEnd.getTime()) attempts++
      }
    }
    const snapshotIso = isoDateInKst(weekEnd)
    const avgMastery =
      i === 0
        ? await getMasteryAvgNow(userId)
        : await getMasteryAvgAtSnapshot(userId, snapshotIso)
    result.push({ weekEnding: snapshotIso, attempts, avgMastery })
  }

  return result
}

// ============================================================
// Solve time totals (지난 7일)
// ============================================================

export async function getStudyMinutes(
  userId: string,
  sinceDays = 7,
): Promise<{ totalAttempts: number; minutes: number }> {
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000)
  const rows = await db
    .select({ resultHistory: userItemHistory.resultHistory })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, userId),
        gte(userItemHistory.lastSolvedAt, since),
      ),
    )

  let totalAttempts = 0
  let timeMs = 0
  for (const r of rows) {
    const hist = (r.resultHistory ?? []) as Array<{
      timestamp: string
      signals: { timeMs: number }
    }>
    for (const h of hist) {
      const t = new Date(h.timestamp).getTime()
      if (t < since.getTime()) continue
      totalAttempts++
      timeMs += h.signals?.timeMs ?? 0
    }
  }
  return { totalAttempts, minutes: timeMs / 60000 }
}

// ============================================================
// Top improved / concerns Pattern (parent-report 공유)
// ============================================================

export interface PatternImprovement {
  patternId: string
  patternLabel: string
  thetaBefore: number
  thetaAfter: number
  thetaDelta: number
}

export async function getTopImproved(
  userId: string,
  limit = 3,
): Promise<PatternImprovement[]> {
  const lastSatIso = isoDateInKst(weeksAgoSaturday(1))
  const beforeRows = await db
    .select({
      patternId: patternStateSnapshots.patternId,
      theta: patternStateSnapshots.theta,
    })
    .from(patternStateSnapshots)
    .where(
      and(
        eq(patternStateSnapshots.userId, userId),
        eq(patternStateSnapshots.snapshotDate, lastSatIso),
      ),
    )
  const beforeMap = new Map(beforeRows.map((r) => [r.patternId, r.theta]))

  const nowRows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
      label: nodes.label,
    })
    .from(patternState)
    .innerJoin(nodes, eq(nodes.id, patternState.patternId))
    .where(eq(patternState.userId, userId))

  const improvements: PatternImprovement[] = nowRows.map((r) => {
    const before = beforeMap.get(r.patternId) ?? 0.5
    return {
      patternId: r.patternId,
      patternLabel: r.label,
      thetaBefore: before,
      thetaAfter: r.theta,
      thetaDelta: r.theta - before,
    }
  })

  return improvements
    .filter((p) => p.thetaDelta > 0)
    .sort((a, b) => b.thetaDelta - a.thetaDelta)
    .slice(0, limit)
}

export interface PatternConcern {
  patternId: string
  patternLabel: string
  theta: number
}

export async function getTopConcerns(
  userId: string,
  limit = 3,
): Promise<PatternConcern[]> {
  const rows = await db
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
        sql`${patternState.attemptCount} >= 1`,
      ),
    )
    .orderBy(asc(patternState.theta))
    .limit(limit)
  return rows.map((r) => ({
    patternId: r.patternId,
    patternLabel: r.label,
    theta: r.theta,
  }))
}

// ============================================================
// Unified overview — /api/stats/overview 와 parent-report 공통.
// ============================================================

export interface StatsOverview {
  weeklyMasteryDelta: { thisWeek: number; lastWeek: number; delta: number }
  weakNodesReduced: { before: number; after: number; reduced: WeakPattern[] }
  studyMinutes: { totalAttempts: number; minutes: number }
  weeklyComparison: WeeklyRow[]
  solveTimeBreakdown: SolveTimeRow[]
  topImproved: PatternImprovement[]
  topConcerns: PatternConcern[]
}

export async function buildOverview(userId: string): Promise<StatsOverview> {
  const [
    weeklyMasteryDelta,
    weakNodesReduced,
    studyMinutes,
    weeklyComparison,
    solveTimeBreakdown,
    topImproved,
    topConcerns,
  ] = await Promise.all([
    getMasteryDelta(userId),
    getWeakNodesDelta(userId),
    getStudyMinutes(userId, 7),
    getWeeklyComparison(userId, 4),
    getSolveTimeBreakdown(userId, 7),
    getTopImproved(userId, 3),
    getTopConcerns(userId, 3),
  ])

  return {
    weeklyMasteryDelta,
    weakNodesReduced,
    studyMinutes,
    weeklyComparison,
    solveTimeBreakdown,
    topImproved,
    topConcerns,
  }
}

// ============================================================
// Snapshot writer — cron 에서 호출.
// ============================================================

export async function writeSnapshot(
  userId: string,
  snapshotDate: string,
): Promise<number> {
  const rows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
      attemptCount: patternState.attemptCount,
    })
    .from(patternState)
    .where(eq(patternState.userId, userId))

  if (rows.length === 0) return 0

  // upsert per row
  await db
    .insert(patternStateSnapshots)
    .values(
      rows.map((r) => ({
        userId,
        snapshotDate,
        patternId: r.patternId,
        theta: r.theta,
        attemptCount: r.attemptCount,
      })),
    )
    .onConflictDoUpdate({
      target: [
        patternStateSnapshots.userId,
        patternStateSnapshots.snapshotDate,
        patternStateSnapshots.patternId,
      ],
      set: {
        theta: sql`excluded.theta`,
        attemptCount: sql`excluded.attempt_count`,
      },
    })
  return rows.length
}

/** 활성 사용자 (지난 N일 풀이 기록 있는). */
export async function getActiveUserIdsForSnapshot(
  withinDays = 30,
): Promise<string[]> {
  const since = new Date(Date.now() - withinDays * 24 * 3600 * 1000)
  const rows = await db
    .selectDistinct({ userId: userItemHistory.userId })
    .from(userItemHistory)
    .where(gte(userItemHistory.lastSolvedAt, since))
  return rows.map((r) => r.userId)
}

// re-exports
export { isoDateInKst, snapshotIsoDate, weeksAgoSaturday }
