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
import { submitAttempt, classifyReasonsFollowup, ApiError } from "@/lib/clients/api"
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
import { PencilPanel } from "./_components/PencilPanel"
import { OcrResultPanel } from "./_components/OcrResultPanel"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { errorCopyForCode } from "@/lib/ui/copy"
import type { OcrResponse } from "@/lib/api/schemas/ocr"

interface Props {
  item: ItemResponse
  userId: string
  /** 'practice' | 'exam' | 'recovery' (M2.5). default 'practice'. */
  mode?: "practice" | "exam" | "recovery"
  /** exam 모드 — 자동 SUBMIT 시간 ms. 없으면 difficulty 기반 fallback. */
  examTimeMs?: number
  /** exam batch — itemId 배열. null 이면 단일 attempt. */
  batch?: string[] | null
  /** 현재 batch 인덱스 (0-base). */
  batchIdx?: number
}

export function SolveClient({
  item,
  userId,
  mode = "practice",
  examTimeMs,
  batch = null,
  batchIdx = 0,
}: Props) {
  const router = useRouter()
  const isExam = mode === "exam"
  const isBatch = isExam && batch !== null && batch.length > 1
  const isLastInBatch = isBatch && batchIdx >= (batch?.length ?? 0) - 1

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
  const [recapCandidates, setRecapCandidates] =
    useState<RecapDiagnoseCandidate[] | null>(null)
  const [pencilPng, setPencilPng] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null)
  const [ocrPending, setOcrPending] = useState(false)
  const [ocrError, setOcrError] = useState<string | null>(null)

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
        // exam 시 hints/ai 강제 0 (서버도 거절하지만 클라 측에서도 lock)
        hintsUsed: isExam ? 0 : hintsUsed,
        aiQuestions: isExam ? 0 : aiQuestions,
        selfConfidence,
        mode,
        ...(pencilPng ? { ocrImageBase64: pencilPng } : {}),
      }
      const response = await submitAttempt(payload)
      setResult(response)

      // M2.4: 오답 + AI 가용 시 follow-up classify-reasons (비동기, 응답 갱신)
      if (response.attemptResult.reasonTagsPending) {
        void classifyReasonsFollowup({
          itemId: item.id,
          attemptTimestamp: response.attemptResult.attemptTimestamp,
          ocrSteps: ocrResult?.steps,
        }).then((mergedTags) => {
          if (!mergedTags) return
          setResult((prev) =>
            prev
              ? {
                  ...prev,
                  attemptResult: {
                    ...prev.attemptResult,
                    reasonTags: mergedTags,
                    reasonTagsPending: false,
                  },
                }
              : prev,
          )
        })
      }
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

  const handleNextItem = async () => {
    setResult(null)

    // exam batch — 다음 idx 또는 마지막이면 result 페이지로
    if (isBatch && batch) {
      if (isLastInBatch) {
        router.push(
          `/v2/exam/default/result?items=${encodeURIComponent(batch.join(","))}`,
        )
        return
      }
      const nextId = batch[batchIdx + 1]
      const csv = encodeURIComponent(batch.join(","))
      router.push(`/v2/solve/${nextId}?mode=exam&batch=${csv}&idx=${batchIdx + 1}`)
      return
    }

    // 일반: 다음 published Item 요청. 마지막이면 home 으로.
    try {
      const params = new URLSearchParams({ excludeItemId: item.id })
      const res = await fetch(`/api/units/next-item?${params}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = (await res.json()) as { itemId: string | null }
        if (data.itemId && data.itemId !== item.id) {
          router.push(`/v2/solve/${data.itemId}`)
          return
        }
      }
    } catch {
      /* fall through */
    }
    router.push("/v2/home")
  }

  const handleOpenRecap = () => {
    const cands = result?.diagnosis.candidatePrereq ?? []
    if (cands.length === 0) return
    setRecapCandidates(
      cands.map((c) => ({
        patternId: c.patternId,
        patternLabel: c.patternLabel,
        grade: c.grade,
        deficitProb: c.deficitProb,
      })),
    )
  }

  const handleRecapClose = () => {
    setRecapCandidates(null)
    setResult(null)
    // 같은 itemId 로 재도전 — 카운터·타이머 reset.
    begin(item.id)
  }

  const canSubmit = !!selectedAnswer && !submitting

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-4">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-black/55">
          <span>풀이</span>
          <span className="text-black/30">·</span>
          <span>
            {mode === "exam"
              ? "실전 모드"
              : mode === "recovery"
                ? "오답복구"
                : "연습 모드"}
          </span>
          {isBatch && batch && (
            <>
              <span className="text-black/30">·</span>
              <span data-testid="batch-progress">
                {batchIdx + 1}/{batch.length}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isExam && <HintButton />}
          {isExam ? (
            <ExamTimerInline
              startedAt={Date.now()}
              examTimeMs={
                examTimeMs ?? 60_000 + (item.itemDifficulty ?? 0.5) * 120_000
              }
              onTimeUp={() => {
                if (!submitting && selectedAnswer) {
                  void handleSubmit()
                }
              }}
            />
          ) : (
            <Timer />
          )}
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-[1fr_220px]">
        <div className="flex flex-col gap-6">
          <ItemBody item={item} />
          <PencilPanel
            itemId={item.id}
            userId={userId}
            onExport={async (png) => {
              setPencilPng(png)
              setOcrError(null)
              if (!png) {
                setOcrResult(null)
                return
              }
              setOcrPending(true)
              try {
                const res = await fetch("/api/ocr", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    itemId: item.id,
                    imageBase64: png,
                  }),
                })
                if (!res.ok) {
                  const err = (await res.json().catch(() => ({}))) as {
                    error?: string
                  }
                  setOcrError(err.error ?? `http_${res.status}`)
                  return
                }
                const data = (await res.json()) as OcrResponse
                setOcrResult(data)
              } catch (e) {
                setOcrError((e as Error).message ?? "network_error")
              } finally {
                setOcrPending(false)
              }
            }}
            onClearAttachment={() => {
              setPencilPng(null)
              setOcrResult(null)
              setOcrError(null)
            }}
          />
          {ocrPending && (
            <p className="text-xs text-black/55" data-testid="ocr-pending">
              풀이 분석 중…
            </p>
          )}
          {ocrError && (
            <div
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
              data-testid="ocr-error"
            >
              {errorCopyForCode(ocrError)}
            </div>
          )}
          {ocrResult && !ocrPending && (
            <OcrResultPanel
              ocr={ocrResult}
              onAcceptAndGrade={() => handleSubmit()}
              onRedraw={() => {
                setOcrResult(null)
                setPencilPng(null)
              }}
              onDismiss={() => setOcrResult(null)}
            />
          )}
        </div>
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
          {errorCopyForCode(error)}
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

      {result && !recapCandidates && (
        <ResultPanel
          result={result}
          onNextItem={handleNextItem}
          onClose={() => setResult(null)}
          onOpenRecap={
            result.diagnosis.recapNeeded &&
            (result.diagnosis.candidatePrereq?.length ?? 0) > 0
              ? handleOpenRecap
              : undefined
          }
          batchProgress={
            isBatch && batch
              ? { idx: batchIdx, total: batch.length, isLast: isLastInBatch }
              : null
          }
        />
      )}

      {recapCandidates && (
        <RecapOverlay
          candidates={recapCandidates}
          triggerItemId={item.id}
          onAllPassed={() => {
            /* 모두 통과 → onClose 가 자동 호출되며 재도전 흐름 진입 */
          }}
          onClose={handleRecapClose}
        />
      )}

      {!isExam && <CoachPanel itemId={item.id} />}
    </main>
  )
}

/** exam 모드 카운트다운 — 0 도달 시 자동 SUBMIT 트리거. */
function ExamTimerInline({
  startedAt,
  examTimeMs,
  onTimeUp,
}: {
  startedAt: number
  examTimeMs: number
  onTimeUp: () => void
}) {
  const [remaining, setRemaining] = useState(examTimeMs)
  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, examTimeMs - (Date.now() - startedAt))
      setRemaining(left)
      if (left === 0) onTimeUp()
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [startedAt, examTimeMs, onTimeUp])

  const sec = Math.floor(remaining / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  const danger = remaining < 10_000
  return (
    <div
      className={`font-mono text-sm tabular-nums ${danger ? "text-rose-700 animate-pulse" : "text-black/70"}`}
      data-testid="exam-timer"
      aria-label="실전 모드 잔여 시간"
    >
      {m}:{String(s).padStart(2, "0")}
    </div>
  )
}
