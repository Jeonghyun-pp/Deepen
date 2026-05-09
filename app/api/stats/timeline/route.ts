/**
 * GET /api/stats/timeline?days=14 — 일자별 풀이 카운트.
 * Spec: 03-api-contracts.md §8, 09-q3-build.md M3.5.
 *
 * Q3 단순화: type='attempts' 만 (recap/challenge 이벤트는 Q4 후속).
 */
import { and, eq, gte } from "drizzle-orm"
import { db } from "@/lib/db"
import { userItemHistory } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"
import type { StatsTimelineResponse } from "@/lib/api/schemas/stats"
import { isoDateInKst } from "@/lib/stats/time"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth(
  "GET /api/stats/timeline",
  async (request, { user }) => {
    const url = new URL(request.url)
    const daysParam = Number(url.searchParams.get("days") ?? "14")
    const days = Number.isFinite(daysParam)
      ? Math.max(1, Math.min(60, daysParam))
      : 14

    const since = new Date(Date.now() - days * 24 * 3600 * 1000)
    const rows = await db
      .select({
        resultHistory: userItemHistory.resultHistory,
      })
      .from(userItemHistory)
      .where(
        and(
          eq(userItemHistory.userId, user.id),
          gte(userItemHistory.lastSolvedAt, since),
        ),
      )

    const counts = new Map<string, number>()
    for (const r of rows) {
      const hist = (r.resultHistory ?? []) as Array<{ timestamp: string }>
      for (const h of hist) {
        const t = new Date(h.timestamp)
        if (t.getTime() < since.getTime()) continue
        const day = isoDateInKst(t)
        counts.set(day, (counts.get(day) ?? 0) + 1)
      }
    }

    const events = [...counts.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({
        date,
        type: "attempts" as const,
        count,
      }))

    return Response.json({ events } satisfies StatsTimelineResponse)
  },
)
