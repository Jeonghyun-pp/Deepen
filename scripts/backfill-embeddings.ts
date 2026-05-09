/**
 * Backfill 스크립트 — M3.3.
 * Spec: 09-q3-build.md M3.3.
 *
 * 모든 published 노드 중 text_embedding NULL 인 것을 batch=100 단위로 embed.
 * text-embedding-3-large @ 1536 dim. OpenAI API rate limit 3000 RPM 충분.
 *
 * 실행:  npm run backfill:embeddings
 */
import { config } from "dotenv"

config({ path: ".env.local" })

if (!process.env.OPENAI_API_KEY) {
  console.error("[backfill] OPENAI_API_KEY 미설정 — abort.")
  process.exit(1)
}
if (!process.env.DATABASE_URL) {
  console.error("[backfill] DATABASE_URL 미설정 — abort.")
  process.exit(1)
}

// dotenv 로드 후 import (env 의존)
const { db } = await import("../lib/db")
const { sql } = await import("drizzle-orm")
const { embedNodesById } = await import("../lib/embeddings/embed-node")

async function main() {
  const t0 = Date.now()
  let totalEmbedded = 0
  let totalTokens = 0
  let round = 0

  while (true) {
    round++
    const rows = (await db.execute(sql`
      SELECT id FROM nodes_pending_embedding ORDER BY created_at ASC LIMIT 100
    `)) as unknown as Array<{ id: string }>

    if (rows.length === 0) {
      console.log(`[backfill] 완료. round=${round - 1}`)
      break
    }

    const ids = rows.map((r) => r.id)
    const start = Date.now()
    try {
      const r = await embedNodesById(ids)
      totalEmbedded += r.embedded
      totalTokens += r.promptTokens
      const dt = Date.now() - start
      console.log(
        `[backfill] round=${round} embedded=${r.embedded} tokens=${r.promptTokens} took=${dt}ms`,
      )
    } catch (e) {
      console.error(`[backfill] round=${round} 실패:`, (e as Error).message)
      break
    }
  }

  const seconds = ((Date.now() - t0) / 1000).toFixed(1)
  // text-embedding-3-large: $0.13 / 1M tokens
  const costUsd = (totalTokens / 1_000_000) * 0.13
  console.log(
    `[backfill] embedded=${totalEmbedded} tokens=${totalTokens} cost~$${costUsd.toFixed(4)} (${seconds}s)`,
  )

  // ANALYZE 권장 — ivfflat plan 갱신
  await db.execute(sql`ANALYZE nodes`)
  console.log("[backfill] ANALYZE nodes 완료")

  process.exit(0)
}

main().catch((e) => {
  console.error("[backfill] uncaught:", e)
  process.exit(1)
})
