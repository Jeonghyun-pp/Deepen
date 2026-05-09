"use client"

/**
 * 풀이 화면 클라 컴포넌트 — 상태·제출·결과·리캡 흐름.
 * Spec: docs/build-spec/07-q1-build.md M1.3·M1.4.
 *
 * 흐름:
 *   begin(itemId) → 보기 선택 → 자신감 → 제출
 *   → /api/attempts → ResultPanel 오버레이
 *   → "리캡 보기" (recapNeeded 시) → RecapOverlay → 퀴즈 통과 → 같은 itemId 재도전
 *   → 또는 "다음 문제" → router.back()
 *
 * 5칩 클릭은 placeholder modal — 실 호출은 M1.5.
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { ItemResponse } from "@/lib/api/schemas/items"
import type { SubmitAttemptResponse } from "@/lib/api/schemas/attempts"
import type { RecapDiagnoseCandidate } from "@/lib/api/schemas/recap"
import { submitAttempt, ApiError } from "@/lib/clients/api"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"
import { ItemBody } from "../_components/ItemBody"
import { ConfidenceSlider } from "../_components/ConfidenceSlider"
import { Timer } from "../_components/Timer"
import { HintButton } from "../_components/HintButton"
import { ChipBar, type ChipKey } from "../_components/ChipBar"
import { ResultPanel } from "../_components/ResultPanel"
import { RecapOverlay } from "../_components/RecapOverlay"
import { CoachPanel } from "../_components/CoachPanel"
import { GraphPanel } from "../_components/GraphPanel"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"

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

  const setCoachOpen = useCoachStore((s) => s.setOpen)
  const resetCoach = useCoachStore((s) => s.reset)
  const highlightNodeIds = useCoachStore((s) => s.highlightNodeIds)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitAttemptResponse | null>(null)
  const [recapCandidate, setRecapCandidate] =
    useState<RecapDiagnoseCandidate | null>(null)

  useEffect(() => {
    begin(item.id)
    return () => {
      reset()
      resetCoach()
    }
  }, [item.id, begin, reset, resetCoach])

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

  const handleChip = (_key: ChipKey) => {
    // 풀이 화면 본문에서 칩을 클릭하면 코치 패널을 연다.
    // 실제 칩 호출은 CoachPanel 안 ChipBar 가 직접 /api/ai-coach/chat 호출.
    setCoachOpen(true)
  }

  const handleNextItem = () => {
    setResult(null)
    // M1.6 추천 정책 도입 전: 단순히 뒤로 (보통 그래프 화면)
    router.back()
  }

  const handleOpenRecap = () => {
    const cand = result?.diagnosis.candidatePrereq?.[0]
    if (!cand) return
    // RecapDiagnoseCandidate shape (signature 없음) — overlay 가 BuildCard 호출 시 patternId 만 필요.
    setRecapCandidate({
      patternId: cand.patternId,
      patternLabel: cand.patternLabel,
      grade: cand.grade,
      deficitProb: cand.deficitProb,
    })
  }

  const handleRecapPassed = () => {
    // 통과 후 카드 onReturn 클릭 시 onClose → 같은 itemId 재도전 (begin 다시).
    // 통과 즉시 재도전을 강제하지 않고 학생이 "원래 문제로 돌아가기" 누를 때 reset.
  }

  const handleRecapClose = () => {
    setRecapCandidate(null)
    setResult(null)
    // 같은 itemId 로 재도전 — 카운터·타이머 reset.
    begin(item.id)
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

      <div className="grid gap-6 sm:grid-cols-[1fr_220px]">
        <ItemBody item={item} />
        <div className="hidden sm:block">
          <GraphPanel itemId={item.id} highlightNodeIds={highlightNodeIds} />
        </div>
      </div>

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

      {result && !recapCandidate && (
        <ResultPanel
          result={result}
          onNextItem={handleNextItem}
          onClose={() => setResult(null)}
          onOpenRecap={
            result.diagnosis.recapNeeded &&
            result.diagnosis.candidatePrereq?.[0]
              ? handleOpenRecap
              : undefined
          }
        />
      )}

      {recapCandidate && (
        <RecapOverlay
          candidate={recapCandidate}
          triggerItemId={item.id}
          onPassed={handleRecapPassed}
          onClose={handleRecapClose}
        />
      )}

      <CoachPanel itemId={item.id} />
    </main>
  )
}
