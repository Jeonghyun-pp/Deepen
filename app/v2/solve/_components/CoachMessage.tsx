"use client"

/**
 * 코치 메시지 — AI SDK v6 UIMessage 직접 소비.
 * Spec: docs/build-spec/07-q1-build.md M1.5.
 *
 * UIMessage.parts:
 *   - text       — 본문 (streaming 중에도 누적)
 *   - data-card  — RecapCard 인서트 (tool 결과)
 *   - data-card-error — 카드 빌드 실패
 *   - tool-*     — tool 호출 부산물 (UI 무시)
 *
 * highlight / similar 는 transient data part 라 store 에만 반영, 여기 렌더 X.
 */

import type { CoachUIMessage } from "@/lib/ai-coach/coach-message"
import { RecapCard } from "./RecapCard"

export interface CoachMessageProps {
  message: CoachUIMessage
  streaming?: boolean
}

export function CoachMessage({ message, streaming }: CoachMessageProps) {
  const isUser = message.role === "user"
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
  const cards = message.parts.flatMap((p) =>
    p.type === "data-card" ? [p.data] : [],
  )
  const cardErrors = message.parts.flatMap((p) =>
    p.type === "data-card-error" ? [p.data] : [],
  )

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`coach-message-${message.role}`}
    >
      <div
        className={`max-w-[85%] flex flex-col gap-2 ${
          isUser
            ? "rounded-2xl rounded-br-sm bg-black px-4 py-2.5 text-sm text-white"
            : "rounded-2xl rounded-bl-sm border border-black/10 bg-white px-4 py-2.5 text-sm leading-6 text-black/85"
        }`}
      >
        {text && (
          <p className="whitespace-pre-wrap">
            {text}
            {streaming && !isUser && (
              <span
                className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded bg-black/40 align-middle"
                aria-label="입력 중"
              />
            )}
          </p>
        )}

        {cards.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            {cards.map(({ card }) => (
              <RecapCard
                key={card.patternId}
                card={card}
                passed={false}
                onPassed={() => {
                  /* 코치 인서트 카드는 통과해도 자동 복귀 X (학생이 풀이 중) */
                }}
                onReturn={() => {
                  /* 코치 인서트 카드는 close 동작 없음 */
                }}
              />
            ))}
          </div>
        )}

        {cardErrors.length > 0 && (
          <p
            className="text-xs text-amber-700"
            data-testid="coach-message-card-error"
            role="alert"
          >
            카드 생성 실패 — 다시 시도해 보세요.
          </p>
        )}
      </div>
    </div>
  )
}
