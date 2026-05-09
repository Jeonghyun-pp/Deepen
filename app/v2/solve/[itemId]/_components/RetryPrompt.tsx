"use client"

/**
 * RetryPrompt — 재도전 모달.
 * Spec: 09-q3-build.md M3.2 (recap 통과 후 자동 출현).
 */

interface RetryPromptProps {
  storedItemLabel: string
  recapCardsPassed: number
  onRetry: () => void
  onSkip: () => void
}

export function RetryPrompt({
  storedItemLabel,
  recapCardsPassed,
  onRetry,
  onSkip,
}: RetryPromptProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4"
      role="dialog"
      aria-modal="true"
      data-testid="retry-prompt"
    >
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
          리캡 {recapCardsPassed}장 통과
        </span>
        <h2 className="mt-2 text-lg font-semibold text-black/85">
          이제 그 문제, 다시 풀어볼까요?
        </h2>
        <p className="mt-1 text-sm text-black/55">
          방금 막혔던 <span className="font-medium text-black/80">{storedItemLabel}</span>{" "}
          으로 돌아갑니다. 같은 문제를 새로 풀어 결손이 메워졌는지 확인합니다.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm text-black/70 hover:bg-black/[0.03]"
            data-testid="retry-skip"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={onRetry}
            data-testid="retry-accept"
            className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
          >
            재도전 →
          </button>
        </div>
      </div>
    </div>
  )
}
