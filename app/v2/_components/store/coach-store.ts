/**
 * AI 코치 클라 상태 — Zustand.
 * Spec: docs/build-spec/07-q1-build.md M1.5.
 *
 * 메시지 list + streaming 상태 + tool 결과 (highlight nodeIds, inserted card).
 * itemId 진입 시 reset.
 */

import { create } from "zustand"
import type { RecapCardPayload } from "@/lib/api/schemas/recap"

export interface CoachMessage {
  id: string
  role: "user" | "assistant"
  content: string
  streaming?: boolean
  insertedCards?: RecapCardPayload[]
  errorCode?: string
}

export interface CoachState {
  open: boolean
  itemId: string | null
  messages: CoachMessage[]
  streaming: boolean
  highlightNodeIds: string[]
  similarItems: { patternId: string; itemIds: string[] } | null
  quotaError: { limit: number; used: number } | null
  /** M2.6 듀얼 모드 — PDF 드래그 → 코치 input 자동 채움. */
  inputPrefill: string | null

  setOpen: (v: boolean) => void
  begin: (itemId: string) => void
  setInputPrefill: (text: string | null) => void
  pushUser: (content: string) => string
  pushAssistant: (id: string) => void
  appendDelta: (id: string, delta: string) => void
  attachCard: (id: string, card: RecapCardPayload) => void
  setHighlight: (nodeIds: string[]) => void
  setSimilar: (payload: { patternId: string; itemIds: string[] } | null) => void
  setStreaming: (v: boolean) => void
  setError: (id: string, code: string) => void
  setQuotaError: (q: { limit: number; used: number } | null) => void
  reset: () => void
}

const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ??
  `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const useCoachStore = create<CoachState>((set) => ({
  open: false,
  itemId: null,
  messages: [],
  streaming: false,
  highlightNodeIds: [],
  similarItems: null,
  quotaError: null,
  inputPrefill: null,

  setOpen: (v) => set({ open: v }),
  begin: (itemId) =>
    set({
      itemId,
      messages: [],
      streaming: false,
      highlightNodeIds: [],
      similarItems: null,
      quotaError: null,
      inputPrefill: null,
    }),
  setInputPrefill: (text) => set({ inputPrefill: text }),
  pushUser: (content) => {
    const id = newId()
    set((s) => ({
      messages: [...s.messages, { id, role: "user", content }],
    }))
    return id
  },
  pushAssistant: (id) =>
    set((s) => ({
      messages: [
        ...s.messages,
        { id, role: "assistant", content: "", streaming: true },
      ],
    })),
  appendDelta: (id, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m,
      ),
    })),
  attachCard: (id, card) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id
          ? {
              ...m,
              insertedCards: [...(m.insertedCards ?? []), card],
            }
          : m,
      ),
    })),
  setHighlight: (nodeIds) => set({ highlightNodeIds: nodeIds }),
  setSimilar: (payload) => set({ similarItems: payload }),
  setStreaming: (v) =>
    set((s) => ({
      streaming: v,
      messages: v
        ? s.messages
        : s.messages.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    })),
  setError: (id, code) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, errorCode: code, streaming: false } : m,
      ),
    })),
  setQuotaError: (q) => set({ quotaError: q }),
  reset: () =>
    set({
      open: false,
      itemId: null,
      messages: [],
      streaming: false,
      highlightNodeIds: [],
      similarItems: null,
      quotaError: null,
      inputPrefill: null,
    }),
}))
