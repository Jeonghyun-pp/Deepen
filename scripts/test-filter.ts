/**
 * Phase 1 (a) — 정규식 필터 검증 (DB 변경 없음).
 *
 * 실행: npx tsx scripts/test-filter.ts
 *
 * 기존 DB 의 ready 문서 노드에 filter-nodes.ts 를 적용해서
 * "필터가 켜져 있었다면 무엇이 제거됐을까" 를 시뮬한다.
 * 한국어 + 영어 문서 모두 검증해서 다국어 안전성 확인.
 */

import { config } from "dotenv"
import postgres from "postgres"
import { filterNoiseNodes } from "../lib/pipeline/filter-nodes"

config({ path: ".env.local" })

const RED = "\x1b[31m"
const DIM = "\x1b[2m"
const BOLD = "\x1b[1m"
const RESET = "\x1b[0m"

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set")
  const sql = postgres(url, { prepare: false, max: 1 })

  try {
    const docs = await sql<
      { id: string; title: string; pageCount: number | null }[]
    >`
      SELECT id, title, page_count as "pageCount"
      FROM documents
      WHERE status = 'ready'
      ORDER BY created_at DESC
    `

    if (docs.length === 0) {
      console.log("ready 문서 없음")
      return
    }

    console.log(`${BOLD}=== Phase 1 (a) 정규식 필터 검증 ===${RESET}\n`)

    let totalBefore = 0
    let totalAfter = 0
    let totalRemoved = 0

    for (const doc of docs) {
      const nodes = await sql<
        {
          label: string
          type: string
          tldr: string | null
          chunkOrdinals: number[]
          df: number
        }[]
      >`
        SELECT
          n.label,
          n.type::text as type,
          n.tldr,
          ARRAY[]::int[] as "chunkOrdinals",
          COUNT(DISTINCT cnm.chunk_id)::int as df
        FROM nodes n
        JOIN chunk_node_mappings cnm ON cnm.node_id = n.id
        JOIN chunks c ON c.id = cnm.chunk_id
        WHERE c.document_id = ${doc.id}
        GROUP BY n.id, n.label, n.type, n.tldr
        ORDER BY df DESC, n.label
      `

      const asExtracted = nodes.map((n) => ({
        label: n.label,
        type: n.type as "concept" | "technique" | "application" | "question",
        tldr: n.tldr ?? "",
        chunkOrdinals: n.chunkOrdinals,
      }))

      const result = filterNoiseNodes(asExtracted)

      console.log(`${BOLD}[${doc.title}]${RESET} (${doc.pageCount ?? "?"}p)`)
      console.log(
        `  before: ${nodes.length}  →  after: ${result.kept.length}  ${RED}-${result.removed.length}${RESET} (${((result.removed.length / Math.max(nodes.length, 1)) * 100).toFixed(1)}%)`
      )

      if (result.removed.length > 0) {
        const byReason = new Map<string, typeof result.removed>()
        for (const r of result.removed) {
          const arr = byReason.get(r.reason) ?? []
          arr.push(r)
          byReason.set(r.reason, arr)
        }
        for (const [reason, items] of byReason) {
          console.log(`  ${DIM}└ ${reason}${RESET}`)
          for (const item of items) {
            console.log(`     ${RED}✗${RESET} ${item.node.label}`)
          }
        }
      } else {
        console.log(`  ${DIM}(제거된 노드 없음)${RESET}`)
      }
      console.log()

      totalBefore += nodes.length
      totalAfter += result.kept.length
      totalRemoved += result.removed.length
    }

    // 종합
    console.log(`${BOLD}=== 종합 ===${RESET}`)
    console.log(`총 노드 (before): ${totalBefore}`)
    console.log(
      `총 노드 (after):  ${totalAfter}  ${RED}-${totalRemoved}${RESET} (${((totalRemoved / Math.max(totalBefore, 1)) * 100).toFixed(1)}%)`
    )
    console.log()
    console.log(
      `${DIM}다음 단계: 제거된 노드가 모두 진짜 노이즈인지 사용자가 확인.${RESET}`
    )
    console.log(
      `${DIM}false-positive(진짜 개념인데 제거됨)이 있으면 패턴 조정 필요.${RESET}`
    )
    console.log(
      `${DIM}없으면 → process-document.ts 에 wire-in 진행.${RESET}`
    )
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
