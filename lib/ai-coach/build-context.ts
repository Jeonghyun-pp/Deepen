/**
 * 코치 컨텍스트 builder — XML 블록 (Anthropic 권장).
 * Spec: docs/build-spec/05-llm-prompts.md §1 Context block.
 *
 * Q1 단순화:
 *   - 직접 prereq 만 (깊이 1).
 *   - 최근 5 attempt.
 *   - itemSolution 은 200 자로 truncate.
 */

import { and, eq, inArray } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  edges,
  nodes,
  patternState,
  userItemHistory,
  type AttemptResult,
} from "@/lib/db/schema"

interface BuildContextArgs {
  userId: string
  itemId: string
  /** 5칩 중 하나를 누른 경우. 없으면 'free_input'. */
  chipKey?: string
}

const RECENT_ATTEMPT_LIMIT = 5

const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

function pickRecentAttempts(
  histories: { resultHistory: AttemptResult[] }[],
): AttemptResult[] {
  const all = histories.flatMap((h) => h.resultHistory ?? [])
  all.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  return all.slice(0, RECENT_ATTEMPT_LIMIT)
}

export async function buildCoachContext(args: BuildContextArgs): Promise<{
  contextXml: string
  patternIds: string[]
}> {
  // 1) Item
  const [item] = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      itemAnswer: nodes.itemAnswer,
      itemChoices: nodes.itemChoices,
      itemSolution: nodes.itemSolution,
      itemDifficulty: nodes.itemDifficulty,
    })
    .from(nodes)
    .where(and(eq(nodes.id, args.itemId), eq(nodes.type, "item")))
    .limit(1)

  if (!item) throw new Error("item_not_found")

  // 2) Pattern (--contains-->)
  const itemPatterns = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      grade: nodes.grade,
      signature: nodes.signature,
    })
    .from(edges)
    .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
    .where(
      and(
        eq(edges.targetNodeId, args.itemId),
        eq(edges.type, "contains"),
        eq(nodes.type, "pattern"),
      ),
    )

  const patternIds = itemPatterns.map((p) => p.id)

  // 3) 직접 prereq + 사용자 마스터리
  const prereqRows =
    patternIds.length > 0
      ? await db
          .select({
            id: nodes.id,
            label: nodes.label,
            grade: nodes.grade,
          })
          .from(edges)
          .innerJoin(nodes, eq(nodes.id, edges.sourceNodeId))
          .where(
            and(
              inArray(edges.targetNodeId, patternIds),
              eq(edges.type, "prerequisite"),
              eq(nodes.type, "pattern"),
            ),
          )
      : []

  const prereqIds = [...new Set(prereqRows.map((p) => p.id))]

  const masteryRows =
    prereqIds.length > 0
      ? await db
          .select({ patternId: patternState.patternId, theta: patternState.theta })
          .from(patternState)
          .where(
            and(
              eq(patternState.userId, args.userId),
              inArray(patternState.patternId, prereqIds),
            ),
          )
      : []

  const masteryByPattern = new Map(
    masteryRows.map((m) => [m.patternId, m.theta]),
  )

  // 4) 최근 5 attempts
  const histories = await db
    .select({ resultHistory: userItemHistory.resultHistory })
    .from(userItemHistory)
    .where(eq(userItemHistory.userId, args.userId))
    .limit(50)

  const recent = pickRecentAttempts(
    histories as { resultHistory: AttemptResult[] }[],
  )

  // 5) XML 조립
  const lines: string[] = []
  lines.push("<problem>")
  lines.push(`  <id>${escapeXml(item.id)}</id>`)
  lines.push(`  <text>${escapeXml(item.label)}</text>`)
  if (item.itemChoices) {
    const choices = (item.itemChoices as string[]) ?? []
    lines.push(`  <choices>${escapeXml(choices.join(" | "))}</choices>`)
  }
  if (item.itemAnswer) lines.push(`  <answer>${escapeXml(item.itemAnswer)}</answer>`)
  if (item.itemSolution) {
    lines.push(
      `  <solution>${escapeXml(item.itemSolution.slice(0, 1500))}</solution>`,
    )
  }
  if (item.itemDifficulty !== null && item.itemDifficulty !== undefined) {
    lines.push(`  <difficulty>${item.itemDifficulty.toFixed(2)}</difficulty>`)
  }
  lines.push("</problem>")
  lines.push("")

  if (itemPatterns.length > 0) {
    lines.push("<patterns>")
    for (const p of itemPatterns) {
      lines.push("  <pattern>")
      lines.push(`    <id>${escapeXml(p.id)}</id>`)
      lines.push(`    <name>${escapeXml(p.label)}</name>`)
      if (p.grade) lines.push(`    <grade>${escapeXml(p.grade)}</grade>`)
      const sig = (p.signature as string[] | null) ?? []
      if (sig.length) {
        lines.push(`    <signature>${escapeXml(sig.join(", "))}</signature>`)
      }
      lines.push("  </pattern>")
    }
    lines.push("</patterns>")
    lines.push("")
  }

  if (prereqRows.length > 0) {
    lines.push("<prereq_chain>")
    const seen = new Set<string>()
    for (const p of prereqRows) {
      if (seen.has(p.id)) continue
      seen.add(p.id)
      const theta = masteryByPattern.get(p.id) ?? 0.5
      lines.push("  <prereq>")
      lines.push(`    <id>${escapeXml(p.id)}</id>`)
      lines.push(`    <name>${escapeXml(p.label)}</name>`)
      if (p.grade) lines.push(`    <grade>${escapeXml(p.grade)}</grade>`)
      lines.push(`    <user_mastery>${theta.toFixed(2)}</user_mastery>`)
      lines.push("  </prereq>")
    }
    lines.push("</prereq_chain>")
    lines.push("")
  }

  if (recent.length > 0) {
    lines.push("<user_history>")
    for (const a of recent) {
      lines.push("  <attempt>")
      lines.push(`    <label>${a.label}</label>`)
      if (a.reasonTags.length) {
        lines.push(
          `    <reason_tags>${escapeXml(a.reasonTags.join(", "))}</reason_tags>`,
        )
      }
      lines.push(`    <time_z>${a.signals.timeZ.toFixed(1)}</time_z>`)
      lines.push(`    <hints>${a.signals.hintsUsed}</hints>`)
      const agoMin = Math.max(
        0,
        Math.floor((Date.now() - new Date(a.timestamp).getTime()) / 60000),
      )
      lines.push(`    <ago_min>${agoMin}</ago_min>`)
      lines.push("  </attempt>")
    }
    lines.push("</user_history>")
    lines.push("")
  }

  lines.push(`<chip>${escapeXml(args.chipKey ?? "free_input")}</chip>`)

  return { contextXml: lines.join("\n"), patternIds }
}
