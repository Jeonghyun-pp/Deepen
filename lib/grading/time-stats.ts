/**
 * Item 별 평균/표준편차 풀이 시간 — cohort 데이터에서 집계.
 *
 * Spec: docs/build-spec/04-algorithms.md §1.2.
 *
 * 입력: user_item_history.result_history 의 모든 timeMs.
 * 출력: { meanMs, stdMs }. 표본 N < COHORT_MIN_N 이면 fallback 사용.
 *
 * 성능 메모: result_history 가 jsonb 배열이라 SQL 측에서 jsonb_array_elements
 * 로 풀어내는 게 정석이지만, Q1 데이터량(수학Ⅱ 미분/적분 cohort)에서는 row
 * 단위 fetch 후 JS aggregate 로 충분. 향후 항목 수가 1만+ 가 되면
 * SQL aggregate 로 옮긴다.
 */

import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { userItemHistory, nodes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import {
  COHORT_MIN_N,
  fallbackTimeStat,
  type ItemTimeStat,
} from "./score"

interface AggregatedTimes {
  values: number[]
}

async function fetchTimeMs(itemId: string): Promise<AggregatedTimes> {
  // jsonb_array_elements 로 row 별로 펼친 후 timeMs 추출.
  const rows = await db.execute<{ time_ms: string | number | null }>(sql`
    SELECT (rh -> 'signals' ->> 'timeMs')::numeric AS time_ms
    FROM ${userItemHistory},
         jsonb_array_elements(${userItemHistory.resultHistory}) AS rh
    WHERE ${userItemHistory.itemId} = ${itemId}
  `)

  const values: number[] = []
  for (const row of rows) {
    if (row.time_ms === null || row.time_ms === undefined) continue
    const n = Number(row.time_ms)
    if (!Number.isFinite(n) || n <= 0) continue
    values.push(n)
  }
  return { values }
}

export function meanStd(values: number[]): { mean: number; std: number } {
  const n = values.length
  if (n === 0) return { mean: 0, std: 0 }
  const mean = values.reduce((a, b) => a + b, 0) / n
  if (n === 1) return { mean, std: 0 }
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1)
  return { mean, std: Math.sqrt(variance) }
}

/**
 * itemId 의 cohort 풀이 시간 평균/표준편차. N 부족 시 difficulty fallback.
 */
export async function getItemTimeStat(itemId: string): Promise<ItemTimeStat> {
  const { values } = await fetchTimeMs(itemId)

  if (values.length >= COHORT_MIN_N) {
    const { mean, std } = meanStd(values)
    return { meanMs: mean, stdMs: Math.max(std, 1) }
  }

  // fallback: item.itemDifficulty 사용
  const [item] = await db
    .select({ itemDifficulty: nodes.itemDifficulty })
    .from(nodes)
    .where(eq(nodes.id, itemId))
    .limit(1)

  return fallbackTimeStat(item?.itemDifficulty ?? null)
}
