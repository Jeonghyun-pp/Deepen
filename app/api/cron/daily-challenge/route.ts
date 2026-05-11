/**
 * POST /api/cron/daily-challenge — 매일 00:30 KST.
 * Spec: 09-q3-build.md M3.4.
 *
 * 활성 사용자 (14일 내 풀이) 모두에 대해 약점 3 Pattern × 1문제 추출.
 * daily_challenges 테이블에 (user_id, generated_for_date) PK 로 저장 (멱등성).
 *
 * cohort 1000명 기준 — Pattern lookup + Item lookup 만 → ≤ 5분.
 */
import { db } from "@/lib/db"
import { dailyChallenges } from "@/lib/db/schema"
import { checkCronAuth } from "@/lib/api/cron-auth"
import {
  defaultDailyCopy,
  getActiveUserIds,
  pickDailyChallengeItems,
} from "@/lib/notifications/daily-challenge"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// 코호트 1000명 × Pattern·Item lookup — spec 상 ≤ 5분.
export const maxDuration = 300

/** KST 자정 기준 'YYYY-MM-DD'. */
function todayKstIso(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0")
  const d = String(kst.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

async function handle(request: Request) {
  const auth = checkCronAuth(request)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 })
  }

  const generatedForDate = todayKstIso()
  const userIds = await getActiveUserIds(14)

  let processed = 0
  let stored = 0
  let skipped = 0

  for (const userId of userIds) {
    processed++
    try {
      const items = await pickDailyChallengeItems(userId)
      if (items.length === 0) {
        skipped++
        continue
      }
      const copy = defaultDailyCopy(items) ?? null

      // PK 중복 = 이미 오늘 생성됨 → upsert 로 멱등.
      await db
        .insert(dailyChallenges)
        .values({
          userId,
          generatedForDate,
          items,
          copy,
        })
        .onConflictDoUpdate({
          target: [dailyChallenges.userId, dailyChallenges.generatedForDate],
          set: { items, copy, createdAt: new Date() },
        })
      stored++
    } catch (e) {
      console.warn(
        `[cron/daily-challenge] user=${userId} 실패`,
        (e as Error).message,
      )
      skipped++
    }
  }

  return Response.json({
    ok: true,
    generatedForDate,
    processed,
    stored,
    skipped,
  })
}

export const GET = handle
export const POST = handle
