"use client"

/**
 * 리캡카드 확인 퀴즈 입력. 단답 또는 OX 자유 입력.
 * Spec: docs/build-spec/03-api-contracts.md §4 quiz/submit.
 */

import { useState } from "react"

export interface RecapQuizInputProps {
  patternId: string
  quiz: { question: string; answer: string; hint: string }
  onPassed: () => void
  passed: boolean
}

export function RecapQuizInput({
  quiz,
  onPassed,
  passed,
  patternId,
}: RecapQuizInputProps) {
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ correct: boolean; hint?: string } | null>(
    null,
  )

  const handleSubmit = async () => {
    if (submitting || passed) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch("/api/recap/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patternId,
          expectedAnswer: quiz.answer,
          userAnswer: value,
        }),
      })
      const data = (await res.json()) as { correct: boolean; hint?: string }
      setFeedback(data)
      if (data.correct) onPassed()
    } catch {
      setFeedback({ correct: false, hint: quiz.hint })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-4" data-testid="recap-quiz">
      <p className="mb-2 text-[11px] uppercase tracking-wider text-amber-700">
        확인 퀴즈
      </p>
      <p className="mb-3 text-sm leading-6 text-black/85" data-testid="recap-quiz-question">
        {quiz.question}
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={passed}
          placeholder="답을 입력하세요"
          data-testid="recap-quiz-input"
          className="flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-black/40 disabled:bg-black/[0.03]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void handleSubmit()
            }
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || passed || value.trim().length === 0}
          data-testid="recap-quiz-submit"
          className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "확인…" : passed ? "통과 ✓" : "확인"}
        </button>
      </div>
      {feedback && !feedback.correct && (
        <p
          className="mt-2 text-xs text-rose-700"
          data-testid="recap-quiz-feedback"
          role="alert"
        >
          다시 한 번 — {feedback.hint ?? quiz.hint}
        </p>
      )}
      {feedback?.correct && (
        <p className="mt-2 text-xs text-emerald-700" data-testid="recap-quiz-pass">
          좋아요. 원래 문제로 돌아가 다시 풀어 보세요.
        </p>
      )}
    </div>
  )
}
