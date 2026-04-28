/**
 * 한 문서의 노드 전체 리스트 출력 (수동 TP/FP 분류용).
 *
 * 실행:
 *   npx tsx scripts/list-doc-nodes.ts                # 기본: 재무관리
 *   npx tsx scripts/list-doc-nodes.ts "Innovation"   # title 부분 매치
 *
 * 출력: DF 내림차순. tldr 짧게 포함. 사용자가 [✓]/[✗] 표시.
 */

import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })

const titleQuery = process.argv[2] ?? "재무관리"

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
      WHERE title ILIKE ${"%" + titleQuery + "%"} AND status = 'ready'
      ORDER BY created_at DESC
    `
    if (docs.length === 0) {
      console.log(`매칭 문서 없음 (query="${titleQuery}")`)
      return
    }
    if (docs.length > 1) {
      console.log(`매칭 문서 ${docs.length}개:`)
      for (const d of docs) console.log(`  ${d.id.slice(0, 8)}  ${d.title}`)
      console.log(`\n→ 첫 번째 사용\n`)
    }
    const doc = docs[0]

    const nodes = await sql<
      {
        label: string
        type: string
        tldr: string | null
        df: number
      }[]
    >`
      SELECT
        n.label,
        n.type::text as type,
        n.tldr,
        COUNT(DISTINCT cnm.chunk_id)::int as df
      FROM nodes n
      JOIN chunk_node_mappings cnm ON cnm.node_id = n.id
      JOIN chunks c ON c.id = cnm.chunk_id
      WHERE c.document_id = ${doc.id}
      GROUP BY n.id, n.label, n.type, n.tldr
      ORDER BY df DESC, lower(n.label)
    `

    console.log(`# ${doc.title}  (${doc.pageCount ?? "?"}p, ${nodes.length} nodes)`)
    console.log(``)
    console.log(`표기: [✓] = 이 단원의 핵심 개념 (TP)`)
    console.log(`      [✗] = 노이즈/일반어/표기/예시 (FP)`)
    console.log(`      [?] = 애매 — 코멘트 추가`)
    console.log(``)
    console.log(`────────────────────────────────────────────────────────────────`)

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const idx = (i + 1).toString().padStart(3, " ")
      const dfStr = `DF=${n.df}`.padEnd(6)
      const typeStr = n.type === "technique" ? "[TECH]" : "[CONC]"
      const tldr = n.tldr
        ? ` — ${n.tldr.replace(/\s+/g, " ").slice(0, 60)}`
        : ""
      console.log(`[ ] ${idx}. ${dfStr} ${typeStr} ${n.label}${tldr}`)
    }

    console.log(``)
    console.log(`────────────────────────────────────────────────────────────────`)
    console.log(`총 ${nodes.length} 노드. 분류 완료 후 결과 공유하면 precision/recall 산출.`)
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
