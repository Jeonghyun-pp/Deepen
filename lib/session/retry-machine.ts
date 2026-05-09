/**
 * 재도전 모드 머신 — M3.2.
 * Spec:
 *   - 06-state-machines.md §5 (Practice 의 sub-state)
 *   - 09-q3-build.md M3.2 (recap 통과 → storedItemId 강제 → BN re-run)
 *   - 04-algorithms.md §4.1 (nextActionRetry)
 *
 * 의도:
 *   1) Practice 흐름 안에서 wrong → recap → 모든 카드 통과 시 RetryPrompt 표시
 *   2) 사용자가 "재도전" 클릭 → /v2/solve/storedItemId?mode=retry 로 진입
 *   3) 재도전 attempt 결과를 /api/attempts 가 mode='retry' 로 받아
 *      meta.recapPatternIds 에 대해 BN re-run 후 prereq_deficit_log 누적
 *
 * 본 파일은 challenge-machine 와 동일한 패턴 — 순수 reducer + 명시적 ctx.
 */
import { z } from "zod"

export type RetryStateName =
  | "idle"
  | "awaiting_recap"
  | "recap_passed"
  | "retrying"
  | "completed"

export interface RetryContext {
  /** recap 직전 마지막 wrong attempt 의 itemId — 재도전 강제 대상. */
  storedItemId: string | null
  /** recap 카드들이 다룬 prereq pattern ids (BN re-run 대상). */
  recapPatternIds: string[]
  /** UI 표시용 — "다항함수의 극한 1문제" 같은 라벨. */
  storedItemLabel: string | null
  /** 재도전 attempt 결과 — true=정답. evidence 누적용 hint. */
  retrySucceeded: boolean | null
}

export type RetryEvent =
  | {
      type: "WRONG_WITH_RECAP"
      storedItemId: string
      storedItemLabel: string
      recapPatternIds: string[]
    }
  | { type: "RECAP_ALL_PASSED" }
  | { type: "ACCEPT_RETRY" }
  | { type: "SKIP_RETRY" }
  | { type: "RETRY_RESULT"; correct: boolean }
  | { type: "RESET" }

export interface RetryState {
  name: RetryStateName
  ctx: RetryContext
}

const initialRetryContext: RetryContext = {
  storedItemId: null,
  recapPatternIds: [],
  storedItemLabel: null,
  retrySucceeded: null,
}

export const initialRetryState: RetryState = {
  name: "idle",
  ctx: initialRetryContext,
}

/**
 * 순수 reducer.
 *   idle --WRONG_WITH_RECAP--> awaiting_recap
 *   awaiting_recap --RECAP_ALL_PASSED--> recap_passed
 *   recap_passed --ACCEPT_RETRY--> retrying
 *   recap_passed --SKIP_RETRY--> completed
 *   retrying --RETRY_RESULT--> completed
 *   * --RESET--> idle
 */
export function retryReducer(state: RetryState, event: RetryEvent): RetryState {
  if (event.type === "RESET") return initialRetryState

  if (event.type === "WRONG_WITH_RECAP") {
    return {
      name: "awaiting_recap",
      ctx: {
        storedItemId: event.storedItemId,
        recapPatternIds: [...event.recapPatternIds],
        storedItemLabel: event.storedItemLabel,
        retrySucceeded: null,
      },
    }
  }

  if (event.type === "RECAP_ALL_PASSED") {
    if (state.name !== "awaiting_recap") return state
    return { ...state, name: "recap_passed" }
  }

  if (event.type === "ACCEPT_RETRY") {
    if (state.name !== "recap_passed") return state
    if (!state.ctx.storedItemId) return state
    return { ...state, name: "retrying" }
  }

  if (event.type === "SKIP_RETRY") {
    if (state.name !== "recap_passed") return state
    return { ...state, name: "completed" }
  }

  if (event.type === "RETRY_RESULT") {
    if (state.name !== "retrying") return state
    return {
      name: "completed",
      ctx: { ...state.ctx, retrySucceeded: event.correct },
    }
  }

  return state
}

// ============================================================
// URL/검증 직렬화
// ============================================================

export const RetryAttemptMeta = z.object({
  source: z.literal("recap_retry"),
  storedItemId: z.string().uuid(),
  recapPatternIds: z.array(z.string().uuid()).max(20),
})
export type RetryAttemptMeta = z.infer<typeof RetryAttemptMeta>
