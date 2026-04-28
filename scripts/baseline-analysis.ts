/**
 * Phase 0 — 노드 추출 품질 baseline 분석.
 *
 * 실행: npx tsx scripts/baseline-analysis.ts
 *
 * DB의 기존 데이터로 정량 지표 산출. 이후 개선(Layer 1~3) 효과 측정용
 * 회귀 베이스라인으로 재사용한다. 측정 항목:
 *   1) 문서별 노드 수 / chunk 수 / 페이지 수
 *   2) DF 분포 (1회성 노드 비율 = Layer 3 노이즈 시그널)
 *   3) 노드 라벨 길이 분포 (1~2자 한글 등)
 *   4) 노드 타입 분포
 *   5) DF 상위 30 (stop-word 후보)
 *   6) DF=1 샘플 30 (1회성 노이즈 샘플)
 *   7) 엣지 타입 분포
 *   8) 자동 진단 (red flag)
 */

import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })

const RED = "\x1b[31m"
const YELLOW = "\x1b[33m"
const GREEN = "\x1b[32m"
const DIM = "\x1b[2m"
const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

function pct(n: number, total: number): string {
  if (total === 0) return "0%"
  return `${((n / total) * 100).toFixed(1)}%`
}

function bar(value: number, max: number, width = 20): string {
  if (max === 0) return ""
  const filled = Math.round((value / max) * width)
  return "█".repeat(filled) + "░".repeat(width - filled)
}

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not set in .env.local")

  const sql = postgres(url, { prepare: false, max: 1 })

  try {
    console.log(`${BOLD}=== Phase 0 — Baseline Analysis ===${RESET}\n`)

    // ─────────────────────────────────────────────────────────────
    // 1) 문서 현황
    // ─────────────────────────────────────────────────────────────
    const docStatus = await sql<
      { status: string; count: number }[]
    >`SELECT status, COUNT(*)::int as count FROM documents GROUP BY status`

    console.log(`${BOLD}[1] 문서 상태${RESET}`)
    if (docStatus.length === 0) {
      console.log(`  ${DIM}(문서 없음 — 먼저 PDF 업로드 필요)${RESET}\n`)
      await sql.end()
      return
    }
    for (const r of docStatus) {
      console.log(`  ${r.status.padEnd(12)} ${r.count}`)
    }
    console.log()

    const readyDocs = await sql<
      {
        id: string
        title: string
        pageCount: number | null
        chunkCount: number
        textChunkCount: number
        nodeCount: number
        avgDf: number
      }[]
    >`
      SELECT
        d.id,
        d.title,
        d.page_count as "pageCount",
        (SELECT COUNT(*)::int FROM chunks WHERE document_id = d.id) as "chunkCount",
        (SELECT COUNT(*)::int FROM chunks WHERE document_id = d.id AND content_type = 'text') as "textChunkCount",
        (SELECT COUNT(DISTINCT cnm.node_id)::int
           FROM chunk_node_mappings cnm
           JOIN chunks c ON c.id = cnm.chunk_id
           WHERE c.document_id = d.id) as "nodeCount",
        COALESCE((
          SELECT AVG(df)::float FROM (
            SELECT COUNT(DISTINCT cnm.chunk_id) as df
            FROM chunk_node_mappings cnm
            JOIN chunks c ON c.id = cnm.chunk_id
            WHERE c.document_id = d.id
            GROUP BY cnm.node_id
          ) sub
        ), 0) as "avgDf"
      FROM documents d
      WHERE d.status = 'ready'
      ORDER BY d.created_at DESC
    `

    if (readyDocs.length === 0) {
      console.log(`${YELLOW}ready 상태인 문서가 없음. 분석 종료.${RESET}\n`)
      await sql.end()
      return
    }

    // ─────────────────────────────────────────────────────────────
    // 2) 문서별 추출 결과
    // ─────────────────────────────────────────────────────────────
    console.log(`${BOLD}[2] 문서별 추출 결과 (ready)${RESET}`)
    console.log(
      `  ${"id(8)".padEnd(10)}${"title".padEnd(30)}${"pages".padStart(7)}${"chunks".padStart(9)}${"text".padStart(7)}${"nodes".padStart(8)}${"n/p".padStart(7)}${"avgDF".padStart(8)}`
    )
    console.log("  " + "─".repeat(86))
    for (const d of readyDocs) {
      const title = (d.title ?? "").slice(0, 28).padEnd(30)
      const npp =
        d.pageCount && d.pageCount > 0
          ? (d.nodeCount / d.pageCount).toFixed(1)
          : "—"
      console.log(
        `  ${d.id.slice(0, 8).padEnd(10)}${title}` +
          `${(d.pageCount ?? "—").toString().padStart(7)}` +
          `${d.chunkCount.toString().padStart(9)}` +
          `${d.textChunkCount.toString().padStart(7)}` +
          `${d.nodeCount.toString().padStart(8)}` +
          `${npp.padStart(7)}` +
          `${d.avgDf.toFixed(2).padStart(8)}`
      )
    }
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 3) DF 분포 (전체 노드 기준)
    // ─────────────────────────────────────────────────────────────
    const dfDist = await sql<
      { df: number; count: number }[]
    >`
      SELECT df, COUNT(*)::int as count FROM (
        SELECT n.id, COUNT(DISTINCT cnm.chunk_id)::int as df
        FROM nodes n
        LEFT JOIN chunk_node_mappings cnm ON cnm.node_id = n.id
        GROUP BY n.id
      ) sub
      GROUP BY df
      ORDER BY df
    `

    const totalNodes = dfDist.reduce((s, r) => s + r.count, 0)
    const df1 = dfDist.find((r) => r.df === 1)?.count ?? 0
    const maxCount = Math.max(...dfDist.map((r) => r.count), 1)

    console.log(`${BOLD}[3] DF 분포 (chunk_node_mappings 기준)${RESET}`)
    console.log(`  ${DIM}DF = 한 노드가 매핑된 distinct chunk 수${RESET}`)
    for (const r of dfDist.slice(0, 10)) {
      const label = `DF=${r.df}`.padEnd(7)
      console.log(
        `  ${label}${bar(r.count, maxCount)} ${r.count.toString().padStart(5)} (${pct(r.count, totalNodes)})`
      )
    }
    if (dfDist.length > 10) {
      const rest = dfDist.slice(10).reduce((s, r) => s + r.count, 0)
      console.log(`  DF≥${dfDist[10].df}  ${rest} (${pct(rest, totalNodes)})`)
    }
    console.log(`  ${DIM}총 노드: ${totalNodes}${RESET}`)
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 4) 라벨 길이 분포
    // ─────────────────────────────────────────────────────────────
    const lenDist = await sql<
      { bucket: string; count: number }[]
    >`
      SELECT
        CASE
          WHEN char_length(label) <= 2 THEN '1-2 chars'
          WHEN char_length(label) <= 4 THEN '3-4 chars'
          WHEN char_length(label) <= 8 THEN '5-8 chars'
          WHEN char_length(label) <= 16 THEN '9-16 chars'
          WHEN char_length(label) <= 32 THEN '17-32 chars'
          ELSE '33+ chars'
        END as bucket,
        COUNT(*)::int as count
      FROM nodes
      GROUP BY 1
      ORDER BY MIN(char_length(label))
    `

    console.log(`${BOLD}[4] 라벨 길이 분포${RESET}`)
    const lenMax = Math.max(...lenDist.map((r) => r.count), 1)
    for (const r of lenDist) {
      console.log(
        `  ${r.bucket.padEnd(13)}${bar(r.count, lenMax)} ${r.count.toString().padStart(5)} (${pct(r.count, totalNodes)})`
      )
    }
    const shortLen = lenDist
      .filter((r) => r.bucket === "1-2 chars" || r.bucket === "3-4 chars")
      .reduce((s, r) => s + r.count, 0)
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 5) 노드 타입 분포
    // ─────────────────────────────────────────────────────────────
    const typeDist = await sql<
      { type: string; count: number }[]
    >`SELECT type, COUNT(*)::int as count FROM nodes GROUP BY type ORDER BY count DESC`

    console.log(`${BOLD}[5] 노드 타입 분포${RESET}`)
    const typeMax = Math.max(...typeDist.map((r) => r.count), 1)
    for (const r of typeDist) {
      console.log(
        `  ${r.type.padEnd(13)}${bar(r.count, typeMax)} ${r.count.toString().padStart(5)} (${pct(r.count, totalNodes)})`
      )
    }
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 6) DF 상위 30 (stop-word 후보)
    // ─────────────────────────────────────────────────────────────
    const topDf = await sql<
      { label: string; type: string; df: number }[]
    >`
      SELECT n.label, n.type::text as type, COUNT(DISTINCT cnm.chunk_id)::int as df
      FROM nodes n
      LEFT JOIN chunk_node_mappings cnm ON cnm.node_id = n.id
      GROUP BY n.id, n.label, n.type
      ORDER BY df DESC, n.label
      LIMIT 30
    `

    console.log(`${BOLD}[6] DF 상위 30 — stop-word / 일반어 의심 후보${RESET}`)
    console.log(`  ${DIM}여기서 "데이터", "방법", "예시" 같은 일반어가 보이면 stop-list 시그널${RESET}`)
    for (const r of topDf) {
      const label = (r.label ?? "").slice(0, 40).padEnd(40)
      console.log(`  DF=${r.df.toString().padStart(3)}  ${label}${DIM}[${r.type}]${RESET}`)
    }
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 7) DF=1 샘플 30 (1회성 노이즈 샘플)
    // ─────────────────────────────────────────────────────────────
    const df1Sample = await sql<
      { label: string; type: string }[]
    >`
      SELECT n.label, n.type::text as type
      FROM nodes n
      LEFT JOIN chunk_node_mappings cnm ON cnm.node_id = n.id
      GROUP BY n.id, n.label, n.type
      HAVING COUNT(DISTINCT cnm.chunk_id) = 1
      ORDER BY RANDOM()
      LIMIT 30
    `

    console.log(`${BOLD}[7] DF=1 노드 샘플 30 — 1회성 노이즈 의심${RESET}`)
    console.log(`  ${DIM}여기서 변수명/표기/일회성 단어가 많이 보이면 DF<2 컷오프 정당화${RESET}`)
    for (const r of df1Sample) {
      const label = (r.label ?? "").slice(0, 50).padEnd(50)
      console.log(`  ${label}${DIM}[${r.type}]${RESET}`)
    }
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 8) 엣지 타입 분포
    // ─────────────────────────────────────────────────────────────
    const edgeDist = await sql<
      { type: string; count: number }[]
    >`SELECT type, COUNT(*)::int as count FROM edges GROUP BY type ORDER BY count DESC`

    const totalEdges = edgeDist.reduce((s, r) => s + r.count, 0)
    console.log(`${BOLD}[8] 엣지 타입 분포${RESET}`)
    if (totalEdges === 0) {
      console.log(`  ${DIM}(엣지 없음)${RESET}`)
    } else {
      const eMax = Math.max(...edgeDist.map((r) => r.count), 1)
      for (const r of edgeDist) {
        console.log(
          `  ${r.type.padEnd(15)}${bar(r.count, eMax)} ${r.count.toString().padStart(5)} (${pct(r.count, totalEdges)})`
        )
      }
      console.log(
        `  ${DIM}edges/nodes = ${(totalEdges / Math.max(totalNodes, 1)).toFixed(2)}${RESET}`
      )
    }
    console.log()

    // ─────────────────────────────────────────────────────────────
    // 9) 자동 진단 — red flag
    // ─────────────────────────────────────────────────────────────
    console.log(`${BOLD}[9] 자동 진단${RESET}`)
    const diagnostics: { level: "ok" | "warn" | "bad"; msg: string }[] = []

    // (a) DF=1 비율
    const df1Pct = totalNodes > 0 ? (df1 / totalNodes) * 100 : 0
    if (df1Pct >= 40) {
      diagnostics.push({
        level: "bad",
        msg: `DF=1 노드가 ${df1Pct.toFixed(1)}% — Layer 3 노이즈 강함. DF<2 컷오프만으로도 ${df1} 개 제거 가능.`,
      })
    } else if (df1Pct >= 20) {
      diagnostics.push({
        level: "warn",
        msg: `DF=1 노드가 ${df1Pct.toFixed(1)}% — 1회성 노이즈 다수. 정의 임베딩 + LLM-Judge 단계가 효과적일 것.`,
      })
    } else {
      diagnostics.push({
        level: "ok",
        msg: `DF=1 노드가 ${df1Pct.toFixed(1)}% — 1회성 노이즈는 제한적.`,
      })
    }

    // (b) 페이지당 노드 수
    const docsWithPages = readyDocs.filter((d) => (d.pageCount ?? 0) > 0)
    if (docsWithPages.length > 0) {
      const avgNpp =
        docsWithPages.reduce(
          (s, d) => s + d.nodeCount / Math.max(d.pageCount ?? 1, 1),
          0
        ) / docsWithPages.length
      if (avgNpp >= 8) {
        diagnostics.push({
          level: "bad",
          msg: `페이지당 평균 노드 ${avgNpp.toFixed(1)} — 과생성 강한 시그널. Layer 1+2 손봐야.`,
        })
      } else if (avgNpp >= 4) {
        diagnostics.push({
          level: "warn",
          msg: `페이지당 평균 노드 ${avgNpp.toFixed(1)} — 과생성 의심. 동적 cap + Judge 효과 클 것.`,
        })
      } else {
        diagnostics.push({
          level: "ok",
          msg: `페이지당 평균 노드 ${avgNpp.toFixed(1)} — 노드 밀도 정상 범위.`,
        })
      }
    }

    // (c) 짧은 라벨 비율
    const shortPct = totalNodes > 0 ? (shortLen / totalNodes) * 100 : 0
    if (shortPct >= 25) {
      diagnostics.push({
        level: "bad",
        msg: `4자 이하 라벨 ${shortPct.toFixed(1)}% — 한국어 일반어/변수명 추출 의심. 길이 + stop-list 필요.`,
      })
    } else if (shortPct >= 12) {
      diagnostics.push({
        level: "warn",
        msg: `4자 이하 라벨 ${shortPct.toFixed(1)}% — 일부 노이즈. stop-list 단계 권장.`,
      })
    } else {
      diagnostics.push({
        level: "ok",
        msg: `4자 이하 라벨 ${shortPct.toFixed(1)}% — 길이 측면 양호.`,
      })
    }

    // (d) chunk-to-node 비율 (= 섹션 폭발 proxy)
    const totalChunks = readyDocs.reduce((s, d) => s + d.textChunkCount, 0)
    const totalDocNodes = readyDocs.reduce((s, d) => s + d.nodeCount, 0)
    if (totalChunks > 0) {
      const ratio = totalDocNodes / totalChunks
      if (ratio >= 0.5) {
        diagnostics.push({
          level: "bad",
          msg: `노드/text-chunk = ${ratio.toFixed(2)} — chunk당 ~0.5개 이상이면 섹션 폭발 시그널. Layer 1 (layout-aware parsing) 우선.`,
        })
      } else if (ratio >= 0.25) {
        diagnostics.push({
          level: "warn",
          msg: `노드/text-chunk = ${ratio.toFixed(2)} — 섹션 폭발 가능성. 섹션 fallback 빈도 점검 필요.`,
        })
      } else {
        diagnostics.push({
          level: "ok",
          msg: `노드/text-chunk = ${ratio.toFixed(2)} — 섹션 단위는 안정적.`,
        })
      }
    }

    for (const d of diagnostics) {
      const icon =
        d.level === "bad"
          ? `${RED}●${RESET}`
          : d.level === "warn"
            ? `${YELLOW}●${RESET}`
            : `${GREEN}●${RESET}`
      console.log(`  ${icon} ${d.msg}`)
    }
    console.log()

    console.log(`${BOLD}=== 끝 ===${RESET}`)
    console.log(
      `${DIM}이 출력을 그대로 분석에 보내면 됩니다. 다음 단계: 대표 문서 1~2개 골라 노드 30개 수동 분류 → precision 측정.${RESET}`
    )
  } finally {
    await sql.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
