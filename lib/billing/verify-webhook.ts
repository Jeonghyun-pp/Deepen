/**
 * Toss webhook signature 검증.
 * Spec: 09-q3-build.md M3.1 §결제 webhook 처리.
 *
 * HMAC-SHA256(rawBody, TOSS_SECRET_KEY) base64 == 헤더 값.
 * timing-safe 비교 — 길이 다르면 즉시 false (timingSafeEqual 은 동일 길이 필요).
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export interface VerifyResult {
  ok: boolean
  reason?: "missing_secret" | "missing_signature" | "length_mismatch" | "mismatch"
}

export function verifyTossSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): VerifyResult {
  if (!secret) return { ok: false, reason: "missing_secret" }
  if (!signatureHeader) return { ok: false, reason: "missing_signature" }

  const computed = createHmac("sha256", secret).update(rawBody).digest("base64")
  const got = Buffer.from(signatureHeader, "utf8")
  const exp = Buffer.from(computed, "utf8")
  if (got.length !== exp.length) return { ok: false, reason: "length_mismatch" }
  return timingSafeEqual(got, exp)
    ? { ok: true }
    : { ok: false, reason: "mismatch" }
}
