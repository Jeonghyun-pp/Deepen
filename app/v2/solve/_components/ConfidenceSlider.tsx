"use client"

/**
 * 자신감 셀프 슬라이더 — 3단계 (sure/mid/unsure).
 * Spec: docs/build-spec/07-q1-build.md M1.3, B-5 (헷갈림 측정의 5신호 중 1개).
 *
 * UI 룰:
 *   - 숫자 노출 X (W·τ 상수는 백엔드 lock).
 *   - 키보드 좌우 화살표로 변경 가능.
 *   - default 'mid' (학생이 의식적으로 누르지 않으면 중립).
 */

import { useSolveStore } from "@/app/v2/_components/store/solve-store"
import type { SelfConfidence } from "@/lib/api/schemas/attempts"

const OPTIONS: { value: SelfConfidence; label: string }[] = [
  { value: "sure", label: "확실해요" },
  { value: "mid", label: "그럭저럭" },
  { value: "unsure", label: "자신없음" },
]

export function ConfidenceSlider() {
  const value = useSolveStore((s) => s.selfConfidence)
  const setSelfConfidence = useSolveStore((s) => s.setSelfConfidence)

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = OPTIONS.findIndex((o) => o.value === value)
    if (e.key === "ArrowRight") {
      e.preventDefault()
      setSelfConfidence(OPTIONS[Math.min(OPTIONS.length - 1, idx + 1)].value)
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      setSelfConfidence(OPTIONS[Math.max(0, idx - 1)].value)
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="confidence-slider">
      <span className="text-[11px] font-medium uppercase tracking-wider text-black/45">
        풀이 자신감
      </span>
      <div
        role="radiogroup"
        aria-label="풀이 자신감"
        tabIndex={0}
        onKeyDown={handleKey}
        className="inline-flex rounded-md border border-black/10 bg-white p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-black/30"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => setSelfConfidence(opt.value)}
            data-testid={`confidence-${opt.value}`}
            className={`px-3 py-1.5 text-xs rounded transition ${
              value === opt.value
                ? "bg-black text-white"
                : "text-black/65 hover:text-black"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
