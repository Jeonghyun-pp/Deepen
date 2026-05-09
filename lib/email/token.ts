/**
 * 보호자 magic-link 토큰 — M3.4.
 * Spec: 09-q3-build.md M3.4 (보호자 동의 흐름).
 *
 * HMAC-SHA256(payload + expiresAt) — JWT 없이 의존성 X.
 * 인코딩: base64url("{userId}|{purpose}|{expiresAt}|{sig}")
 *
 * purpose:
 *   - 'consent'     : 보호자 동의 magic link (등록 직후 발송)
 *   - 'unsubscribe' : 모든 메일 푸터의 1-click 해지
 */
import crypto from "node:crypto"

const SECRET_FALLBACK = "deepen-parent-token-dev-secret"

function getSecret(): string {
  return (
    process.env.PARENT_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    SECRET_FALLBACK
  )
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url")
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex")
}

export type ParentTokenPurpose = "consent" | "unsubscribe"

export interface ParentTokenPayload {
  userId: string
  purpose: ParentTokenPurpose
  /** unix epoch ms. */
  expiresAt: number
}

/** 7일 만료 default. */
export function issueParentToken(
  userId: string,
  purpose: ParentTokenPurpose,
  ttlMs = 7 * 24 * 3600 * 1000,
): string {
  const expiresAt = Date.now() + ttlMs
  const body = `${userId}|${purpose}|${expiresAt}`
  const sig = sign(body)
  return b64url(Buffer.from(`${body}|${sig}`, "utf8"))
}

export function verifyParentToken(
  token: string,
  purpose: ParentTokenPurpose,
): ParentTokenPayload | null {
  let raw: string
  try {
    raw = Buffer.from(token, "base64url").toString("utf8")
  } catch {
    return null
  }
  const parts = raw.split("|")
  if (parts.length !== 4) return null
  const [userId, gotPurpose, expiresAtStr, sig] = parts
  if (gotPurpose !== purpose) return null
  const expiresAt = Number(expiresAtStr)
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null

  const body = `${userId}|${gotPurpose}|${expiresAtStr}`
  const want = sign(body)
  // timing-safe compare — Buffer.from(hex) drops invalid chars,
  // so we also require hex-shape and equal byte length.
  if (sig.length !== want.length) return null
  if (!/^[0-9a-f]+$/.test(sig)) return null
  const sigBuf = Buffer.from(sig, "hex")
  const wantBuf = Buffer.from(want, "hex")
  if (sigBuf.length !== wantBuf.length) return null
  if (!crypto.timingSafeEqual(sigBuf, wantBuf)) return null
  return { userId, purpose, expiresAt }
}
