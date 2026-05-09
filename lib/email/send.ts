/**
 * Resend wrapper (REST API 직호출 — SDK 미사용).
 * Spec: 09-q3-build.md M3.4.
 *
 * RESEND_API_KEY 미설정 시 console.warn 후 dryRun=true 로 정상 응답.
 * (dev/staging 에서 인프라 없이도 흐름 작동.)
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails"

export interface SendEmailArgs {
  to: string
  subject: string
  html: string
  text?: string
  /** 미설정 시 'Deepen <onboarding@resend.dev>'. */
  from?: string
}

export interface SendEmailResult {
  ok: boolean
  /** Resend 응답의 message id 또는 dryRun 표시. */
  id: string | null
  dryRun: boolean
  error?: string
}

const DEFAULT_FROM =
  process.env.RESEND_FROM ?? "Deepen <onboarding@resend.dev>"

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(
      `[email.send] RESEND_API_KEY 미설정 — dryRun. to=${args.to} subject=${args.subject}`,
    )
    return { ok: true, id: null, dryRun: true }
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: args.from ?? DEFAULT_FROM,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => "")
      return {
        ok: false,
        id: null,
        dryRun: false,
        error: `resend_${res.status}: ${errBody.slice(0, 200)}`,
      }
    }
    const data = (await res.json()) as { id?: string }
    return { ok: true, id: data.id ?? null, dryRun: false }
  } catch (e) {
    return {
      ok: false,
      id: null,
      dryRun: false,
      error: (e as Error).message,
    }
  }
}
