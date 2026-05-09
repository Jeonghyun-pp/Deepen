/**
 * 세션·모드 공용 타입.
 * Spec: docs/build-spec/06-state-machines.md §0.
 *
 * Q1: 'practice' 만 활성. SolveClient 인라인 React 상태로 흐름 처리.
 * M2.5+: lib/session/practice-machine.ts (XState v5) 도입 — types 는 그대로
 *        재사용. exam/challenge/recovery/retry 머신 추가.
 */

export type SessionMode =
  | "practice"
  | "exam"
  | "challenge"
  | "recovery"
  | "retry"

export interface SessionContext {
  userId: string
  mode: SessionMode
  unitKey: string
  startedAt: number
  currentItemId: string | null
  consecutiveCorrect: number
  consecutiveWrong: number
  storedRetryItemId: string | null
}

export type SessionEvent =
  | { type: "START"; mode: SessionMode; unitKey: string }
  | { type: "SELECT_ITEM"; itemId: string }
  | { type: "OPEN_AI_COACH" }
  | { type: "CLOSE_AI_COACH" }
  | { type: "SUBMIT_ATTEMPT"; payload: SubmitPayload }
  | { type: "ENTER_RECAP"; cards: unknown[] }
  | { type: "RECAP_QUIZ_PASS" }
  | { type: "RECAP_QUIZ_FAIL" }
  | { type: "RETURN_TO_RETRY" }
  | { type: "BATCH_GRADE" }
  | { type: "END_SESSION" }

export interface SubmitPayload {
  itemId: string
  selectedAnswer: string
  timeMs: number
  hintsUsed: number
  aiQuestions: number
  selfConfidence: "sure" | "mid" | "unsure"
}
