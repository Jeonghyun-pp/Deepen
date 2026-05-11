/**
 * Mastery 상태 머신 — unseen → viewed → tested → mastered (북극성 Stage 1).
 * Spec: docs/north-star-spec-2026-05-11.md §3
 *
 * 원칙: "읽었다"는 이해의 증거가 아니다. 행동으로만 증명.
 *   unseen → viewed (event=view)
 *   viewed → tested (첫 check 시도, 정답·오답 무관)
 *   tested → mastered (다른 type 의 check 1회 이상 통과 또는 같은 type 24h 간격 재통과)
 *   mastered → tested (check_fail 시 회수, 정직성 원칙)
 */

import type { MasteryStateValue, CheckItemTypeValue } from "@/lib/db/schema"

export type MasteryState = MasteryStateValue
export type CheckItemType = CheckItemTypeValue

export interface CheckHistoryItem {
  itemType: CheckItemType
  correct: boolean
  attemptedAt: Date
}

export type MasteryEvent =
  | { type: "view" }
  | { type: "check_pass"; itemType: CheckItemType }
  | { type: "check_fail" }

const MASTERY_REPASS_INTERVAL_MS = 24 * 60 * 60 * 1000

export function nextMasteryState(args: {
  current: MasteryState
  event: MasteryEvent
  history: CheckHistoryItem[]
  /** 이벤트 시점. mastered 전이 시 24h 간격 비교용. default Date.now(). */
  now?: Date
}): MasteryState {
  const { current, event } = args
  const now = args.now ?? new Date()

  if (event.type === "view") {
    if (current === "unseen") return "viewed"
    return current
  }

  if (event.type === "check_fail") {
    if (current === "mastered") return "tested"
    if (current === "viewed") return "tested"
    if (current === "unseen") return "tested"
    return current
  }

  // check_pass
  if (current === "unseen" || current === "viewed") {
    return "tested"
  }
  if (current === "tested") {
    // 다른 type 통과 OR 같은 type 24h 간격 재통과 → mastered
    const passes = args.history.filter((h) => h.correct)
    const differentType = passes.some((h) => h.itemType !== event.itemType)
    if (differentType) return "mastered"

    const sameTypePasses = passes.filter(
      (h) => h.itemType === event.itemType,
    )
    if (sameTypePasses.length > 0) {
      const earliest = sameTypePasses.reduce((min, h) =>
        h.attemptedAt < min.attemptedAt ? h : min,
      )
      if (
        now.getTime() - earliest.attemptedAt.getTime() >=
        MASTERY_REPASS_INTERVAL_MS
      ) {
        return "mastered"
      }
    }
    return "tested"
  }
  // mastered 상태에서 추가 pass 는 그대로 mastered
  return "mastered"
}
