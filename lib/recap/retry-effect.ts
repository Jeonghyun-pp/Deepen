/**
 * Retry 효과 측정 — M3.2.
 * Spec: 09-q3-build.md M3.2 (재도전 결과의 recap 효과 측정).
 *
 * mode='retry' 로 풀이 제출 시:
 *   1) recapPatternIds 각각의 latest prereq_deficit_log 의 deficit_probability = before
 *   2) BN 재실행 (현재 itemId 기준, 같은 cumulative map)
 *   3) recapPatternIds ∩ cumulative 만 추출 = after
 *   4) prereq_deficit_log 에 (after, evidenceCount + 1) row 신규 insert
 *   5) effect = before - after (양수 = 결손 메워짐) 반환 → UI 에 노출
 *
 * Q3 단순화: BN 은 재호출만, 분리된 single-pattern re-run 은 안 함 (DAG 작은 전제).
 */
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes, prereqDeficitLog } from "@/lib/db/schema"
import { runBN } from "./bn-inference"
import type { RetryEffect } from "@/lib/api/schemas/attempts"

export async function measureRetryEffect(args: {
  userId: string
  triggerItemId: string
  recapPatternIds: string[]
}): Promise<RetryEffect[]> {
  if (args.recapPatternIds.length === 0) return []

  // 1) before — patternId 별 latest log row
  const beforeRows = await db
    .select({
      patternId: prereqDeficitLog.patternId,
      deficitProbability: prereqDeficitLog.deficitProbability,
      evidenceCount: prereqDeficitLog.evidenceCount,
      createdAt: prereqDeficitLog.createdAt,
    })
    .from(prereqDeficitLog)
    .where(
      and(
        eq(prereqDeficitLog.userId, args.userId),
        inArray(prereqDeficitLog.patternId, args.recapPatternIds),
      ),
    )
    .orderBy(desc(prereqDeficitLog.createdAt))

  const beforeByPattern = new Map<
    string,
    { prob: number; evidence: number }
  >()
  for (const r of beforeRows) {
    if (!beforeByPattern.has(r.patternId)) {
      beforeByPattern.set(r.patternId, {
        prob: r.deficitProbability,
        evidence: r.evidenceCount,
      })
    }
  }

  // 2) BN 재실행
  const bn = await runBN({
    userId: args.userId,
    currentItemId: args.triggerItemId,
  })

  // 3) Pattern label 한 번에 조회 (UI 용)
  const labels = await db
    .select({ id: nodes.id, label: nodes.label })
    .from(nodes)
    .where(inArray(nodes.id, args.recapPatternIds))
  const labelByPattern = new Map(labels.map((r) => [r.id, r.label]))

  // 4) 신규 row insert + effect 산출
  const effects: RetryEffect[] = []
  const insertRows: Array<typeof prereqDeficitLog.$inferInsert> = []

  for (const pid of args.recapPatternIds) {
    const before = beforeByPattern.get(pid)
    const after =
      bn.immediate.find((x) => x.patternId === pid)?.prob ??
      bn.cumulative.get(pid) ??
      before?.prob ??
      0.5
    const beforeProb = before?.prob ?? 0.5

    effects.push({
      patternId: pid,
      patternLabel: labelByPattern.get(pid) ?? "",
      deficitBefore: beforeProb,
      deficitAfter: after,
      delta: beforeProb - after,
    })

    insertRows.push({
      userId: args.userId,
      patternId: pid,
      triggerItemId: args.triggerItemId,
      deficitProbability: after,
      evidenceCount: (before?.evidence ?? 0) + 1,
    })
  }

  if (insertRows.length > 0) {
    try {
      await db.insert(prereqDeficitLog).values(insertRows)
    } catch (e) {
      console.warn("[retry-effect] prereq_deficit_log insert 실패", e)
    }
  }

  return effects
}
