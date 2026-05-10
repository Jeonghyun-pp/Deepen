import { describe, expect, it } from "vitest"
import { createHmac } from "node:crypto"
import { verifyTossSignature } from "@/lib/billing/verify-webhook"

const SECRET = "test_secret_do_not_use_in_prod"
const sign = (body: string): string =>
  createHmac("sha256", SECRET).update(body).digest("base64")

describe("verifyTossSignature", () => {
  it("valid signature passes", () => {
    const body = JSON.stringify({ eventType: "PAYMENT_STATUS_CHANGED" })
    const sig = sign(body)
    expect(verifyTossSignature(body, sig, SECRET)).toEqual({ ok: true })
  })

  it("tampered body fails (signature mismatch)", () => {
    const body = JSON.stringify({ eventType: "PAYMENT_STATUS_CHANGED" })
    const sig = sign(body)
    const tamperedBody = body + " "
    const r = verifyTossSignature(tamperedBody, sig, SECRET)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("mismatch")
  })

  it("missing signature header", () => {
    const r = verifyTossSignature("any", null, SECRET)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("missing_signature")
  })

  it("missing secret", () => {
    const r = verifyTossSignature("any", "any", undefined)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("missing_secret")
  })

  it("length mismatch", () => {
    const body = "hello"
    const r = verifyTossSignature(body, "short", SECRET)
    expect(r.ok).toBe(false)
    expect(r.reason).toBe("length_mismatch")
  })

  it("constant-time check survives partial-prefix attack", () => {
    // 같은 시작 prefix 라도 끝까지 다르면 mismatch.
    const body = "x"
    const sig = sign(body)
    const flipped = sig.slice(0, -1) + (sig.endsWith("a") ? "b" : "a")
    expect(verifyTossSignature(body, flipped, SECRET).ok).toBe(false)
  })
})
