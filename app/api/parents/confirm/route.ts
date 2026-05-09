/**
 * GET /api/parents/confirm?token=... — 보호자가 magic link 클릭.
 * Spec: 09-q3-build.md M3.4. parent_consent_at = now.
 *
 * 인증 X (token 자체가 인증). 응답은 단순 HTML 페이지 (보호자가 보는).
 */
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyParentToken } from "@/lib/email/token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function htmlResponse(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
    <title>Deepen 보호자 동의</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head><body style="margin:0;padding:0;background:#fafafa;font-family:system-ui,-apple-system,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,sans-serif">
    <main style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border:1px solid #e5e7eb;border-radius:12px">
    ${body}
    </main></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get("token") ?? ""
  const payload = verifyParentToken(token, "consent")
  if (!payload) {
    return htmlResponse(
      `<h1 style="margin:0 0 8px 0;font-size:18px">링크가 만료되었어요</h1>
       <p style="margin:0;color:#6b7280;font-size:13px">학생에게 새 동의 메일을 다시 요청해 주세요.</p>`,
      400,
    )
  }

  await db
    .update(users)
    .set({
      parentConsentAt: new Date(),
      parentUnsubscribedAt: null,
    })
    .where(eq(users.id, payload.userId))

  return htmlResponse(
    `<h1 style="margin:0 0 8px 0;font-size:18px;color:#15803d">동의가 완료되었습니다</h1>
     <p style="margin:0 0 16px 0;font-size:14px;color:#1f2937">매주 일요일 오전 9시(KST)에 첫 학습 리포트가 발송됩니다.</p>
     <p style="margin:0;color:#6b7280;font-size:12px">언제든 메일 푸터의 해지 링크 한 번이면 발송이 종료됩니다.</p>`,
  )
}
