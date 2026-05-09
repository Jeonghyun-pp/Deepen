/**
 * 펜 색·굵기 프리셋.
 * Spec: docs/build-spec/08-q2-build.md M2.1 Acceptance — 색 3종 + 굵기 3종.
 * 오르조 후기 src 6/7 — 학생들이 자주 쓰는 검정/파랑/빨강 + 가는/중간/굵은.
 */

export const PEN_COLORS = [
  { key: "black", label: "검정", hex: "#0F1411" },
  { key: "blue", label: "파랑", hex: "#1D4ED8" },
  { key: "red", label: "빨강", hex: "#DC2626" },
] as const

export type PenColorKey = (typeof PEN_COLORS)[number]["key"]

export const PEN_SIZES = [
  { key: "thin", label: "얇게", px: 2 },
  { key: "mid", label: "보통", px: 4 },
  { key: "thick", label: "굵게", px: 7 },
] as const

export type PenSizeKey = (typeof PEN_SIZES)[number]["key"]

export const DEFAULT_COLOR: PenColorKey = "black"
export const DEFAULT_SIZE: PenSizeKey = "mid"

/** PNG export 시 longer side 상한 — spec acceptance lock. */
export const EXPORT_MAX_DIMENSION = 1600
/** base64 size 상한 약 4MB — spec acceptance lock. */
export const EXPORT_MAX_BYTES = 4 * 1024 * 1024
