"use client"

/**
 * AI 코치 5칩.
 * Spec: docs/build-spec/05-llm-prompts.md §1, B-4 카피 lock.
 *
 * Q1: 정적 카피만 노출. 클릭은 placeholder (M1.5 에서 코치 패널 호출).
 */

export type ChipKey = "hint" | "definition" | "wrong_reason" | "unfold" | "variant"

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: "hint", label: "첫 한 줄 힌트" },
  { key: "definition", label: "이 용어 정의" },
  { key: "wrong_reason", label: "오답 풀이 근거" },
  { key: "unfold", label: "한 단계 더 펼치기" },
  { key: "variant", label: "같은 유형 다른 문제" },
]

export interface ChipBarProps {
  onChipClick: (key: ChipKey) => void
}

export function ChipBar({ onChipClick }: ChipBarProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="toolbar"
      aria-label="AI 코치 추천 질문"
      data-testid="chip-bar"
    >
      {CHIPS.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => onChipClick(chip.key)}
          data-testid={`chip-${chip.key}`}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-xs text-black/70 hover:border-black/25 hover:text-black transition"
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
