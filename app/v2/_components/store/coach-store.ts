/**
 * AI 코치 클라 상태 — Zustand.
 * Spec: docs/build-spec/07-q1-build.md M1.5.
 *
 * Phase 2 (AI SDK v6 마이그레이션):
 *   - messages / streaming / push* / appendDelta / setError 제거
 *     → @ai-sdk/react useChat 훅이 보유
 *   - card 도 message.parts (data-card) 에 누적되므로 attachCard 불요
 *   - 본 store 는 cross-component side-channel 만 담당:
 *       open            (CoachPanel 토글 — workspace 셸에서 항상 true)
 *       highlightNodeIds (그래프 강조 → GraphPanel 이 구독)
 *       similarItems     (비슷한 문제 추천 — Q1 stub)
 *       quotaError       (429 응답 → CoachPanel 안내 배너)
 *       inputPrefill     (M2.6 PDF 드래그 → 코치 input 자동 채움)
 *       itemId           (현재 컨텍스트 트래킹용)
 */

import { create } from "zustand"

export interface CoachState {
  open: boolean
  itemId: string | null
  highlightNodeIds: string[]
  similarItems: { patternId: string; itemIds: string[] } | null
  quotaError: { limit: number | "unlimited"; used: number } | null
  /** M2.6 듀얼 모드 — PDF 드래그 → 코치 input 자동 채움. */
  inputPrefill: string | null

  setOpen: (v: boolean) => void
  begin: (itemId: string) => void
  setInputPrefill: (text: string | null) => void
  setHighlight: (nodeIds: string[]) => void
  setSimilar: (payload: { patternId: string; itemIds: string[] } | null) => void
  setQuotaError: (
    q: { limit: number | "unlimited"; used: number } | null,
  ) => void
  reset: () => void
}

export const useCoachStore = create<CoachState>((set) => ({
  open: false,
  itemId: null,
  highlightNodeIds: [],
  similarItems: null,
  quotaError: null,
  inputPrefill: null,

  setOpen: (v) => set({ open: v }),
  begin: (itemId) =>
    set({
      itemId,
      highlightNodeIds: [],
      similarItems: null,
      quotaError: null,
      inputPrefill: null,
    }),
  setInputPrefill: (text) => set({ inputPrefill: text }),
  setHighlight: (nodeIds) => set({ highlightNodeIds: nodeIds }),
  setSimilar: (payload) => set({ similarItems: payload }),
  setQuotaError: (q) => set({ quotaError: q }),
  reset: () =>
    set({
      open: false,
      itemId: null,
      highlightNodeIds: [],
      similarItems: null,
      quotaError: null,
      inputPrefill: null,
    }),
}))
