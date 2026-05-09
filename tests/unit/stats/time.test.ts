import { describe, expect, it } from "vitest"
import {
  isoDateInKst,
  isoDateAddDays,
  nearestSaturdayBoundary,
  snapshotIsoDate,
  weeksAgoSaturday,
} from "@/lib/stats/time"

describe("KST time helpers", () => {
  it("isoDateInKst: UTC 자정에 KST 09:00 → 같은 날", () => {
    // 2026-05-10 00:00 UTC = 09:00 KST 같은 날
    expect(isoDateInKst(new Date("2026-05-10T00:00:00Z"))).toBe("2026-05-10")
  })
  it("isoDateInKst: UTC 17:00 화 = KST 02:00 수", () => {
    expect(isoDateInKst(new Date("2026-05-12T17:00:00Z"))).toBe("2026-05-13")
  })
  it("isoDateAddDays", () => {
    expect(isoDateAddDays("2026-05-10", 7)).toBe("2026-05-17")
  })
  it("nearestSaturdayBoundary: 토요일 23:00 KST 직전이면 직전 토", () => {
    // 토 22:00 KST = 13:00 UTC
    const before = new Date("2026-05-09T13:00:00Z")
    const sat = nearestSaturdayBoundary(before)
    // 직전 토 = 5/2 14:00 UTC (= 5/2 토 23:00 KST)
    expect(sat.toISOString()).toBe("2026-05-02T14:00:00.000Z")
  })
  it("nearestSaturdayBoundary: 토 23:00 KST 이후면 그 토", () => {
    // 토 24:00 KST = 15:00 UTC
    const after = new Date("2026-05-09T15:00:00Z")
    const sat = nearestSaturdayBoundary(after)
    expect(sat.toISOString()).toBe("2026-05-09T14:00:00.000Z")
  })
  it("snapshotIsoDate: 토 23:00 KST 이전이면 직전 토 ISO", () => {
    const before = new Date("2026-05-09T13:00:00Z")
    expect(snapshotIsoDate(before)).toBe("2026-05-02")
  })
  it("weeksAgoSaturday: 현재 토 boundary 에서 1주 전", () => {
    const ref = new Date("2026-05-09T15:00:00Z") // 토 24:00 KST
    const oneWeekAgo = weeksAgoSaturday(1, ref)
    expect(oneWeekAgo.toISOString()).toBe("2026-05-02T14:00:00.000Z")
  })
})
