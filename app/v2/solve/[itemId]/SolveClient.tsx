"use client"

/**
 * 풀이 화면 클라 컴포넌트 — 상태·제출·결과 흐름.
 * Spec: docs/build-spec/07-q1-build.md M1.3 SolveClient.
 *
 * 흐름:
 *   begin(itemId) → 보기 선택 → 자신감 → 제출
 *   → /api/attempts → ResultPanel 오버레이
 *   → "다음 문제" 클릭 → 단순 history.back() (M1.6 추천 정책 도입 전)
 *
 * 5칩 클릭은 placeholder modal — 실 호출은 M1.5.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { ItemResponse } from "@/lib/api/schemas/items"
import type { SubmitAttemptResponse } from "@/lib/api/schemas/attempts"
import { submitAttempt, ApiError } from "@/lib/clients/api"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"
import { ItemBody } from "../_components/ItemBody"
import { ConfidenceSlider } from "../_components/ConfidenceSlider"
import { Timer } from "../_components/Timer"
import { HintButton } from "../_components/HintButton"
import { ChipBar, type ChipKey } from "../_components/ChipBar"
import { ResultPanel } from "../_components/ResultPanel"

interface Props {
  item: ItemResponse
}

export function SolveClient({ item }: Props) {
  const router = useRouter()

  const begin = useSolveStore((s) => s.begin)
  const elapsedMs = useSolveStore((s) => s.elapsedMs)
  const selectedAnswer = useSolveStore((s) => s.selectedAnswer)
  const hintsUsed = useSolveStore((s) => s.hintsUsed)
  const aiQuestions = useSolveStore((s) => s.aiQuestions)
  const selfConfidence = useSolveStore((s) => s.selfConfidence)
  const reset = useSolveStore((s) => s.reset)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitAttemptResponse | null>(null)
  const [chipNotice, setChipNotice] = useState<ChipKey | null>(null)

  useEffect(() => {
    begin(item.id)
    return () => reset()
  }, [item.id, begin, reset])

  const handleSubmit = async () => {
    if (!selectedAnswer || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        itemId: item.id,
        selectedAnswer,
        timeMs: elapsedMs(),
        hintsUsed,
        aiQuestions,
        selfConfidence,
        mode: "practice" as const,
      }
      const response = await submitAttempt(payload)
      setResult(response)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.code)
      } else {
        setError("internal_error")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleChip = (key: ChipKey) => {
    setChipNotice(key)
  }

  const handleNextItem = () => {
    setResult(null)
    // M1.6 추천 정책 도입 전: 단순히 뒤로 (보통 그래프 화면)
    router.back()
  }

  const canSubmit = !!selectedAnswer && !submitting

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex items-center justify-between border-b border-black/5 pb-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-black/55">
          <span>풀이</span>
          <span className="text-black/30">·</span>
          <span>연습 모드</span>
        </div>
        <div className="flex items-center gap-3">
          <HintButton />
          <Timer />
        </div>
      </header>

      <ItemBody item={item} />

      <section className="flex flex-col gap-4 rounded-lg border border-black/5 bg-white/60 p-4">
        <ConfidenceSlider />
        <ChipBar onChipClick={handleChip} />
      </section>

      {error && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
          role="alert"
          data-testid="submit-error"
        >
          제출 실패 ({error}). 잠시 후 다시 시도해주세요.
        </div>
      )}

      <footer className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="submit-attempt"
          className="rounded-md bg-black px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "채점 중…" : "제출"}
        </button>
      </footer>

      {result && (
        <ResultPanel
          result={result}
          onNextItem={handleNextItem}
          onClose={() => setResult(null)}
          // onOpenRecap 은 M1.4 부터 활성. Q1 엔 disabled.
        />
      )}

      {chipNotice && (
        <div
          className="fixed inset-x-0 bottom-20 mx-auto w-fit rounded-full border border-black/10 bg-black px-4 py-2 text-xs text-white shadow-lg"
          role="status"
          data-testid="chip-notice"
        >
          코치 패널은 곧 열립니다 (M1.5).
          <button
            type="button"
            onClick={() => setChipNotice(null)}
            className="ml-3 text-white/60 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
    </main>
  )
}
