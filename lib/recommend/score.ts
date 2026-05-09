/**
 * 하이브리드 추천 score — M3.3.
 * Spec: 04-algorithms.md §4.3 (lock 상수).
 *
 *   score = ALPHA·jaccard + BETA·cosine + GAMMA·prereqOverlap
 *         + DELTA·weaknessAlignment + EPSILON·deficitBoost
 *
 * cosine 은 pgvector 가 1차 sort 한 similarity 값을 그대로 사용 (재계산 X).
 * 나머지는 메모리 reranking 단계에서 계산.
 */
import { jaccard } from "./jaccard"
import { prereqOverlap } from "./prereq-overlap"
import {
  weaknessAlignment,
  type UserMastery,
} from "./weakness-alignment"
import { deficitBoost, type UserDeficit } from "./deficit-boost"

export const W = {
  ALPHA: 0.3, // jaccard signature
  BETA: 0.3, // cosine embedding
  GAMMA: 0.15, // prereq overlap
  DELTA: 0.15, // weakness alignment
  EPSILON: 0.1, // deficit boost
} as const

export interface ItemForRanking {
  id: string
  signature: string[] | null
  /** Pattern --contains--> Item 의 source patternIds. */
  patternIds: string[]
  /** patternIds 의 직접 prereq closure. */
  requiresPrereq: string[]
  /** pgvector cosine similarity (0~1). 후보가 cosine 1차 정렬에서 받은 값. */
  cosineSimilarity: number
}

export interface BaseForRanking {
  signature: string[] | null
  requiresPrereq: string[]
}

export type UserState = UserMastery & UserDeficit

export interface ScoreBreakdown {
  jac: number
  cos: number
  ovl: number
  wal: number
  dft: number
  total: number
}

export function rankScore(args: {
  item: ItemForRanking
  base: BaseForRanking
  user: UserState
}): ScoreBreakdown {
  const jac = jaccard(args.item.signature, args.base.signature)
  const cos = args.item.cosineSimilarity
  const ovl = prereqOverlap(args.item.requiresPrereq, args.base.requiresPrereq)
  const wal = weaknessAlignment({
    itemPatternIds: args.item.patternIds,
    user: args.user,
  })
  const dft = deficitBoost({
    itemRequiresPrereq: args.item.requiresPrereq,
    user: args.user,
  })

  const total =
    W.ALPHA * jac +
    W.BETA * cos +
    W.GAMMA * ovl +
    W.DELTA * wal +
    W.EPSILON * dft
  return { jac, cos, ovl, wal, dft, total }
}
