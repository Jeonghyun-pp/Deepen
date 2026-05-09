import { describe, expect, it } from "vitest"
import {
  initialRetryState,
  retryReducer,
  type RetryState,
} from "@/lib/session/retry-machine"

const ITEM = "11111111-1111-1111-1111-111111111111"
const P1 = "22222222-2222-2222-2222-222222222222"
const P2 = "33333333-3333-3333-3333-333333333333"

const wrongRecap = (state: RetryState): RetryState =>
  retryReducer(state, {
    type: "WRONG_WITH_RECAP",
    storedItemId: ITEM,
    storedItemLabel: "2024 9월 미적분 22번",
    recapPatternIds: [P1, P2],
  })

describe("retry-machine", () => {
  it("WRONG_WITH_RECAP 이 storedItemId, recapPatternIds 보존", () => {
    const s = wrongRecap(initialRetryState)
    expect(s.name).toBe("awaiting_recap")
    expect(s.ctx.storedItemId).toBe(ITEM)
    expect(s.ctx.recapPatternIds).toEqual([P1, P2])
  })

  it("RECAP_ALL_PASSED → recap_passed", () => {
    const a = wrongRecap(initialRetryState)
    const b = retryReducer(a, { type: "RECAP_ALL_PASSED" })
    expect(b.name).toBe("recap_passed")
  })

  it("ACCEPT_RETRY → retrying", () => {
    const a = retryReducer(wrongRecap(initialRetryState), {
      type: "RECAP_ALL_PASSED",
    })
    const b = retryReducer(a, { type: "ACCEPT_RETRY" })
    expect(b.name).toBe("retrying")
  })

  it("SKIP_RETRY → completed", () => {
    const a = retryReducer(wrongRecap(initialRetryState), {
      type: "RECAP_ALL_PASSED",
    })
    const b = retryReducer(a, { type: "SKIP_RETRY" })
    expect(b.name).toBe("completed")
  })

  it("RETRY_RESULT(true) → completed + retrySucceeded=true", () => {
    let s = wrongRecap(initialRetryState)
    s = retryReducer(s, { type: "RECAP_ALL_PASSED" })
    s = retryReducer(s, { type: "ACCEPT_RETRY" })
    s = retryReducer(s, { type: "RETRY_RESULT", correct: true })
    expect(s.name).toBe("completed")
    expect(s.ctx.retrySucceeded).toBe(true)
  })

  it("RESET — 어디서든 idle 로", () => {
    let s = wrongRecap(initialRetryState)
    s = retryReducer(s, { type: "RECAP_ALL_PASSED" })
    s = retryReducer(s, { type: "RESET" })
    expect(s.name).toBe("idle")
    expect(s.ctx.storedItemId).toBeNull()
  })

  it("잘못된 순서 (idle 에서 ACCEPT_RETRY) — 무시", () => {
    const s = retryReducer(initialRetryState, { type: "ACCEPT_RETRY" })
    expect(s.name).toBe("idle")
  })

  it("recap 미통과 상태에서 ACCEPT_RETRY — 무시 (awaiting_recap 유지)", () => {
    const a = wrongRecap(initialRetryState)
    const b = retryReducer(a, { type: "ACCEPT_RETRY" })
    expect(b.name).toBe("awaiting_recap")
  })
})
