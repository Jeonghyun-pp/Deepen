/**
 * POST /api/onboard/complete — 온보드 4-step 완료 마킹.
 * Phase A 끊김1 fix.
 *
 * users.onboarded_at = now() 로 upsert. 멱등성 보장.
 * 홈 진입 시 이 컬럼이 null 이면 /v2/onboard/profile 로 redirect.
 */
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/onboard/complete",
  async (_request, { user }) => {
    await db
      .insert(users)
      .values({ id: user.id, onboardedAt: sql`now()` })
      .onConflictDoUpdate({
        target: users.id,
        set: { onboardedAt: sql`now()` },
      })
    return Response.json({ ok: true })
  },
)
