/**
 * 챌린지 모드 머신 — M3.2.
 * Spec:
 *   - 06-state-machines.md §3 (states/transitions)
 *   - 09-q3-build.md M3.2 (LEVEL_UP @5, ±0.1, 2연속 wrong → session_end)
 *   - 04-algorithms.md §4.1 (nextActionChallenge 정책)
 *
 * 구현 메모: 본 파일은 spec 의 "XState v5" 슬롯을 채우되, xstate 의존성을
 * 추가하지 않고 순수 reducer + 명시적 상태로 구현. 머신의 의미·전이·ctx
 * 가 동일하므로 추후 xstate 도입 시 그대로 lift 가능. (M2.5 의 inline
 * mode 처리와 동일한 컨벤션.)
 */
import { z } from "zod"

export const CHALLENGE_LEVEL_UP_STREAK = 5
export const CHALLENGE_DIFFICULTY_STEP = 0.1
export const CHALLENGE_ABORT_AFTER_CONSECUTIVE_WRONG = 2

export type ChallengeStateName =
  | "idle"
  | "solving"
  | "level_up"
  | "session_end"

export interface ChallengeContext {
  /** 챌린지가 묶여있는 Pattern. LEVEL_UP 시 부모가 다음 자식 Pattern 으로 교체. */
  targetPatternId: string
  patternLabel: string
  /** 다음 추천 문제의 difficulty 기준치. theta 출발 → ±0.1 step. */
  currentDifficulty: number
  consecutiveCorrect: number
  consecutiveWrong: number
  /** LEVEL_UP 누적 — Pro+ 통계 표시용 (M3.5). */
  levelsCleared: number
}

export type ChallengeEvent =
  | {
      type: "START"
      targetPatternId: string
      patternLabel: string
      startingDifficulty: number
    }
  | { type: "ATTEMPT"; correct: boolean }
  | {
      type: "LEVEL_UP_TARGET"
      targetPatternId: string
      patternLabel: string
      startingDifficulty: number
    }
  | { type: "ABORT" }

export interface ChallengeState {
  name: ChallengeStateName
  ctx: ChallengeContext
}

export const initialChallengeContext: ChallengeContext = {
  targetPatternId: "",
  patternLabel: "",
  currentDifficulty: 0.5,
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  levelsCleared: 0,
}

export const initialChallengeState: ChallengeState = {
  name: "idle",
  ctx: initialChallengeContext,
}

const clampDifficulty = (d: number): number =>
  Math.max(0, Math.min(1, Number(d.toFixed(3))))

/**
 * 순수 reducer. (state, event) → state.
 * Spec 06 §3:
 *   idle --START--> solving
 *   solving --ATTEMPT(correct, streak<5)--> solving (difficulty +0.1, consecutiveCorrect++)
 *   solving --ATTEMPT(correct, streak===5)--> level_up
 *   solving --ATTEMPT(!correct, consecutiveWrong<2)--> solving (difficulty -0.1)
 *   solving --ATTEMPT(!correct, consecutiveWrong===2)--> session_end
 *   level_up --LEVEL_UP_TARGET--> solving (새 Pattern, streak/wrong reset)
 *   * --ABORT--> session_end
 */
export function challengeReducer(
  state: ChallengeState,
  event: ChallengeEvent,
): ChallengeState {
  if (event.type === "ABORT") {
    return { name: "session_end", ctx: state.ctx }
  }

  if (event.type === "START") {
    return {
      name: "solving",
      ctx: {
        ...initialChallengeContext,
        targetPatternId: event.targetPatternId,
        patternLabel: event.patternLabel,
        currentDifficulty: clampDifficulty(event.startingDifficulty),
      },
    }
  }

  if (event.type === "LEVEL_UP_TARGET") {
    if (state.name !== "level_up") return state
    return {
      name: "solving",
      ctx: {
        ...state.ctx,
        targetPatternId: event.targetPatternId,
        patternLabel: event.patternLabel,
        currentDifficulty: clampDifficulty(event.startingDifficulty),
        consecutiveCorrect: 0,
        consecutiveWrong: 0,
        levelsCleared: state.ctx.levelsCleared + 1,
      },
    }
  }

  if (event.type === "ATTEMPT") {
    if (state.name !== "solving") return state

    if (event.correct) {
      const nextStreak = state.ctx.consecutiveCorrect + 1
      if (nextStreak >= CHALLENGE_LEVEL_UP_STREAK) {
        return {
          name: "level_up",
          ctx: {
            ...state.ctx,
            consecutiveCorrect: nextStreak,
            consecutiveWrong: 0,
          },
        }
      }
      return {
        name: "solving",
        ctx: {
          ...state.ctx,
          consecutiveCorrect: nextStreak,
          consecutiveWrong: 0,
          currentDifficulty: clampDifficulty(
            state.ctx.currentDifficulty + CHALLENGE_DIFFICULTY_STEP,
          ),
        },
      }
    }

    // wrong
    const nextWrong = state.ctx.consecutiveWrong + 1
    if (nextWrong >= CHALLENGE_ABORT_AFTER_CONSECUTIVE_WRONG) {
      return {
        name: "session_end",
        ctx: {
          ...state.ctx,
          consecutiveCorrect: 0,
          consecutiveWrong: nextWrong,
        },
      }
    }
    return {
      name: "solving",
      ctx: {
        ...state.ctx,
        consecutiveCorrect: 0,
        consecutiveWrong: nextWrong,
        currentDifficulty: clampDifficulty(
          state.ctx.currentDifficulty - CHALLENGE_DIFFICULTY_STEP,
        ),
      },
    }
  }

  return state
}

/**
 * 04-algorithms §4.1: nextActionChallenge.
 * reducer 수행 후 머신이 부모에게 알려야 하는 즉시 동작.
 */
export type ChallengeNextAction =
  | { type: "next_item"; samePattern: true; difficulty: number }
  | { type: "level_up" }
  | { type: "session_end" }

export function challengeNextAction(state: ChallengeState): ChallengeNextAction {
  switch (state.name) {
    case "level_up":
      return { type: "level_up" }
    case "session_end":
      return { type: "session_end" }
    case "solving":
      return {
        type: "next_item",
        samePattern: true,
        difficulty: state.ctx.currentDifficulty,
      }
    default:
      return { type: "session_end" }
  }
}

// ============================================================
// 클라 직렬화 (URL/세션 ctx 보존용 — 새로고침 견고성).
// ============================================================

export const ChallengeSnapshot = z.object({
  targetPatternId: z.string().uuid(),
  patternLabel: z.string(),
  currentDifficulty: z.number().min(0).max(1),
  consecutiveCorrect: z.number().int().nonnegative(),
  consecutiveWrong: z.number().int().nonnegative(),
  levelsCleared: z.number().int().nonnegative(),
})
export type ChallengeSnapshot = z.infer<typeof ChallengeSnapshot>

export const snapshotFromState = (s: ChallengeState): ChallengeSnapshot =>
  ChallengeSnapshot.parse(s.ctx)
