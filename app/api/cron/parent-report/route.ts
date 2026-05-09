/**
 * POST /api/cron/parent-report — 매주 일 09:00 KST.
 * Spec: 09-q3-build.md M3.4.
 *
 * parent_consent_at IS NOT NULL AND parent_unsubscribed_at IS NULL 인
 * 사용자에게 지난 7일 학습 리포트 발송.
 * users.last_parent_report_sent_at 으로 같은 ISO week 중복 발송 방지.
 */
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { checkCronAuth } from "@/lib/api/cron-auth"
import {
  buildParentReportData,
  getReportRecipients,
} from "@/lib/notifications/parent-report"
import { parentReportEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/send"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ONE_WEEK_MS = 7 * 24 * 3600 * 1000

async function handle(request: Request) {
  const auth = checkCronAuth(request)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 })
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://deepen.app"

  const now = new Date()
  const recipients = await getReportRecipients()

  let sent = 0
  let skippedAlreadySent = 0
  let dryRun = 0
  const errors: string[] = []

  for (const r of recipients) {
    // 같은 주 중복 방지
    const [u] = await db
      .select({ last: users.lastParentReportSentAt })
      .from(users)
      .where(eq(users.id, r.userId))
      .limit(1)
    if (
      u?.last &&
      now.getTime() - u.last.getTime() < ONE_WEEK_MS - 6 * 3600 * 1000
    ) {
      skippedAlreadySent++
      continue
    }

    try {
      const data = await buildParentReportData({
        userId: r.userId,
        appUrl,
      })
      if (!data) {
        errors.push(`user=${r.userId}: report_build_failed`)
        continue
      }
      const tpl = parentReportEmail(data)
      const result = await sendEmail({
        to: r.parentEmail,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
      })
      if (result.dryRun) dryRun++
      if (result.ok) {
        sent++
        await db
          .update(users)
          .set({ lastParentReportSentAt: new Date() })
          .where(eq(users.id, r.userId))
      } else {
        errors.push(
          `user=${r.userId}: ${result.error ?? "send_failed"}`,
        )
      }
    } catch (e) {
      errors.push(`user=${r.userId}: ${(e as Error).message}`)
    }
  }

  return Response.json({
    ok: true,
    recipients: recipients.length,
    sent,
    skippedAlreadySent,
    dryRun,
    errors: errors.slice(0, 20),
  })
}

export const GET = handle
export const POST = handle
