import { describe, expect, it, beforeAll } from "vitest"
import {
  issueParentToken,
  verifyParentToken,
} from "@/lib/email/token"

beforeAll(() => {
  process.env.PARENT_TOKEN_SECRET = "test-secret-do-not-use-in-prod"
})

const USER = "11111111-1111-1111-1111-111111111111"

describe("parent token", () => {
  it("동일 purpose 검증 통과", () => {
    const t = issueParentToken(USER, "consent")
    const p = verifyParentToken(t, "consent")
    expect(p?.userId).toBe(USER)
    expect(p?.purpose).toBe("consent")
  })

  it("다른 purpose 거절", () => {
    const t = issueParentToken(USER, "consent")
    expect(verifyParentToken(t, "unsubscribe")).toBeNull()
  })

  it("만료된 토큰 거절", () => {
    const t = issueParentToken(USER, "consent", -1000)
    expect(verifyParentToken(t, "consent")).toBeNull()
  })

  it("위변조 토큰 거절", () => {
    const t = issueParentToken(USER, "consent")
    const tampered = t.slice(0, -2) + "AA"
    expect(verifyParentToken(tampered, "consent")).toBeNull()
  })

  it("잘못된 형식 거절", () => {
    expect(verifyParentToken("not-a-token", "consent")).toBeNull()
    expect(verifyParentToken("", "consent")).toBeNull()
  })
})
