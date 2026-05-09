"use client"

/**
 * 리캡 오버레이 — diagnose → build-card → 카드 표시 → 퀴즈 통과 → 복귀.
 * Spec: docs/build-spec/07-q1-build.md M1.4.
 *
 * 흐름:
 *   1) 마운트 시 candidate 받아 build-card 호출 (단일 카드).
 *   2) 카드 표시 + 퀴즈 입력.
 *   3) 통과 시 onPassed() — 부모(SolveClient)가 storedRetryItemId 로 재도전 흐름.
 */

import { useEffect, useState } from "react"
import type {
  RecapBuildCardResponse,
  RecapCardPayload,
  RecapDiagnoseCandidate,
} from "@/lib/api/schemas/recap"
import { RecapCard } from "./RecapCard"

export interface RecapOverlayProps {
  candidate: RecapDiagnoseCandidate
  triggerItemId: string
  onPassed: () => void
  onClose: () => void
}

export function RecapOverlay({
  candidate,
  triggerItemId,
  onPassed,
  onClose,
}: RecapOverlayProps) {
  const [card, setCard] = useState<RecapCardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/recap/build-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            patternId: candidate.patternId,
            currentItemId: triggerItemId,
          }),
        })
        if (!res.ok) {
          throw new Error(String(res.status))
        }
        const data = (await res.json()) as RecapBuildCardResponse
        if (!cancelled) setCard(data.card)
      } catch (e) {
        if (!cancelled) setError("카드를 불러오지 못했어요.")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [candidate.patternId, triggerItemId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="리캡카드"
      data-testid="recap-overlay"
    >
      <div className="relative w-full max-w-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 px-2.5 py-1 text-xs text-black/55 hover:text-black/90"
          aria-label="닫기"
        >
          ✕
        </button>

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
              {candidate.grade ? `${candidate.grade} · ` : ""}
              {candidate.patternLabel}
            </p>
          </div>
        )}

        {card && (
          <RecapCard
            card={card}
            passed={passed}
            onPassed={() => {
              setPassed(true)
              onPassed()
            }}
            onReturn={onClose}
          />
        )}
      </div>
    </div>
  )
}
