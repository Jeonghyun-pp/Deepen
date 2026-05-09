"use client"

/**
 * 문제 본문 + 5지선다 보기.
 * Spec: docs/build-spec/07-q1-build.md M1.3.
 *
 * Q1 단순화:
 *   - LaTeX/수식 렌더는 raw 텍스트로 (KaTeX 도입은 M1.4 에 미룸 — 콘텐츠 시드 형식 확정 후).
 *   - itemChoices 없으면 fallback: 주관식 textarea (Q1 데모는 객관식 위주).
 *   - 보기 클릭 → solve-store.setSelectedAnswer(보기 텍스트).
 */

import { useSolveStore } from "@/app/v2/_components/store/solve-store"
import type { ItemResponse } from "@/lib/api/schemas/items"

export interface ItemBodyProps {
  item: ItemResponse
}

export function ItemBody({ item }: ItemBodyProps) {
  const selectedAnswer = useSolveStore((s) => s.selectedAnswer)
  const setSelectedAnswer = useSolveStore((s) => s.setSelectedAnswer)

  const choices = item.itemChoices ?? []
  const hasChoices = choices.length > 0

  return (
    <div className="flex flex-col gap-6" data-testid="item-body">
      <header className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-black/45">
        {item.itemSource && <span>{item.itemSource}</span>}
        {item.itemNumber !== null && (
          <span className="rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px]">
            {item.itemNumber}번
          </span>
        )}
      </header>

      <article
        className="prose prose-sm max-w-none whitespace-pre-wrap text-[15px] leading-7 text-black/85"
        data-testid="item-text"
      >
        {item.label}
      </article>

      {hasChoices ? (
        <ol className="flex flex-col gap-2" data-testid="choice-list">
          {choices.map((choice, idx) => {
            const choiceKey = String(idx + 1)
            const value = choice.trim()
            const isSelected = selectedAnswer === value
            return (
              <li key={`${choiceKey}-${value.slice(0, 24)}`}>
                <button
                  type="button"
                  onClick={() => setSelectedAnswer(value)}
                  data-testid={`choice-${choiceKey}`}
                  aria-pressed={isSelected}
                  className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-black bg-black/[0.03]"
                      : "border-black/10 bg-white hover:border-black/25"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      isSelected
                        ? "bg-black text-white"
                        : "bg-black/[0.05] text-black/60"
                    }`}
                  >
                    {choiceKey}
                  </span>
                  <span className="text-sm leading-6 text-black/85">{value}</span>
                </button>
              </li>
            )
          })}
        </ol>
      ) : (
        <textarea
          value={selectedAnswer ?? ""}
          onChange={(e) => setSelectedAnswer(e.target.value)}
          placeholder="답을 입력하세요"
          data-testid="subjective-input"
          className="min-h-[120px] w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-black/40"
        />
      )}
    </div>
  )
}
