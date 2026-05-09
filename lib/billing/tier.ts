/**
 * 가격 티어 single source of truth.
 * Spec: docs/build-spec/09-q3-build.md M3.1, 결정 C-9.
 *
 * Free 평생 5회 / Pro 일 30회 / Pro+ 무제한.
 * 가격: 월 9,900원 (오르조 F 가이드라인 — 연 8.5만원 이하 충족).
 *      연 결제 시 99,000원 (할인 17%) — Q3 결제 도입 후.
 */

export type TierKey = "free" | "pro" | "pro_plus"

export type AiCap =
  | { kind: "lifetime"; value: number }
  | { kind: "daily"; value: number }
  | { kind: "unlimited" }

export interface TierConfig {
  key: TierKey
  label: string
  monthlyKrw: number
  yearlyKrw: number | null
  aiCap: AiCap
  highlights: string[]
}

export const TIERS: Record<TierKey, TierConfig> = {
  free: {
    key: "free",
    label: "무료",
    monthlyKrw: 0,
    yearlyKrw: null,
    aiCap: { kind: "lifetime", value: 5 },
    highlights: [
      "AI 코치 평생 5회",
      "풀이·리캡카드·그래프 모두 사용",
      "오답복구 모드 사용",
    ],
  },
  pro: {
    key: "pro",
    label: "Pro",
    monthlyKrw: 9_900,
    yearlyKrw: 99_000,
    aiCap: { kind: "daily", value: 30 },
    highlights: [
      "AI 코치 일 30회 (KST 자정 리셋)",
      "보호자 주간 리포트",
      "실전 모드 batch 결과 분석",
    ],
  },
  pro_plus: {
    key: "pro_plus",
    label: "Pro+",
    monthlyKrw: 19_900,
    yearlyKrw: 199_000,
    aiCap: { kind: "unlimited" },
    highlights: [
      "AI 코치 무제한",
      "Pro 모든 기능",
      "우선 지원 + 베타 기능 선공개",
    ],
  },
} as const

export const formatKrw = (krw: number): string =>
  krw.toLocaleString("ko-KR") + "원"

export const aiCapLabel = (cap: AiCap): string => {
  if (cap.kind === "unlimited") return "무제한"
  if (cap.kind === "daily") return `일 ${cap.value}회`
  return `평생 ${cap.value}회`
}
