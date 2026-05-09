"use client"

/**
 * AI 코치 사이드 패널 — 풀이 화면 우측 (모바일은 bottom sheet).
 * Spec: docs/build-spec/07-q1-build.md M1.5, 05-llm-prompts §1.
 *
 * 흐름:
 *   사용자 free input 또는 5칩 클릭 → /api/ai-coach/chat SSE
 *   토큰 delta → 마지막 assistant 메시지 누적
 *   tool_use → card / highlight / similar 이벤트 분기
 *   429 quota 응답 → 패널에 업그레이드 안내
 */

import { useCallback, useEffect, useRef, useState } from "react"
import type { CoachChatRequest } from "@/lib/api/schemas/ai-coach"
import type { RecapCardPayload } from "@/lib/api/schemas/recap"
import { useCoachStore } from "@/app/v2/_components/store/coach-store"
import { useSolveStore } from "@/app/v2/_components/store/solve-store"
import { CoachMessage } from "./CoachMessage"
import { ChipBar, type ChipKey } from "./ChipBar"

export interface CoachPanelProps {
  itemId: string
}

export function CoachPanel({ itemId }: CoachPanelProps) {
  const open = useCoachStore((s) => s.open)
  const setOpen = useCoachStore((s) => s.setOpen)
  const begin = useCoachStore((s) => s.begin)
  const messages = useCoachStore((s) => s.messages)
  const streaming = useCoachStore((s) => s.streaming)
  const setStreaming = useCoachStore((s) => s.setStreaming)
  const pushUser = useCoachStore((s) => s.pushUser)
  const pushAssistant = useCoachStore((s) => s.pushAssistant)
  const appendDelta = useCoachStore((s) => s.appendDelta)
  const attachCard = useCoachStore((s) => s.attachCard)
  const setError = useCoachStore((s) => s.setError)
  const setHighlight = useCoachStore((s) => s.setHighlight)
  const setSimilar = useCoachStore((s) => s.setSimilar)
  const quotaError = useCoachStore((s) => s.quotaError)
  const inputPrefill = useCoachStore((s) => s.inputPrefill)
  const setInputPrefill = useCoachStore((s) => s.setInputPrefill)
  const setQuotaError = useCoachStore((s) => s.setQuotaError)

  const bumpAiQuestions = useSolveStore((s) => s.bumpAiQuestions)

  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    begin(itemId)
  }, [itemId, begin])

  // M2.6 듀얼 모드: PDF 드래그 → coach-store.inputPrefill → input 자동 채움.
  // 학생이 검토 후 Enter 로 send.
  useEffect(() => {
    if (inputPrefill) {
      setInput(inputPrefill)
      setOpen(true)
      setInputPrefill(null)
    }
  }, [inputPrefill, setInputPrefill, setOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = useCallback(
    async (message: string, chipKey?: ChipKey) => {
      if (streaming || !message.trim()) return
      bumpAiQuestions()

      pushUser(message)
      const assistantId = `a-${Date.now()}`
      pushAssistant(assistantId)
      setStreaming(true)
      setQuotaError(null)
      setHighlight([])

      try {
        const body: CoachChatRequest = {
          itemId,
          message,
          ...(chipKey ? { chipKey } : {}),
        }
        const res = await fetch("/api/ai-coach/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        })

        if (res.status === 429) {
          const data = (await res.json()) as { limit?: number; used?: number }
          setQuotaError({ limit: data.limit ?? 5, used: data.used ?? 5 })
          setError(assistantId, "quota_exceeded")
          setStreaming(false)
          return
        }
        if (!res.ok || !res.body) {
          setError(assistantId, `http_${res.status}`)
          setStreaming(false)
          return
        }

        await readSse(res.body, {
          onToken: (delta) => appendDelta(assistantId, delta),
          onCard: (card) => attachCard(assistantId, card),
          onHighlight: (nodeIds) => setHighlight(nodeIds),
          onSimilar: (p) => setSimilar(p),
          onError: (msg) => setError(assistantId, msg),
        })
      } catch (e) {
        setError(assistantId, (e as Error).message ?? "network_error")
      } finally {
        setStreaming(false)
      }
    },
    [
      itemId,
      streaming,
      bumpAiQuestions,
      pushUser,
      pushAssistant,
      appendDelta,
      attachCard,
      setError,
      setHighlight,
      setSimilar,
      setStreaming,
      setQuotaError,
    ],
  )

  const handleChip = (key: ChipKey) => {
    void send(`(${key}) 알려주세요.`, key)
  }

  const handleSend = () => {
    const v = input.trim()
    if (!v) return
    setInput("")
    void send(v)
  }

  if (!open) {
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

  return (
    <aside
      className="fixed inset-0 z-40 flex flex-col bg-white shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:border-black/10"
      data-testid="coach-panel"
      aria-label="AI 코치 패널"
    >
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
        {messages.map((m) => (
          <CoachMessage key={m.id} message={m} />
        ))}
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

interface SseHandlers {
  onToken: (delta: string) => void
  onCard: (card: RecapCardPayload) => void
  onHighlight: (nodeIds: string[]) => void
  onSimilar: (p: { patternId: string; itemIds: string[] }) => void
  onError: (msg: string) => void
}

async function readSse(
  body: ReadableStream<Uint8Array>,
  handlers: SseHandlers,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let sepIndex: number
    while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)
      const lines = raw.split("\n")
      let event = "message"
      const dataLines: string[] = []
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim()
        else if (line.startsWith("data: ")) dataLines.push(line.slice(6))
      }
      const dataStr = dataLines.join("\n")
      if (!dataStr) continue
      let data: unknown
      try {
        data = JSON.parse(dataStr)
      } catch {
        continue
      }
      if (event === "token") {
        const d = data as { delta: string }
        handlers.onToken(d.delta)
      } else if (event === "card") {
        const d = data as { card: RecapCardPayload }
        handlers.onCard(d.card)
      } else if (event === "highlight") {
        const d = data as { nodeIds: string[] }
        handlers.onHighlight(d.nodeIds)
      } else if (event === "similar") {
        const d = data as {
          patternId: string
          items: { id: string }[]
        }
        handlers.onSimilar({
          patternId: d.patternId,
          itemIds: d.items?.map((it) => it.id) ?? [],
        })
      } else if (event === "error") {
        const d = data as { message: string }
        handlers.onError(d.message)
      } else if (event === "done") {
        return
      }
    }
  }
}
