"use client"

/**
 * 리캡 오버레이 — Q2 시퀀스 ≤ 3장 navigation.
 * Spec: docs/build-spec/07-q1-build.md M1.4 + 08-q2-build.md M2.3.
 *
 * 흐름:
 *   1) candidates 배열 받아 첫 카드 build-card 호출 (지연 prefetch — Q2)
 *   2) 카드 N장 navigation. 각 카드 퀴즈 통과 → 다음 카드 또는 모두 통과
 *   3) 모두 통과 → onAllPassed() (부모가 재도전 흐름)
 *   4) 단일 카드는 기존 동작 그대로 (Q1 호환)
 */

import { useCallback, useEffect, useState } from "react"
import type {
  RecapBuildCardResponse,
  RecapCardPayload,
  RecapDiagnoseCandidate,
} from "@/lib/api/schemas/recap"
import { RecapCard } from "./RecapCard"

export interface RecapOverlayProps {
  /** Q1 호환: candidate 단일. 신규: candidates 배열. */
  candidate?: RecapDiagnoseCandidate
  candidates?: RecapDiagnoseCandidate[]
  triggerItemId: string
  /** 마지막 카드 통과 시 호출. */
  onAllPassed?: () => void
  /** Q1 호환: 단일 카드 통과 콜백. */
  onPassed?: () => void
  onClose: () => void
  /** 워크스페이스 hero 인라인 (lock 5: 결과 아래 시퀀스). default false (모달). */
  inline?: boolean
}

export function RecapOverlay({
  candidate,
  candidates,
  triggerItemId,
  onAllPassed,
  onPassed,
  onClose,
  inline = false,
}: RecapOverlayProps) {
  // Q1 호환 — candidate 단일 입력을 candidates 배열로 정규화
  const queue: RecapDiagnoseCandidate[] =
    candidates && candidates.length > 0
      ? candidates
      : candidate
        ? [candidate]
        : []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [cards, setCards] = useState<Record<number, RecapCardPayload>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [passedSet, setPassedSet] = useState<Set<number>>(new Set())

  const fetchCard = useCallback(
    async (idx: number) => {
      const cand = queue[idx]
      if (!cand) return
      try {
        const res = await fetch("/api/recap/build-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patternId: cand.patternId,
            currentItemId: triggerItemId,
          }),
        })
        if (!res.ok) throw new Error(String(res.status))
        const data = (await res.json()) as RecapBuildCardResponse
        setCards((m) => ({ ...m, [idx]: data.card }))
      } catch {
        setErrors((m) => ({ ...m, [idx]: "카드를 불러오지 못했어요." }))
      }
    },
    [queue, triggerItemId],
  )

  // 첫 카드 즉시 fetch + 다음 카드 prefetch (학생 첫 카드 통과 못 하면 비용 절감)
  useEffect(() => {
    if (queue.length === 0) return
    if (!cards[currentIndex] && !errors[currentIndex]) {
      void fetchCard(currentIndex)
    }
    // 다음 카드 prefetch (현재 카드 통과 후 빠른 진입)
    const next = currentIndex + 1
    if (passedSet.has(currentIndex) && next < queue.length && !cards[next] && !errors[next]) {
      void fetchCard(next)
    }
  }, [queue, cards, errors, currentIndex, passedSet, fetchCard])

  if (queue.length === 0) return null

  const cand = queue[currentIndex]
  const card = cards[currentIndex]
  const error = errors[currentIndex]
  const passed = passedSet.has(currentIndex)
  const isLast = currentIndex === queue.length - 1

  const handleCardPassed = () => {
    setPassedSet((s) => new Set(s).add(currentIndex))
    onPassed?.()
  }

  const handleNext = () => {
    if (isLast) {
      onAllPassed?.()
      onClose()
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  return (
    <div
      className={
        inline
          ? "flex w-full"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      }
      role={inline ? "region" : "dialog"}
      aria-modal={inline ? undefined : "true"}
      aria-label="리캡카드"
      data-testid="recap-overlay"
    >
      <div className={inline ? "relative w-full" : "relative w-full max-w-xl"}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-2.5 py-1 text-xs text-black/55 hover:text-black/90"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* progress dots — 시퀀스 ≥2 일 때만 표시 */}
        {queue.length > 1 && (
          <div
            className="mb-2 flex items-center justify-center gap-1.5"
            data-testid="recap-progress"
          >
            {queue.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition ${
                  i === currentIndex
                    ? "w-6 bg-amber-500"
                    : passedSet.has(i)
                      ? "w-3 bg-emerald-500"
                      : "w-3 bg-amber-200"
                }`}
                aria-label={`카드 ${i + 1}${passedSet.has(i) ? " 통과" : ""}`}
              />
            ))}
          </div>
        )}

        {error && (
          <div
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800"
            role="alert"
            data-testid="recap-error"
          >
            {error}
          </div>
        )}

        {!error && !card && (
          <div
            className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900"
            data-testid="recap-loading"
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-300 border-t-amber-700" />
            <p className="text-sm">결손 후보 카드 만드는 중…</p>
            <p className="text-xs text-amber-700/80">
              {cand.grade ? `${cand.grade} · ` : ""}
              {cand.patternLabel}
            </p>
          </div>
        )}

        {card && (
          <RecapCard
            card={card}
            passed={passed}
            onPassed={handleCardPassed}
            onReturn={handleNext}
          />
        )}
      </div>
    </div>
  )
}
