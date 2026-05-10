import { describe, expect, it } from "vitest"
import { generateOrderId, parseOrderId } from "@/lib/billing/orders"

describe("orderId encode/decode", () => {
  it("pro round-trip", () => {
    const id = generateOrderId("pro")
    expect(id).toMatch(/^dpn_p_[0-9a-f]{32}$/)
    const parsed = parseOrderId(id)
    expect(parsed?.tier).toBe("pro")
    expect(parsed?.nonce.length).toBe(32)
  })

  it("pro_plus round-trip", () => {
    const id = generateOrderId("pro_plus")
    expect(id).toMatch(/^dpn_pp_[0-9a-f]{32}$/)
    const parsed = parseOrderId(id)
    expect(parsed?.tier).toBe("pro_plus")
  })

  it("each call yields unique nonce", () => {
    const a = generateOrderId("pro")
    const b = generateOrderId("pro")
    expect(a).not.toBe(b)
  })

  it("rejects malformed orderId", () => {
    expect(parseOrderId("invalid")).toBeNull()
    expect(parseOrderId("dpn_p_short")).toBeNull()
    expect(parseOrderId("dpn_x_" + "a".repeat(32))).toBeNull()
    expect(parseOrderId("")).toBeNull()
  })

  it("orderId length within Toss 64-char limit", () => {
    const id = generateOrderId("pro_plus")
    expect(id.length).toBeLessThanOrEqual(64)
  })
})
