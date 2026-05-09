/**
 * GET /api/stats/overview — 대시보드 4 카드 데이터.
 * Spec: 03-api-contracts.md §8, 09-q3-build.md M3.5.
 *
 * 동일 집계가 보호자 리포트와 공유. lib/stats/aggregate.buildOverview 호출.
 */
import { withAuth } from "@/lib/api/handler"
import { buildOverview } from "@/lib/stats/aggregate"
import type { StatsOverviewResponse } from "@/lib/api/schemas/stats"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth(
  "GET /api/stats/overview",
  async (_request, { user }) => {
    const overview = await buildOverview(user.id)
    return Response.json(overview satisfies StatsOverviewResponse)
  },
)
