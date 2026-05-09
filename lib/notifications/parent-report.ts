/**
 * 주간 보호자 리포트 — M3.4 + M3.5 리팩토링.
 * Spec: 09-q3-build.md M3.4·M3.5 (대시보드와 같은 숫자).
 *
 * 모든 집계는 lib/stats/aggregate.ts 의 truth source 를 그대로 사용.
 * "보호자 리포트와 같은 숫자" acceptance 보장.
 */
import { and, eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import type { ParentReportData } from "@/lib/email/templates"
import { issueParentToken } from "@/lib/email/token"
import { buildOverview } from "@/lib/stats/aggregate"
import { isoDateInKst, weeksAgoSaturday } from "@/lib/stats/time"

export async function buildParentReportData(args: {
  userId: string
  appUrl: string
}): Promise<ParentReportData | null> {
  const [u] = await db
    .select({
      displayName: users.displayName,
      parentEmail: users.parentEmail,
    })
    .from(users)
    .where(eq(users.id, args.userId))
    .limit(1)
  if (!u || !u.parentEmail) return null
  const studentName = u.displayName ?? "학생"

  const overview = await buildOverview(args.userId)

  // weekStart = 1주 전 토 boundary, weekEnd = 이번 주 토 boundary (또는 현재).
  const weekStartIso = isoDateInKst(weeksAgoSaturday(1))
  const weekEndIso = isoDateInKst(new Date())

  // fallback summary (LLM 미연결 시) — 음수 표현 회피한 4문장.
  const summary = buildFallbackSummary({
    studentName,
    totalAttempts: overview.studyMinutes.totalAttempts,
    minutesStudied: overview.studyMinutes.minutes,
    masteryDelta: overview.weeklyMasteryDelta.delta,
    topImproved: overview.topImproved,
  })

  const unsubscribeUrl =
    `${args.appUrl}/api/parents/unsubscribe?token=` +
    encodeURIComponent(
      issueParentToken(args.userId, "unsubscribe", 365 * 24 * 3600 * 1000),
    )

  return {
    studentName,
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    summary,
    totalAttempts: overview.studyMinutes.totalAttempts,
    minutesStudied: overview.studyMinutes.minutes,
    masteryDelta: overview.weeklyMasteryDelta.delta,
    weakReducedFrom: overview.weakNodesReduced.before,
    weakReducedTo: overview.weakNodesReduced.after,
    topImproved: overview.topImproved.map((p) => ({
      patternLabel: p.patternLabel,
      thetaDelta: p.thetaDelta,
    })),
    topConcerns: overview.topConcerns,
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
