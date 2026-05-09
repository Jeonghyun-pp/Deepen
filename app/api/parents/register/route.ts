/**
 * POST /api/parents/register — 학생이 보호자 이메일 입력.
 * Spec: 09-q3-build.md M3.4 (보호자 동의 흐름 1단계).
 *
 * 동작:
 *   1) users.parent_email 갱신, parent_consent_at 초기화
 *   2) 동의 magic link 발송 (consent purpose, 7일 만료)
 *   3) 발송 결과 응답 (Resend 미설정 시 dryRun=true)
 */
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import { issueParentToken } from "@/lib/email/token"
import { parentConsentEmail } from "@/lib/email/templates"
import { sendEmail } from "@/lib/email/send"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const Body = z.object({
  email: z.string().email().max(254),
})

export const POST = withAuth(
  "POST /api/parents/register",
  async (request, { user }) => {
    let body: z.infer<typeof Body>
    try {
      body = Body.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // user upsert (auth.users 는 있어도 public.users 가 없을 수 있음)
    await db
      .insert(users)
      .values({
        id: user.id,
        parentEmail: body.email,
        parentConsentAt: null,
        parentUnsubscribedAt: null,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          parentEmail: body.email,
          parentConsentAt: null,
          parentUnsubscribedAt: null,
        },
      })

    const [profile] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1)
    const studentName = profile?.displayName ?? "학생"

    const token = issueParentToken(user.id, "consent")
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const consentUrl = `${appUrl}/api/parents/confirm?token=${encodeURIComponent(token)}`

    const tpl = parentConsentEmail({ studentName, consentUrl })
    const sendResult = await sendEmail({
      to: body.email,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    })

    return Response.json({
      ok: sendResult.ok,
      dryRun: sendResult.dryRun,
      error: sendResult.error ?? null,
    })
  },
)
