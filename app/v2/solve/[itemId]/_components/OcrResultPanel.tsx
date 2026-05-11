"use client"

/**
 * OCR 결과 — 풀이 단계별 정렬 + errorKind highlight.
 * Spec: docs/build-spec/08-q2-build.md M2.2 OcrResultPanel.
 *
 * 풀이 첨부 → /api/ocr → 이 패널 표시. 학생이 검토 후 "이대로 채점" 또는
 * "다시 그리기" 선택. 모르겠으면 그냥 닫고 객관식만 제출도 가능.
 */

import type {
  AlignedStep,
  ErrorKind,
  OcrResponse,
} from "@/lib/api/schemas/ocr"

const ERROR_TONE: Record<ErrorKind, { label: string; bg: string; text: string }> = {
  match: {
    label: "일치",
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
  },
  extra_step: {
    label: "불필요한 단계",
    bg: "bg-zinc-50 border-zinc-200",
    text: "text-zinc-700",
  },
  wrong_substitution: {
    label: "대입 오류",
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-800",
  },
  sign_error: {
    label: "부호 실수",
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
  },
  missing_condition: {
    label: "조건 누락",
    bg: "bg-yellow-50 border-yellow-200",
    text: "text-yellow-800",
  },
  arithmetic_error: {
    label: "계산 실수",
    bg: "bg-orange-50 border-orange-200",
    text: "text-orange-800",
  },
}

export interface OcrResultPanelProps {
  ocr: OcrResponse
  onAcceptAndGrade: () => void
  onRedraw: () => void
  onDismiss: () => void
}

export function OcrResultPanel({
  ocr,
  onAcceptAndGrade,
  onRedraw,
  onDismiss,
}: OcrResultPanelProps) {
  return (
    <section
      className="rounded-lg border border-black/10 bg-white p-4"
      data-testid="ocr-result-panel"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-black/45">
            풀이 분석
          </p>
          <p className="mt-0.5 text-xs text-black/55">
            인식 신뢰도 {(ocr.overallConfidence * 100).toFixed(0)}% · 처리{" "}
            {(ocr.processingTimeMs / 1000).toFixed(1)}s
          </p>
        </div>
        {ocr.detectedAnswerChoice && ocr.answerConfidence >= 0.5 && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800"
            data-testid="ocr-detected-answer"
            title={`답 감지 신뢰도 ${(ocr.answerConfidence * 100).toFixed(0)}%`}
          >
            <span className="text-emerald-600">✏️</span>
            <span>답 {ocr.detectedAnswerChoice}번 인식</span>
          </span>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="text-black/45 hover:text-black/85"
          aria-label="닫기"
        >
          ✕
        </button>
      </header>

      <ul className="flex flex-col gap-1.5" data-testid="ocr-aligned-steps">
        {ocr.steps.length === 0 && (
          <li className="text-xs text-black/45">
            인식된 단계가 없어요. 다시 그려 주세요.
          </li>
        )}
        {ocr.steps.map((s) => (
          <AlignedStepRow key={s.stepIdx} step={s} />
        ))}
      </ul>

      <footer className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-black/5 pt-3">
        <button
          type="button"
          onClick={onRedraw}
          data-testid="ocr-redraw"
          className="rounded-md border border-black/15 bg-white px-3 py-1.5 text-xs text-black/75 hover:bg-black/[0.03]"
        >
          다시 그리기
        </button>
        <button
          type="button"
          onClick={onAcceptAndGrade}
          data-testid="ocr-accept"
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-black/85"
        >
          이대로 채점
        </button>
      </footer>
    </section>
  )
}

function AlignedStepRow({ step }: { step: AlignedStep }) {
  const tone = step.errorKind ? ERROR_TONE[step.errorKind] : null
  const showUserOnly = step.userText && !step.canonicalText
  const showCanonicalOnly = !step.userText && step.canonicalText

  return (
    <li
      className={`rounded-md border px-3 py-2 text-sm ${tone?.bg ?? "border-black/10 bg-white"}`}
      data-testid={`ocr-step-${step.stepIdx}`}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[10px] tabular-nums text-black/45">#{step.stepIdx + 1}</span>
        {tone && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tone.text}`}
          >
            {tone.label}
          </span>
        )}
        {showCanonicalOnly && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
            누락
          </span>
        )}
      </div>
      {step.userText && (
        <p className="mt-1 text-black/85">
          <span className="text-[10px] uppercase tracking-wider text-black/40 mr-2">
            {showUserOnly ? "내 풀이 (정답에 없음)" : "내 풀이"}
          </span>
          {step.userText}
        </p>
      )}
      {step.canonicalText && (
        <p className="mt-1 text-black/65">
          <span className="text-[10px] uppercase tracking-wider text-black/40 mr-2">
            정답
          </span>
          {step.canonicalText}
        </p>
      )}
      {step.suggestion && (
        <p className="mt-1 text-xs italic text-black/55">→ {step.suggestion}</p>
      )}
    </li>
  )
}
