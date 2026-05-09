/**
 * POST /api/cron/weekly-snapshot — 매주 토 23:00 KST.
 * Spec: 09-q3-build.md M3.5.
 *
 * 활성 사용자 (지난 30일 풀이) 의 patternState 를 pattern_state_snapshots 에 적재.
 * "지난 주 약점 N개" framing 의 truth source.
 */
import { db } from "@/lib/db"
import { checkCronAuth } from "@/lib/api/cron-auth"
import {
  getActiveUserIdsForSnapshot,
  isoDateInKst,
  writeSnapshot,
} from "@/lib/stats/aggregate"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function handle(request: Request) {
  const auth = checkCronAuth(request)
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 })
  }

  const snapshotDate = isoDateInKst(new Date())
  const userIds = await getActiveUserIdsForSnapshot(30)

  let users = 0
  let totalRows = 0
  for (const uid of userIds) {
    try {
      const n = await writeSnapshot(uid, snapshotDate)
      users++
      totalRows += n
    } catch (e) {
      console.warn(
        `[cron/weekly-snapshot] user=${uid} 실패`,
        (e as Error).message,
      )
    }
  }

  return Response.json({
    ok: true,
    snapshotDate,
    users,
    totalRows,
  })
}

export const GET = handle
export const POST = handle
