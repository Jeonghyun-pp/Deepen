/**
 * POST /api/cron/embed-items — 매시간 신규 publish 노드 임베딩.
 * Spec: 03-api-contracts.md §14, 09-q3-build.md M3.3.
 *
 * 인증: Authorization: Bearer ${CRON_SECRET} (Vercel Cron 또는 외부 cron).
 *      또는 GET 호출도 허용 (Vercel Cron 은 GET).
 *
 * 동작: nodes_pending_embedding view 에서 batch=100 단위 임베딩.
 *      한 번 호출에 max 5 batch (=500 노드). 그 이상은 다음 라운드.
 */
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { embedNodesById } from "@/lib/embeddings/embed-node"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_BATCHES_PER_INVOCATION = 5
const BATCH_SIZE = 100

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 })
}

async function handle(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get("authorization") ?? ""
    if (!auth.startsWith("Bearer ") || auth.slice(7) !== cronSecret) {
      return unauthorized()
    }
  }
  // CRON_SECRET 미설정 시 dev/staging 만 허용
  else if (process.env.NODE_ENV === "production") {
    return unauthorized()
  }

  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY 미설정" },
      { status: 503 },
    )
  }

  let totalEmbedded = 0
  let totalTokens = 0
  let batchesRun = 0

  for (let i = 0; i < MAX_BATCHES_PER_INVOCATION; i++) {
    const rows = (await db.execute(sql`
      SELECT id FROM nodes_pending_embedding ORDER BY created_at ASC LIMIT ${BATCH_SIZE}
    `)) as unknown as Array<{ id: string }>

    if (rows.length === 0) break
    try {
      const r = await embedNodesById(rows.map((row) => row.id))
      totalEmbedded += r.embedded
      totalTokens += r.promptTokens
      batchesRun++
    } catch (e) {
      return Response.json(
        {
          ok: false,
          embedded: totalEmbedded,
          tokens: totalTokens,
          batchesRun,
          error: (e as Error).message,
        },
        { status: 500 },
      )
    }
  }

  // text-embedding-3-large: $0.13 / 1M tokens
  const costUsd = (totalTokens / 1_000_000) * 0.13

  return Response.json({
    ok: true,
    embedded: totalEmbedded,
    tokens: totalTokens,
    costUsd: Number(costUsd.toFixed(6)),
    batchesRun,
  })
}

export const GET = handle
export const POST = handle
