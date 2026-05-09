/**
 * 풀이 화면 클라 상태 — Zustand.
 * Spec: docs/build-spec/07-q1-build.md M1.3.
 *
 * 한 attempt 의 라이프타임 동안만 유지. 새 itemId 가 진입하면 reset.
 * mode 는 Q1 'practice' 만 사용 (A-3). UI 노출 X.
 */

import { create } from "zustand"
import type { SelfConfidence } from "@/lib/api/schemas/attempts"

export interface SolveState {
  itemId: string | null
  startedAt: number | null
  selectedAnswer: string | null
  hintsUsed: number
  aiQuestions: number
  selfConfidence: SelfConfidence

  /** 한 itemId 진입 시 호출 — 모든 카운터·타이머 reset. */
  begin: (itemId: string) => void
  setSelectedAnswer: (a: string) => void
  bumpHints: () => void
  bumpAiQuestions: () => void
  setSelfConfidence: (c: SelfConfidence) => void
  /** 제출용 elapsed ms. startedAt null 이면 0. */
  elapsedMs: () => number
  reset: () => void
}

export const useSolveStore = create<SolveState>((set, get) => ({
  itemId: null,
  startedAt: null,
  selectedAnswer: null,
  hintsUsed: 0,
  aiQuestions: 0,
  selfConfidence: "mid",

  begin: (itemId) =>
    set({
      itemId,
      startedAt: Date.now(),
      selectedAnswer: null,
      hintsUsed: 0,
      aiQuestions: 0,
      selfConfidence: "mid",
    }),
  setSelectedAnswer: (a) => set({ selectedAnswer: a }),
  bumpHints: () => set((s) => ({ hintsUsed: s.hintsUsed + 1 })),
  bumpAiQuestions: () => set((s) => ({ aiQuestions: s.aiQuestions + 1 })),
  setSelfConfidence: (c) => set({ selfConfidence: c }),
  elapsedMs: () => {
    const t = get().startedAt
    return t ? Date.now() - t : 0
  },
  reset: () =>
    set({
      itemId: null,
      startedAt: null,
      selectedAnswer: null,
      hintsUsed: 0,
      aiQuestions: 0,
      selfConfidence: "mid",
    }),
}))
