"use client"

/**
 * AI 코치 사이드 패널 — 풀이 화면 우측 (모바일은 bottom sheet).
 * Spec: docs/build-spec/07-q1-build.md M1.5, 05-llm-prompts §1.
 *
 * Phase 2 (AI SDK v6 마이그레이션):
 *   - 자체 fetch + readSse() → @ai-sdk/react `useChat` 훅
 *   - messages 는 훅이 보유 (store 에서 제거됨)
 *   - card 는 message.parts (data-card) 로 자동 누적
 *   - highlight / similar 는 transient data part → onData → store
 *   - quota 429 는 DefaultChatTransport.fetch 래퍼로 가로채 store.quotaError 채움
 *
 * 흐름:
 *   사용자 free input 또는 5칩 클릭 → sendMessage({ text }, { body: { chipKey } })
 *   onData → store.setHighlight / setSimilar
 *   onError → quota or generic
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DefaultChatTransport } from "ai"
import { useChat } from "@ai-sdk/react"
import type { CoachUIMessage } from "@/lib/ai-coach/coach-message"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"
import { CoachMessage } from "./CoachMessage"
import { ChipBar, type ChipKey } from "./ChipBar"

export interface CoachPanelProps {
  itemId: string
  /**
   * E2E 수정: 'inline' = 워크스페이스 우 panel 안에 채워지는 모드 (fixed X).
   * 'floating' (default) = 기존 standalone /v2/solve 의 fixed 우측 420px.
   */
  variant?: "floating" | "inline"
}

export function CoachPanel({ itemId, variant = "floating" }: CoachPanelProps) {
  const open = useCoachStore((s) => s.open)
  const setOpen = useCoachStore((s) => s.setOpen)
  const begin = useCoachStore((s) => s.begin)
  const quotaError = useCoachStore((s) => s.quotaError)
  const setQuotaError = useCoachStore((s) => s.setQuotaError)
  const setHighlight = useCoachStore((s) => s.setHighlight)
  const setSimilar = useCoachStore((s) => s.setSimilar)

  const bumpAiQuestions = useSolveStore((s) => s.bumpAiQuestions)

  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // itemId 변경 시 store 초기화 (코치 메시지는 useChat 의 id 분리로 자연 reset)
  useEffect(() => {
    begin(itemId)
  }, [itemId, begin])

  // 429 가로채는 fetch — DefaultChatTransport 에 주입
  const customFetch = useCallback<typeof fetch>(
    async (input, init) => {
      const res = await fetch(input, init)
      if (res.status === 429) {
        const data = (await res
          .clone()
          .json()
          .catch(() => ({}))) as {
          limit?: number | "unlimited"
          used?: number
        }
        setQuotaError({
          limit: data.limit ?? 5,
          used: data.used ?? 5,
        })
        // AI SDK 가 비-200 을 에러로 던지도록 그대로 반환
      }
      return res
    },
    [setQuotaError],
  )

  const transport = useMemo(
    () =>
      new DefaultChatTransport<CoachUIMessage>({
        api: "/api/ai-coach/chat",
        fetch: customFetch,
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            itemId,
            ...(body ?? {}),
            messages,
          },
        }),
      }),
    [customFetch, itemId],
  )

  const { messages, sendMessage, status, error, clearError } =
    useChat<CoachUIMessage>({
      id: itemId,
      transport,
      onData: (part) => {
        if (part.type === "data-highlight") {
          setHighlight(part.data.nodeIds)
        } else if (part.type === "data-similar") {
          setSimilar({
            patternId: part.data.patternId,
            itemIds: part.data.items.map((it) => it.id),
          })
        }
      },
    })

  const streaming = status === "submitted" || status === "streaming"

  // PDF 드래그 prefill → 로컬 input 브리지.
  // store subscribe 콜백에서 setState 호출하면 react-hooks/set-state-in-effect 회피.
  useEffect(() => {
    const unsub = useCoachStore.subscribe((state, prev) => {
      if (state.inputPrefill && state.inputPrefill !== prev.inputPrefill) {
        setInput(state.inputPrefill)
        setOpen(true)
        useCoachStore.getState().setInputPrefill(null)
      }
    })
    return unsub
  }, [setOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = useCallback(
    (text: string, chipKey?: ChipKey) => {
      if (streaming || !text.trim()) return
      bumpAiQuestions()
      setQuotaError(null)
      setHighlight([])
      clearError()
      void sendMessage(
        { text },
        chipKey ? { body: { chipKey } } : undefined,
      )
    },
    [
      streaming,
      bumpAiQuestions,
      setQuotaError,
      setHighlight,
      clearError,
      sendMessage,
    ],
  )

  const handleChip = (key: ChipKey) => {
    send(`(${key}) 알려주세요.`, key)
  }

  const handleSend = () => {
    const v = input.trim()
    if (!v) return
    setInput("")
    send(v)
  }

  if (!open) {
    // inline 모드: 닫혀 있어도 floating 버튼 띄우지 않음 (panel 자리가 비게 됨).
    if (variant === "inline") return null
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-coach-panel"
        className="fixed bottom-6 right-6 z-40 rounded-full bg-black px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-black/85"
        aria-label="AI 코치 열기"
      >
        AI 코치
      </button>
    )
  }

  const asideClass =
    variant === "inline"
      ? "flex h-full w-full flex-col bg-white"
      : "fixed inset-0 z-40 flex flex-col bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:border-black/10"

  return (
    <aside
      className={asideClass}
      data-testid="coach-panel"
      aria-label="AI 코치 패널"
    >
      {/* inline 모드: 워크스페이스 우 panel 의 자체 탭 헤더가 이미 있어서 내부 header 중복 → 숨김 */}
      {variant !== "inline" && (
        <header className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-widest text-black/55">
              AI 코치
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-black/55 hover:text-black/85"
            aria-label="닫기"
          >
            ✕
          </button>
        </header>
      )}

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
        data-testid="coach-messages"
      >
        {messages.length === 0 && (
          <p className="text-center text-xs text-black/45">
            막힌 부분을 골라 보세요. 코치가 단계별로 안내합니다.
          </p>
        )}
        {messages.map((m, idx) => {
          const isLast = idx === messages.length - 1
          return (
            <CoachMessage
              key={m.id}
              message={m}
              streaming={streaming && isLast && m.role === "assistant"}
            />
          )
        })}
        {error && !quotaError && (
          <p
            className="text-center text-xs text-rose-700"
            data-testid="coach-message-error"
            role="alert"
          >
            응답 실패 — 다시 보내 보세요.
          </p>
        )}
      </div>

      {quotaError && (
        <div
          className="mx-4 mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="alert"
          data-testid="coach-quota-error"
        >
          {/* lib/ui/copy.ts 의 quotaExceeded 와 동일 톤 */}
          AI 코치는 평생 5회까지 무료에요. Pro 업그레이드 시 일 30회 사용 가능.
        </div>
      )}

      <div className="border-t border-black/5 px-4 py-3">
        <ChipBar onChipClick={handleChip} />
      </div>

      <footer className="flex gap-2 border-t border-black/5 px-4 py-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={streaming ? "응답 중…" : "코치에게 물어보기"}
          disabled={streaming}
          data-testid="coach-input"
          className="flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 disabled:bg-black/[0.03]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={streaming || !input.trim()}
          data-testid="coach-send"
          className="rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          보내기
        </button>
      </footer>
    </aside>
  )
}
