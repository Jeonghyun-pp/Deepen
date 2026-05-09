/**
 * GET /api/recommend/daily-challenge — 오늘의 챌린지 (UI 헤더 배지).
 * Spec: 03-api-contracts.md §5, 09-q3-build.md M3.4.
 *
 * cron 이 daily_challenges 에 미리 적재한 것을 조회. 없으면 즉석 계산
 * 후 저장 (사용자가 cron 보다 먼저 진입한 경우).
 */
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { dailyChallenges } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"
import {
  defaultDailyCopy,
  pickDailyChallengeItems,
} from "@/lib/notifications/daily-challenge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function todayKstIso(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(kst.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export const GET = withAuth(
  "GET /api/recommend/daily-challenge",
  async (_request, { user }) => {
    const generatedForDate = todayKstIso()

    const [cached] = await db
      .select()
      .from(dailyChallenges)
      .where(
        and(
          eq(dailyChallenges.userId, user.id),
          eq(dailyChallenges.generatedForDate, generatedForDate),
        ),
      )
      .limit(1)

    if (cached) {
      return Response.json({
        date: generatedForDate,
        items: cached.items,
        copy: cached.copy,
        cached: true,
      })
    }

    // 즉석 계산 + 저장 (사용자가 cron 전에 진입)
    const items = await pickDailyChallengeItems(user.id)
    const copy = defaultDailyCopy(items)
    if (items.length > 0) {
      await db
        .insert(dailyChallenges)
        .values({
          userId: user.id,
          generatedForDate,
          items,
          copy: copy ?? null,
        })
        .onConflictDoNothing()
    }

    return Response.json({
      date: generatedForDate,
      items,
      copy,
      cached: false,
    })
  },
)
