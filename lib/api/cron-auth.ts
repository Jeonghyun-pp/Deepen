/**
 * cron 라우트 공용 인증 — Bearer ${CRON_SECRET}.
 * Spec: 09-q3-build.md M3.4. CRON_SECRET 미설정 시 prod=거절, dev=허용.
 */

export function checkCronAuth(request: Request): { ok: boolean; error?: string } {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? ""
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== cronSecret) {
      return { ok: false, error: "unauthorized" }
    }
    return { ok: true }
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "cron_secret_missing" }
  }
  return { ok: true }
}
