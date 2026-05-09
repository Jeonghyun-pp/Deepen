"use client"

/**
 * 풀이 화면 우상단 타이머.
 * Spec: docs/build-spec/07-q1-build.md M1.3.
 *
 * mode='practice' 에선 표시만 — 시간 초과 자동 제출 X (M2.5 exam 모드부터).
 */

import { useEffect, useState } from "react"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"

const fmt = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${String(s).padStart(2, "0")}`
}

export function Timer() {
  const startedAt = useSolveStore((s) => s.startedAt)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt)
    }, 250)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <div
      className="font-mono text-sm tabular-nums text-black/60"
      data-testid="solve-timer"
      aria-label="풀이 시간"
    >
      {fmt(elapsed)}
    </div>
  )
}
