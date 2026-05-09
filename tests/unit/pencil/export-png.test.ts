/**
 * lib/pencil/export-png.ts — base64ByteSize + 상수 lock.
 * Spec: docs/build-spec/08-q2-build.md M2.1 Acceptance.
 *
 * 통합 테스트 (실제 tldraw editor → PNG export) 는 jsdom canvas mock
 * 필요 → Playwright E2E 로 별도 (M2.6 통합).
 */

import { describe, expect, it } from "vitest"
import { base64ByteSize } from "@/lib/pencil/export-png"
import {
  EXPORT_MAX_BYTES,
  EXPORT_MAX_DIMENSION,
  PEN_COLORS,
  PEN_SIZES,
} from "@/lib/pencil/tools-config"

describe("base64ByteSize", () => {
  it("data URL prefix 가 있으면 콤마 뒤 base64 만 사용", () => {
    // 4 char (no padding) = 3 bytes
    expect(base64ByteSize("data:image/png;base64,QUJDRA==")).toBe(4) // "ABCD"
  })

  it("padding 1 (=) 보정", () => {
    // QUI=  → "AB" (2 bytes)
    expect(base64ByteSize("QUI=")).toBe(2)
  })

  it("padding 2 (==) 보정", () => {
    // QQ==  → "A" (1 byte)
    expect(base64ByteSize("QQ==")).toBe(1)
  })

  it("padding 없음", () => {
    // QUJDRA  6 chars = 4.5 bytes → floor 4
    expect(base64ByteSize("QUJDRA")).toBe(4)
  })

  it("긴 문자열 — 1MB 정도", () => {
    // 1.4M chars base64 → ~1.05MB binary
    const long = "A".repeat(1_400_000)
    const size = base64ByteSize(long)
    expect(size).toBeGreaterThan(1_000_000)
    expect(size).toBeLessThan(1_100_000)
  })
})

describe("tools-config 상수 (lock)", () => {
  it("EXPORT_MAX_DIMENSION = 1600", () => {
    expect(EXPORT_MAX_DIMENSION).toBe(1600)
  })

  it("EXPORT_MAX_BYTES = 4MB", () => {
    expect(EXPORT_MAX_BYTES).toBe(4 * 1024 * 1024)
  })

  it("PEN_COLORS 정확히 3종 (검정·파랑·빨강)", () => {
    expect(PEN_COLORS).toHaveLength(3)
    expect(PEN_COLORS.map((c) => c.key)).toEqual(["black", "blue", "red"])
  })

  it("PEN_SIZES 정확히 3종 (얇·중·굵)", () => {
    expect(PEN_SIZES).toHaveLength(3)
    expect(PEN_SIZES.map((s) => s.key)).toEqual(["thin", "mid", "thick"])
  })

  it("색은 hex 포맷", () => {
    for (const c of PEN_COLORS) {
      expect(c.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it("굵기는 양수 px", () => {
    for (const s of PEN_SIZES) {
      expect(s.px).toBeGreaterThan(0)
    }
  })
})
