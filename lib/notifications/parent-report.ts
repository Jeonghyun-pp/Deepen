/**
 * 주간 보호자 리포트 — M3.4.
 * Spec: 09-q3-build.md M3.4 (집계 항목 lock), 05-llm-prompts.md §8 (요약 톤).
 *
 * 데이터 lock:
 *   - totalAttempts (지난 7일)
 *   - minutesStudied (timeMs 합 → 분)
 *   - masteryDelta (지난 7일 평균 theta 변화)
 *   - weakReducedFrom / weakReducedTo (theta < 0.4 카운트)
 *   - topImproved 3개 / topConcerns 3개
 *   - summary (Opus 4문장 요약, 음수 표현 회피)
 */
import { and, eq, gte, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, patternState, userItemHistory, users } from "@/lib/db/schema"
import type { ParentReportData } from "@/lib/email/templates"
import { issueParentToken } from "@/lib/email/token"

const WEAK_THETA_THRESHOLD = 0.4

export async function buildParentReportData(args: {
  userId: string
  weekStart: Date
  weekEnd: Date
  appUrl: string
}): Promise<ParentReportData | null> {
  const { userId, weekStart, weekEnd } = args

  const [u] = await db
    .select({
      displayName: users.displayName,
      parentEmail: users.parentEmail,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!u || !u.parentEmail) return null
  const studentName = u.displayName ?? "학생"

  // 지난 주 attempt 집계
  const attemptRows = await db
    .select({
      itemId: userItemHistory.itemId,
      resultHistory: userItemHistory.resultHistory,
      lastSolvedAt: userItemHistory.lastSolvedAt,
    })
    .from(userItemHistory)
    .where(
      and(
        eq(userItemHistory.userId, userId),
        gte(userItemHistory.lastSolvedAt, weekStart),
      ),
    )

  let totalAttempts = 0
  let timeMsSum = 0
  for (const r of attemptRows) {
    const hist = (r.resultHistory ?? []) as Array<{
      timestamp: string
      signals: { timeMs: number }
    }>
    for (const h of hist) {
      const t = new Date(h.timestamp).getTime()
      if (t < weekStart.getTime() || t > weekEnd.getTime()) continue
      totalAttempts++
      timeMsSum += h.signals?.timeMs ?? 0
    }
  }
  const minutesStudied = timeMsSum / 60000

  // 현재 patternState (지난 주 시점 추정 — 단순화: 지금 theta 만 사용 +
  // weak 카운트 절대값. 정밀 delta 는 시계열 테이블 필요한데 M3.5 에서 도입).
  const stateRows = await db
    .select({
      patternId: patternState.patternId,
      theta: patternState.theta,
      lastUpdatedAt: patternState.lastUpdatedAt,
      attemptCount: patternState.attemptCount,
      label: nodes.label,
    })
    .from(patternState)
    .innerJoin(nodes, eq(nodes.id, patternState.patternId))
    .where(eq(patternState.userId, userId))

  const weakReducedTo = stateRows.filter(
    (r) => r.theta < WEAK_THETA_THRESHOLD,
  ).length
  // before = 지난 주 시점에는 +지난 주 학습 효과 안 받았다고 가정 → 단순히
  // weakReducedTo + 지난 주 마스터한 수. 정밀 시계열은 M3.5.
  const recentMastered = stateRows.filter(
    (r) =>
      r.lastUpdatedAt &&
      r.lastUpdatedAt >= weekStart &&
      r.theta >= WEAK_THETA_THRESHOLD,
  ).length
  const weakReducedFrom = weakReducedTo + recentMastered

  // mastery delta — 지난 주 갱신된 Pattern 만 평균
  const deltaRows = stateRows.filter(
    (r) => r.lastUpdatedAt && r.lastUpdatedAt >= weekStart,
  )
  const masteryDelta =
    deltaRows.length === 0
      ? 0
      : deltaRows.reduce((acc, r) => acc + (r.theta - 0.5), 0) /
        deltaRows.length /
        4 // 0.5 → theta 의 변화량 추정 휴리스틱

  // topImproved — 지난 주 갱신 + theta 가장 높은 3개
  const topImproved = [...deltaRows]
    .sort((a, b) => b.theta - a.theta)
    .slice(0, 3)
    .map((r) => ({
      patternLabel: r.label,
      thetaDelta: Math.max(0, r.theta - 0.5),
    }))

  // topConcerns — theta 가장 낮은 + attemptCount >= 1, 3개
  const topConcerns = [...stateRows]
    .filter((r) => r.attemptCount >= 1)
    .sort((a, b) => a.theta - b.theta)
    .slice(0, 3)
    .map((r) => ({ patternLabel: r.label, theta: r.theta }))

  // summary fallback (LLM 미연결 시) — 음수 표현 회피한 4문장 템플릿
  const summary = buildFallbackSummary({
    studentName,
    totalAttempts,
    minutesStudied,
    masteryDelta,
    topImproved,
  })

  const unsubscribeUrl =
    `${args.appUrl}/api/parents/unsubscribe?token=` +
    encodeURIComponent(issueParentToken(userId, "unsubscribe", 365 * 24 * 3600 * 1000))

  return {
    studentName,
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    summary,
    totalAttempts,
    minutesStudied,
    masteryDelta,
    weakReducedFrom,
    weakReducedTo,
    topImproved,
    topConcerns,
    unsubscribeUrl,
  }
}

function buildFallbackSummary(args: {
  studentName: string
  totalAttempts: number
  minutesStudied: number
  masteryDelta: number
  topImproved: { patternLabel: string }[]
}): string {
  const head = `${args.studentName}님은 이번 주 ${Math.round(args.minutesStudied)}분 동안 ${args.totalAttempts}문제를 풀었습니다.`
  const improved =
    args.topImproved.length > 0
      ? `${args.topImproved[0].patternLabel}을(를) 중심으로 마스터리가 자리잡고 있어요.`
      : `한 주 동안 꾸준히 학습 흐름을 이어갔어요.`
  const moved =
    args.masteryDelta > 0
      ? `평균 마스터리는 한 단계 더 올라섰습니다.`
      : `약점을 정리하는 데 집중한 한 주였습니다.`
  const close = `다음 주에도 같은 페이스로 함께 응원해 주세요.`
  return `${head} ${improved} ${moved} ${close}`
}

function formatDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** 발송 대상 cohort: parent_consent_at IS NOT NULL AND parent_unsubscribed_at IS NULL. */
export async function getReportRecipients(): Promise<{
  userId: string
  parentEmail: string
}[]> {
  const rows = await db
    .select({
      id: users.id,
      parentEmail: users.parentEmail,
    })
    .from(users)
    .where(
      and(
        sql`${users.parentConsentAt} IS NOT NULL`,
        sql`${users.parentUnsubscribedAt} IS NULL`,
        sql`${users.parentEmail} IS NOT NULL`,
      ),
    )
  return rows
    .filter((r): r is { id: string; parentEmail: string } => !!r.parentEmail)
    .map((r) => ({ userId: r.id, parentEmail: r.parentEmail }))
}
