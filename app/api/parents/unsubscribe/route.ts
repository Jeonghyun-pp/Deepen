/**
 * GET /api/parents/unsubscribe?token=... — 1-click 해지.
 * Spec: 09-q3-build.md M3.4. parent_unsubscribed_at = now.
 *
 * Resend / 메일 클라이언트 호환을 위해 GET. token 인증.
 */
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { verifyParentToken } from "@/lib/email/token"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://deepen.lab"
}

function htmlResponse(body: string, status = 200): Response {
  const home = appUrl()
  return new Response(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8">
    <title>Deepen 보호자 리포트 해지</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head><body style="margin:0;padding:0;background:#fafafa;font-family:system-ui,-apple-system,Segoe UI,Roboto,Apple SD Gothic Neo,Noto Sans KR,sans-serif">
    <main style="max-width:520px;margin:64px auto;padding:32px;background:#fff;border:1px solid #e5e7eb;border-radius:12px">
    ${body}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px 0">
    <p style="margin:0;font-size:12px;color:#6b7280">
      Deepen — 입시 학습 코치 ·
      <a href="${home}" style="color:#15803d;text-decoration:none">학생 화면 보러가기 →</a>
    </p>
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
  const payload = verifyParentToken(token, "unsubscribe")
  if (!payload) {
    return htmlResponse(
      `<h1 style="margin:0 0 8px 0;font-size:18px">링크가 유효하지 않아요</h1>
       <p style="margin:0;color:#6b7280;font-size:13px">최신 리포트의 해지 링크를 다시 클릭해 주세요.</p>`,
      400,
    )
  }

  await db
    .update(users)
    .set({ parentUnsubscribedAt: new Date() })
    .where(eq(users.id, payload.userId))

  return htmlResponse(
    `<h1 style="margin:0 0 8px 0;font-size:18px">해지가 완료되었습니다</h1>
     <p style="margin:0 0 16px 0;font-size:14px;color:#1f2937">다음 주부터 보호자 리포트가 발송되지 않습니다.</p>
     <p style="margin:0;color:#6b7280;font-size:12px">학생이 다시 요청하면 동의 메일이 새로 발송될 수 있어요.</p>`,
  )
}

export const POST = GET
