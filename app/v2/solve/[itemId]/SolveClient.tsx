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
import { ChallengeProgress } from "./_components/ChallengeProgress"
import { RetryPrompt } from "./_components/RetryPrompt"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { errorCopyForCode } from "@/lib/ui/copy"
import type { OcrResponse } from "@/lib/api/schemas/ocr"
import type { NextRecommendResponse } from "@/lib/api/schemas/recommend"
import {
  challengeReducer,
  initialChallengeState,
  type ChallengeState,
} from "@/lib/session/challenge-machine"

interface ChallengeCtx {
  targetPatternId: string
  patternLabel: string
  startingDifficulty: number
  consecutiveCorrect: number
  consecutiveWrong: number
  levelsCleared: number
}

interface RetryCtx {
  storedItemId: string
  recapPatternIds: string[]
  storedItemLabel: string
}

interface Props {
  item: ItemResponse
  userId: string
  /** 'practice' | 'exam' | 'recovery' | 'challenge' | 'retry' (M2.5/M3.2). default 'practice'. */
  mode?: "practice" | "exam" | "recovery" | "challenge" | "retry"
  /** exam 모드 — 자동 SUBMIT 시간 ms. 없으면 difficulty 기반 fallback. */
  examTimeMs?: number
  /** batch — itemId 배열. exam 또는 daily(끊김2) chaining. null 이면 단일 attempt. */
  batch?: string[] | null
  /** 현재 batch 인덱스 (0-base). */
  batchIdx?: number
  /** M3.2 challenge ctx (URL 직렬화). */
  challengeCtx?: ChallengeCtx | null
  /** M3.2 retry ctx (URL 직렬화). */
  retryCtx?: RetryCtx | null
  /** 진입 출처. 'daily' 면 batch 종료 시 home?dailyDone=1 로 이동. */
  from?: "daily" | null
  /**
   * 워크스페이스(/v2/workspace) 안에서 호스팅될 때 true.
   * 자체 헤더·sticky footer·aside GraphPanel·floating CoachPanel 을 숨겨
   * 워크스페이스 외곽(헤더+우 패널)과 중복을 제거한다.
   * 결과/리캡/재도전 오버레이는 inline (fixed→relative) 로 hero 영역에 펼쳐진다 (lock 4·5).
   */
  embedded?: boolean
  /**
   * Phase 4 Path A — 워크스페이스가 PencilPanel 을 PDF 위 overlay 로 렌더할 때,
   * pencil PNG + OCR 결과를 본 컴포넌트에 inject. SolveClient 는 자체 PencilPanel 렌더를 스킵하고
   * 제출 시 injectedPencilPng + injectedOcrResult 를 쓴다.
   *
   * 값이 모두 undefined 면 standalone 모드 (자체 PencilPanel + 자체 OCR fetch) 유지.
   */
  injectedPencilPng?: string | null
  injectedOcrResult?: OcrResponse | null
  injectedOcrPending?: boolean
  injectedOcrError?: string | null
  onOcrDismiss?: () => void
  onPencilClearFromResult?: () => void
}

export function SolveClient({
  item,
  userId,
  mode = "practice",
  examTimeMs,
  batch = null,
  batchIdx = 0,
  challengeCtx = null,
  retryCtx = null,
  from = null,
  embedded = false,
  injectedPencilPng,
  injectedOcrResult,
  injectedOcrPending,
  injectedOcrError,
  onOcrDismiss,
  onPencilClearFromResult,
}: Props) {
  // 워크스페이스가 PencilPanel 을 PDF overlay 로 호스팅하는 경우 (lock #7, Phase 4 Path A).
  // 자체 PencilPanel 블록을 스킵하고 inject 된 png/ocr 값을 쓴다.
  const overlayPencilHosted =
    embedded &&
    (injectedPencilPng !== undefined ||
      injectedOcrResult !== undefined ||
      injectedOcrPending !== undefined ||
      injectedOcrError !== undefined)
  const router = useRouter()
  const isExam = mode === "exam"
  const isChallenge = mode === "challenge"
  const isRetry = mode === "retry"
  const isDaily = from === "daily"
  const isBatch = batch !== null && batch.length > 1 && (isExam || isDaily)
  const isLastInBatch = isBatch && batchIdx >= (batch?.length ?? 0) - 1
  const aiHintLocked = isExam || isChallenge

  const [challengeState, setChallengeState] = useState<ChallengeState>(() => {
    if (!isChallenge || !challengeCtx) return initialChallengeState
    return {
      name: "solving",
      ctx: {
        targetPatternId: challengeCtx.targetPatternId,
        patternLabel: challengeCtx.patternLabel,
        currentDifficulty: challengeCtx.startingDifficulty,
        consecutiveCorrect: challengeCtx.consecutiveCorrect,
        consecutiveWrong: challengeCtx.consecutiveWrong,
        levelsCleared: challengeCtx.levelsCleared,
      },
    }
  })

  const begin = useSolveStore((s) => s.begin)
  const elapsedMs = useSolveStore((s) => s.elapsedMs)
  const selectedAnswer = useSolveStore((s) => s.selectedAnswer)
  const hintsUsed = useSolveStore((s) => s.hintsUsed)
  const aiQuestions = useSolveStore((s) => s.aiQuestions)
  const selfConfidence = useSolveStore((s) => s.selfConfidence)
  const reset = useSolveStore((s) => s.reset)

  const setCoachOpen = useCoachStore((s) => s.setOpen)
  const resetCoach = useCoachStore((s) => s.reset)
  const setCoachHighlight = useCoachStore((s) => s.setHighlight)
  const setCoachPrefill = useCoachStore((s) => s.setInputPrefill)
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
  /** P1-5 폴리싱: exam 시간 종료 시 미답이면 안내 배너. */
  const [examExpired, setExamExpired] = useState(false)

  // overlay 호스팅 시 effective 값은 injected 우선
  const effPencilPng = overlayPencilHosted
    ? (injectedPencilPng ?? null)
    : pencilPng
  const effOcrResult = overlayPencilHosted
    ? (injectedOcrResult ?? null)
    : ocrResult
  const effOcrPending = overlayPencilHosted
    ? (injectedOcrPending ?? false)
    : ocrPending
  const effOcrError = overlayPencilHosted
    ? (injectedOcrError ?? null)
    : ocrError

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
        // exam/challenge 시 hints/ai 강제 0 (서버도 거절하지만 클라 측에서도 lock)
        hintsUsed: aiHintLocked ? 0 : hintsUsed,
        aiQuestions: aiHintLocked ? 0 : aiQuestions,
        selfConfidence,
        mode,
        ...(effPencilPng ? { ocrImageBase64: effPencilPng } : {}),
        ...(isChallenge && challengeState.name === "solving"
          ? {
              challenge: {
                targetPatternId: challengeState.ctx.targetPatternId,
                consecutiveCorrect: challengeState.ctx.consecutiveCorrect,
                consecutiveWrong: challengeState.ctx.consecutiveWrong,
                difficulty: challengeState.ctx.currentDifficulty,
              },
            }
          : {}),
        ...(isRetry && retryCtx
          ? {
              retry: {
                source: "recap_retry" as const,
                storedItemId: retryCtx.storedItemId,
                recapPatternIds: retryCtx.recapPatternIds,
              },
            }
          : {}),
      }
      const response = await submitAttempt(payload)
      setResult(response)

      // UX §15 자동 surface — 결손 의심 prereq 패턴 ID 들을 코치 store 에 highlight 로 push.
      // 우 패널 "학습 지도" 탭이 펄스 ring 으로 자동 강조 (GraphPanel.highlightNodeIds 구독).
      // recapNeeded=false 면 highlight clear (이전 attempt 잔상 제거).
      const prereqCands = response.diagnosis.candidatePrereq ?? []
      if (response.diagnosis.recapNeeded && prereqCands.length > 0) {
        setCoachHighlight(prereqCands.map((c) => c.patternId))
      } else {
        setCoachHighlight([])
      }

      // M3.2 challenge: reducer 로 ctx 갱신 → next item 라우팅 시 사용
      if (isChallenge) {
        const correct = response.attemptResult.label === "correct"
        setChallengeState((prev) =>
          challengeReducer(prev, { type: "ATTEMPT", correct }),
        )
      }

      // M2.4: 오답 + AI 가용 시 follow-up classify-reasons (비동기, 응답 갱신)
      if (response.attemptResult.reasonTagsPending) {
        void classifyReasonsFollowup({
          itemId: item.id,
          attemptTimestamp: response.attemptResult.attemptTimestamp,
          ocrSteps: effOcrResult?.steps,
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

    // batch — exam(실전) 또는 daily(오늘의 도전) chaining.
    if (isBatch && batch) {
      if (isLastInBatch) {
        if (isDaily) {
          router.push("/v2/home?dailyDone=1")
        } else {
          router.push(
            `/v2/exam/default/result?items=${encodeURIComponent(batch.join(","))}`,
          )
        }
        return
      }
      const nextId = batch[batchIdx + 1]
      const csv = encodeURIComponent(batch.join(","))
      // Stage 6: exam batch 도 워크스페이스 hero 로 흡수 — modeParser 에 exam 추가됨.
      // hint/AI 잠금은 SolveClient(embedded) 내부 isExam 분기가 자동 처리.
      const params = isDaily
        ? `from=daily&batch=${csv}&idx=${batchIdx + 1}`
        : `mode=exam&batch=${csv}&idx=${batchIdx + 1}`
      router.push(`/v2/workspace/${nextId}?${params}`)
      return
    }

    // M3.2 retry: 단일 attempt → home (Stage 12: study lobby 흡수)
    if (isRetry) {
      router.push("/v2/home")
      return
    }

    // M3.2 challenge: 머신 상태로 다음 단계 결정
    if (isChallenge) {
      if (challengeState.name === "session_end") {
        router.push("/v2/home")
        return
      }
      // level_up 은 ResultPanel 의 별도 CTA 에서 처리하지만, "다음" 클릭이면
      // 동일 흐름. session_end 와 동일하게 home 으로 (Stage 12).
      if (challengeState.name === "level_up") {
        router.push("/v2/home?leveledUp=1")
        return
      }
      // solving — 같은 Pattern, difficulty=ctx.currentDifficulty 로 다음 Item
      try {
        const res = await fetch("/api/recommend/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            mode: "challenge",
            targetPatternId: challengeState.ctx.targetPatternId,
            difficultyAnchor: challengeState.ctx.currentDifficulty,
          }),
        })
        if (res.ok) {
          const data = (await res.json()) as NextRecommendResponse
          if (data.itemId) {
            const params = new URLSearchParams({
              mode: "challenge",
              pattern: challengeState.ctx.targetPatternId,
              label: challengeState.ctx.patternLabel,
              anchor: String(challengeState.ctx.currentDifficulty),
              streak: String(challengeState.ctx.consecutiveCorrect),
              wrong: String(challengeState.ctx.consecutiveWrong),
              cleared: String(challengeState.ctx.levelsCleared),
            })
            // Stage 1: challenge 다음 item 도 워크스페이스 hero 로.
            router.push(`/v2/workspace/${data.itemId}?${params.toString()}`)
            return
          }
        }
      } catch {
        /* fall through */
      }
      router.push("/v2/home")
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
          // Stage 1: 일반 다음 문제도 워크스페이스 hero 로 (hero 누수 해결).
          router.push(`/v2/workspace/${data.itemId}`)
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

  // M3.2 RetryPrompt 표시: recap 모두 통과 + recapPatternIds 있을 때.
  const [recapAllPassed, setRecapAllPassed] = useState(false)
  const showRetryPrompt =
    recapAllPassed &&
    !!recapCandidates &&
    recapCandidates.length > 0

  const enterRetryMode = () => {
    if (!recapCandidates) return
    const pids = recapCandidates.map((c) => c.patternId).join(",")
    const params = new URLSearchParams({
      mode: "retry",
      recap: pids,
      label: item.label,
    })
    setRecapCandidates(null)
    setRecapAllPassed(false)
    // Stage 1: retry mode 진입도 워크스페이스 hero 로.
    router.push(`/v2/workspace/${item.id}?${params.toString()}`)
  }

  const skipRetry = () => {
    setRecapCandidates(null)
    setRecapAllPassed(false)
    setResult(null)
    begin(item.id)
  }

  const canSubmit = !!selectedAnswer && !submitting

  const containerClass = embedded
    ? "flex w-full flex-col gap-6 px-4 py-6"
    : "mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-8"

  return (
    <main className={containerClass}>
      {!embedded && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-black/55">
            <span>풀이</span>
            <span className="text-black/30">·</span>
            <span>
              {isDaily
                ? "오늘의 도전"
                : mode === "exam"
                  ? "실전 모드"
                  : mode === "recovery"
                    ? "오답복구"
                    : mode === "challenge"
                      ? "챌린지"
                      : mode === "retry"
                        ? "재도전"
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
            {!aiHintLocked && <HintButton />}
            {isExam ? (
              <ExamTimerInline
                startedAt={Date.now()}
                examTimeMs={
                  examTimeMs ?? 60_000 + (item.itemDifficulty ?? 0.5) * 120_000
                }
                onTimeUp={() => {
                  if (!submitting && selectedAnswer) {
                    void handleSubmit()
                  } else if (!selectedAnswer) {
                    // P1-5 폴리싱: 미답 상태 시간 종료 → 안내 배너
                    setExamExpired(true)
                  }
                }}
              />
            ) : (
              <Timer />
            )}
          </div>
        </header>
      )}

      {/* embedded 모드 — 워크스페이스 헤더가 chrome 을 대체하지만 타이머는 사라지므로
          상단에 슬림 chip 한 줄로 모드 + 시간만 surface. */}
      {embedded && (
        <div className="flex items-center justify-between text-[11px] text-black/55">
          <span className="uppercase tracking-widest">
            {isDaily
              ? "오늘의 도전"
              : mode === "exam"
                ? "실전"
                : mode === "recovery"
                  ? "오답복구"
                  : mode === "challenge"
                    ? "챌린지"
                    : mode === "retry"
                      ? "재도전"
                      : "연습"}
            {isBatch && batch && (
              <span className="ml-2 text-black/35">
                {batchIdx + 1}/{batch.length}
              </span>
            )}
          </span>
          {isExam ? (
            <ExamTimerInline
              startedAt={Date.now()}
              examTimeMs={
                examTimeMs ?? 60_000 + (item.itemDifficulty ?? 0.5) * 120_000
              }
              onTimeUp={() => {
                if (!submitting && selectedAnswer) {
                  void handleSubmit()
                } else if (!selectedAnswer) {
                  setExamExpired(true)
                }
              }}
            />
          ) : (
            <Timer />
          )}
        </div>
      )}

      {isChallenge && (
        <ChallengeProgress
          streak={challengeState.ctx.consecutiveCorrect}
          patternLabel={challengeState.ctx.patternLabel || "유형 챌린지"}
          consecutiveWrong={challengeState.ctx.consecutiveWrong}
          difficulty={challengeState.ctx.currentDifficulty}
          onAbort={() => router.push("/v2/home")}
        />
      )}

      {/* P1-5 폴리싱: exam 시간 종료 + 미답 → 안내 배너. 사용자가 답 선택 후 자동 dismiss. */}
      {examExpired && !selectedAnswer && (
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-900"
          role="alert"
          data-testid="exam-expired-banner"
        >
          <span>
            <span className="font-semibold">시간 초과</span> · 답을 선택해
            제출하세요.
          </span>
        </div>
      )}

      {isRetry && retryCtx && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          data-testid="retry-banner"
        >
          <span className="font-medium">재도전</span> · 같은 문제로 결손이
          메워졌는지 확인합니다.
          {retryCtx.recapPatternIds.length > 0 && (
            <span className="ml-2 text-[11px] text-amber-800/80">
              리캡 {retryCtx.recapPatternIds.length}장 통과
            </span>
          )}
        </div>
      )}

      <div
        className={
          embedded ? "flex flex-col gap-6" : "grid gap-6 sm:grid-cols-[1fr_220px]"
        }
      >
        <div className="flex flex-col gap-6">
          <ItemBody item={item} />
          {/* overlayPencilHosted: 워크스페이스가 PDF 위에 PencilPanel(variant='overlay')
              + OCR fetch 를 호스팅 → 본 블록 전체 스킵. OcrResultPanel 만 inject 된 값으로 렌더. */}
          {!overlayPencilHosted && (
            <>
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
                    // Phase 4 Path C (lock #8) — standalone 분기에서도 펜→답 자동 채움.
                    // Vision 이 답 표시 감지 + 신뢰도 0.5+ + 현재 미선택 시에만 덮어쓰지 않음.
                    if (
                      data.detectedAnswerChoice &&
                      data.answerConfidence >= 0.5 &&
                      item.itemChoices &&
                      item.itemChoices.length >= data.detectedAnswerChoice
                    ) {
                      const choiceText =
                        item.itemChoices[
                          data.detectedAnswerChoice - 1
                        ]?.trim()
                      if (choiceText) {
                        const current =
                          useSolveStore.getState().selectedAnswer
                        if (!current) {
                          useSolveStore
                            .getState()
                            .setSelectedAnswer(choiceText)
                        }
                      }
                    }
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
            </>
          )}
          {effOcrPending && (
            <p className="text-xs text-black/55" data-testid="ocr-pending">
              풀이 분석 중…
            </p>
          )}
          {effOcrError && (
            <div
              className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
              data-testid="ocr-error"
            >
              <span>{errorCopyForCode(effOcrError)}</span>
              <button
                type="button"
                onClick={() => {
                  // P1-5 폴리싱: 다시 그리기 — 펜+OCR 상태 reset
                  if (overlayPencilHosted) {
                    onPencilClearFromResult?.()
                  } else {
                    setOcrError(null)
                    setOcrResult(null)
                    setPencilPng(null)
                  }
                }}
                data-testid="ocr-retry"
                className="shrink-0 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
              >
                다시 그리기
              </button>
            </div>
          )}
          {effOcrResult && !effOcrPending && (
            <OcrResultPanel
              ocr={effOcrResult}
              onAcceptAndGrade={() => handleSubmit()}
              onRedraw={() => {
                if (overlayPencilHosted) {
                  onPencilClearFromResult?.()
                } else {
                  setOcrResult(null)
                  setPencilPng(null)
                }
              }}
              onDismiss={() => {
                if (overlayPencilHosted) {
                  onOcrDismiss?.()
                } else {
                  setOcrResult(null)
                }
              }}
            />
          )}
        </div>
        {!embedded && (
          <div className="hidden sm:block">
            <GraphPanel itemId={item.id} highlightNodeIds={highlightNodeIds} />
          </div>
        )}
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

      {/* E2E 수정: embedded 도 sticky bottom-0 — 워크스페이스 hero 의 좁은 40% 영역에서
          스크롤 끝에 가야만 보이던 문제 해결. 부모 hero-solve-region (overflow-y-auto)
          가 sticky 컨테이너 역할. */}
      <footer
        className={
          embedded
            ? "sticky bottom-0 -mx-4 z-10 flex items-center justify-end gap-2 border-t border-black/8 bg-white/95 px-4 py-3 backdrop-blur shadow-[0_-4px_8px_rgba(0,0,0,0.04)]"
            : "sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t border-black/5 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8"
        }
      >
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
          onAskCoachAboutPrereq={({ patternLabel }) => {
            // UX §15: 결손 의심 prereq 칩 클릭 → 코치 input prefill.
            // 사용자가 직접 send 결정 (자동 send 는 invasive — 비활성).
            setCoachOpen(true)
            setCoachPrefill(
              `${patternLabel} 개념이 결손인 것 같아요. 이 개념을 짧게 리캡해주세요.`,
            )
          }}
          batchProgress={
            isBatch && batch
              ? { idx: batchIdx, total: batch.length, isLast: isLastInBatch }
              : null
          }
          inline={embedded}
        />
      )}

      {recapCandidates && !showRetryPrompt && (
        <RecapOverlay
          candidates={recapCandidates}
          triggerItemId={item.id}
          onAllPassed={() => setRecapAllPassed(true)}
          onClose={() => {
            // 통과한 상태면 RetryPrompt 가 뜨도록 candidates 유지.
            // 통과 X 면 기존 흐름 (begin reset).
            if (recapAllPassed) return
            handleRecapClose()
          }}
          inline={embedded}
        />
      )}

      {showRetryPrompt && recapCandidates && (
        <RetryPrompt
          storedItemLabel={item.label}
          recapCardsPassed={recapCandidates.length}
          onRetry={enterRetryMode}
          onSkip={skipRetry}
        />
      )}

      {/* 워크스페이스 우 패널이 자체 CoachPanel 호스팅 — 임베드 시 floating 패널 숨김 */}
      {!embedded && !aiHintLocked && <CoachPanel itemId={item.id} />}
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
