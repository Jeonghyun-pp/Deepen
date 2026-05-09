"use client"

/**
 * 코치 메시지 — user 또는 assistant.
 * Spec: docs/build-spec/07-q1-build.md M1.5.
 *
 * Q1 단순화: KaTeX 렌더 X (raw text). 인서트 카드는 RecapCard 재사용.
 */

import type { CoachMessage as CoachMessageType } from "@/app/v2/_components/store/coach-store"
import { RecapCard } from "./RecapCard"

export interface CoachMessageProps {
  message: CoachMessageType
}

export function CoachMessage({ message }: CoachMessageProps) {
  const isUser = message.role === "user"
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
        {message.content && (
          <p className="whitespace-pre-wrap">
            {message.content}
            {message.streaming && (
              <span
                className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded bg-black/40 align-middle"
                aria-label="입력 중"
              />
            )}
          </p>
        )}

        {message.insertedCards && message.insertedCards.length > 0 && (
          <div className="mt-1 flex flex-col gap-2">
            {message.insertedCards.map((card) => (
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

        {message.errorCode && (
          <p
            className="text-xs text-rose-700"
            data-testid="coach-message-error"
            role="alert"
          >
            응답 실패 ({message.errorCode}). 다시 보내 보세요.
          </p>
        )}
      </div>
    </div>
  )
}
