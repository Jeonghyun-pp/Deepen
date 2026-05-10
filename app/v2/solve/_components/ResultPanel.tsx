"use client"

/**
 * 채점 결과 오버레이 — 3분기 (정답/헷갈림/오답).
 * Spec: docs/build-spec/07-q1-build.md M1.3 ResultPanel,
 *       docs/decks/d2sf-deepen-pitch-v2 Slide 10 (3분기 채점).
 *
 * 톤 매칭:
 *   correct → 초록
 *   unsure  → 주황 (deck 의 ★ 핵심 차별)
 *   wrong   → 적색
 *
 * reasonTags 는 한국어 라벨로 매핑 (raw enum 노출 금지 — 메모리 feedback).
 * "리캡 보기" 는 M1.4 까지 disabled.
 */

import type { SubmitAttemptResponse } from "@/lib/api/schemas/attempts"
import {
  REASON_TAG_LABEL,
  REASON_TAG_TONE,
} from "./reason-tag-labels"

type Tone = "correct" | "unsure" | "wrong"

const TONE_STYLES: Record<Tone, { card: string; chip: string; cta: string; title: string }> = {
  correct: {
    card: "border-emerald-300 bg-emerald-50",
    chip: "bg-emerald-100 text-emerald-800",
    cta: "bg-emerald-600 hover:bg-emerald-700",
    title: "정답입니다",
  },
  unsure: {
    card: "border-amber-300 bg-amber-50",
    chip: "bg-amber-100 text-amber-800",
    cta: "bg-amber-600 hover:bg-amber-700",
    title: "맞췄지만 헷갈렸어요",
  },
  wrong: {
    card: "border-rose-300 bg-rose-50",
    chip: "bg-rose-100 text-rose-800",
    cta: "bg-rose-600 hover:bg-rose-700",
    title: "오답이에요",
  },
}

const REASON_TONE_STYLE: Record<"warning" | "alert" | "info", string> = {
  warning: "bg-amber-100 text-amber-800",
  alert: "bg-rose-100 text-rose-800",
  info: "bg-black/[0.05] text-black/70",
}

export interface ResultPanelProps {
  result: SubmitAttemptResponse
  onNextItem: () => void
  onOpenRecap?: () => void // M1.4 부터 활성
  onClose: () => void
  /** exam batch 컨텍스트 — 진행 인디케이터·CTA 라벨 변경. */
  batchProgress?: { idx: number; total: number; isLast: boolean } | null
  /** 워크스페이스 hero 영역 인라인 (lock 4: 모달 X). default false (모달). */
  inline?: boolean
}

export function ResultPanel({
  result,
  onNextItem,
  onOpenRecap,
  onClose,
  batchProgress = null,
  inline = false,
}: ResultPanelProps) {
  const tone: Tone = result.attemptResult.label
  const styles = TONE_STYLES[tone]
  const reasonTags = result.attemptResult.reasonTags
  const explanation = result.attemptResult.explanation

  return (
    <div
      className={
        inline
          ? "flex w-full"
          : "fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
      }
      role={inline ? "region" : "dialog"}
      aria-modal={inline ? undefined : "true"}
      aria-label="채점 결과"
      data-testid="result-panel"
    >
      <div
        className={
          inline
            ? `relative w-full rounded-xl border ${styles.card} p-5`
            : `relative w-full max-w-2xl rounded-t-2xl border-t-4 sm:rounded-2xl ${styles.card} p-6 shadow-2xl`
        }
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 text-black/45 hover:text-black/80"
          aria-label="닫기"
        >
          ✕
        </button>

        <header className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-widest text-black/55">
            채점 결과
          </span>
          <h2 className="text-2xl font-semibold text-black/90" data-testid="result-title">
            {styles.title}
          </h2>
        </header>

        {tone === "unsure" && (
          <p className="mt-3 text-sm text-amber-900/80" data-testid="unsure-note">
            정답을 맞췄지만 시간·힌트·자신감 신호가 약점 후보로 잡혔어요.
            <br />
            반복 학습 풀에 자동으로 들어갑니다.
          </p>
        )}

        {tone === "wrong" && (reasonTags.length > 0 || result.attemptResult.reasonTagsPending) && (
          <div className="mt-4" data-testid="reason-tags">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-black/45">
                짚어 본 원인
              </span>
              {result.attemptResult.reasonTagsPending && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-black/45"
                  data-testid="reason-tags-pending"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  AI 분석 중…
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reasonTags.map((tag) => {
                const tone = REASON_TAG_TONE[tag] ?? "info"
                return (
                  <span
                    key={tag}
                    data-testid={`reason-${tag}`}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${REASON_TONE_STYLE[tone]}`}
                  >
                    {REASON_TAG_LABEL[tag]}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {explanation && (
          <details
            className="mt-5 rounded-lg border border-black/10 bg-white p-3 text-sm text-black/80"
            data-testid="explanation"
          >
            <summary className="cursor-pointer text-black/65">풀이 보기</summary>
            <p className="mt-2 whitespace-pre-wrap leading-7">{explanation}</p>
          </details>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-2">
          {(tone === "wrong" || tone === "unsure") && onOpenRecap && (
            <button
              type="button"
              onClick={onOpenRecap}
              data-testid="open-recap"
              className="rounded-md border border-amber-300 bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-200"
              aria-label="리캡 보기"
            >
              리캡 보기
            </button>
          )}
          <button
            type="button"
            onClick={onNextItem}
            data-testid="next-item"
            className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition ${styles.cta}`}
          >
            {batchProgress
              ? batchProgress.isLast
                ? "결과 보기 →"
                : `다음 ${batchProgress.idx + 2}/${batchProgress.total}`
              : "다음 문제"}
          </button>
        </footer>
      </div>
    </div>
  )
}
