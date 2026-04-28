/**
 * Week 2 파이프라인 오케스트레이터.
 *
 * 흐름:
 *   documents.status: uploaded → parsing → extracting → ready | failed
 *
 * Stage 1 (parsePdf) 실패는 치명적 — 분모가 부정확해지므로 failed로 종료.
 * Stage 3 (LLM) 실패는 섹션 단위로 격리되어 warning만 남기고 계속 진행.
 */

import { eq, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  chunks as chunksTable,
  documents,
  nodes as nodesTable,
  edges as edgesTable,
  chunkNodeMappings,
} from "@/lib/db/schema"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parsePdf, type RawChunk } from "./parse-pdf"
import { groupSections } from "./group-sections"
import {
  extractNodesFromSections,
  EXTRACT_MODEL,
  type ExtractedNode,
  type ExtractedEdge,
} from "./extract-nodes"
import { filterNoiseNodes } from "./filter-nodes"
import { findFuzzyMatch, normalizeLabel } from "./dedup"
import { recordTokenUsage } from "@/lib/db/token-usage"

export interface ProcessResult {
  documentId: string
  totalPages: number
  totalChunks: number
  totalNodes: number
  failedSections: number
}

async function setStatus(
  documentId: string,
  status: "parsing" | "extracting" | "ready" | "failed",
  errorMessage?: string
) {
  await db
    .update(documents)
    .set({
      status,
      errorMessage: errorMessage ?? null,
    })
    .where(eq(documents.id, documentId))
}

/**
 * Storage에서 PDF를 받아 Stage 1~3를 돌린다. 호출자는 await하지 않고
 * fire-and-forget으로 쓴다 — 에러는 내부에서 status=failed로 기록한다.
 */
export async function processDocument(
  documentId: string,
  userId: string,
  storagePath: string
): Promise<ProcessResult | null> {
  try {
    await setStatus(documentId, "parsing")

    // 1) Storage에서 PDF 다운로드 (service_role admin client)
    const admin = createSupabaseAdminClient()
    const { data: blob, error: dlError } = await admin.storage
      .from("documents")
      .download(storagePath)
    if (dlError || !blob) {
      throw new Error(`storage download: ${dlError?.message ?? "no blob"}`)
    }
    const buffer = new Uint8Array(await blob.arrayBuffer())

    // 2) Stage 1
    const parsed = await parsePdf(buffer)
    await db
      .update(documents)
      .set({ pageCount: parsed.totalPages })
      .where(eq(documents.id, documentId))

    // chunks insert — ordinal은 parse-pdf가 이미 매김
    const insertedChunks = await insertChunks(
      documentId,
      userId,
      parsed.chunks
    )
    const chunkIdByOrdinal = new Map(
      insertedChunks.map((c) => [c.ordinal, c.id])
    )

    // 3) Stage 2
    const sections = groupSections(parsed.chunks)

    await setStatus(documentId, "extracting")

    // 4) Stage 3
    let failedSections = 0
    const {
      results: sectionResults,
      edgeResults: sectionEdges,
      totalUsage,
    } = await extractNodesFromSections(sections)
    for (const res of sectionResults) if (res.length === 0) failedSections++

    await recordTokenUsage({
      userId,
      source: "extract_nodes",
      model: EXTRACT_MODEL,
      promptTokens: totalUsage.promptTokens,
      completionTokens: totalUsage.completionTokens,
      meta: { documentId, sectionCount: sections.length },
    })

    // 5) DB insert: nodes + mappings
    const allExtracted: ExtractedNode[] = sectionResults.flat()

    // 5a) Stage 3.5 — 정규식 노이즈 필터 (변수·공식 표기·금액 예시 제거)
    const { kept: cleanExtracted, removed: filteredOut } =
      filterNoiseNodes(allExtracted)
    if (filteredOut.length > 0) {
      console.log(
        `[processDocument ${documentId}] regex filter: ${allExtracted.length} → ${cleanExtracted.length} (-${filteredOut.length})`
      )
    }

    const { insertedCount: totalNodes, resolvedIdByKey } =
      await insertNodesAndMappings(userId, cleanExtracted, chunkIdByOrdinal)

    // 6) Tier 1 엣지: LLM이 같은 섹션 안에서 뽑은 prerequisite / contains
    await insertTypedEdges(userId, sectionEdges, resolvedIdByKey)

    // 7) Tier 0 엣지: 같은 chunk에 공출현한 노드 쌍 → relatedTo
    //    LLM 호출 0. chunk_node_mappings 스캔만. Tier 1 이후에 돌려서
    //    prerequisite/contains 로 이미 연결된 쌍은 중복 생성 안 함.
    await insertCooccurrenceEdges(userId, documentId)

    await setStatus(documentId, "ready")

    return {
      documentId,
      totalPages: parsed.totalPages,
      totalChunks: parsed.chunks.length,
      totalNodes,
      failedSections,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[processDocument] ${documentId} failed:`, msg)
    await setStatus(documentId, "failed", msg).catch(() => {})
    return null
  }
}

async function insertChunks(
  documentId: string,
  userId: string,
  raw: RawChunk[]
) {
  if (raw.length === 0) return []
  const rows = await db
    .insert(chunksTable)
    .values(
      raw.map((c) => ({
        userId,
        documentId,
        ordinal: c.ordinal,
        pageStart: c.pageStart,
        pageEnd: c.pageEnd,
        content: c.content,
        contentType: c.contentType,
      }))
    )
    .returning({ id: chunksTable.id, ordinal: chunksTable.ordinal })
  return rows
}

async function insertNodesAndMappings(
  userId: string,
  extracted: ExtractedNode[],
  chunkIdByOrdinal: Map<number, string>
): Promise<{ insertedCount: number; resolvedIdByKey: Map<string, string> }> {
  if (extracted.length === 0) {
    return { insertedCount: 0, resolvedIdByKey: new Map() }
  }

  // 1) 업로드 내부 dedup: 정규화된 label + Levenshtein ≤ 2 (길이 ≥ 5)
  const internalByKey = new Map<string, ExtractedNode>()
  for (const n of extracted) {
    const norm = normalizeLabel(n.label)
    const match = findFuzzyMatch(norm, internalByKey.keys())
    if (match) {
      internalByKey.get(match)!.chunkOrdinals.push(...n.chunkOrdinals)
    } else {
      internalByKey.set(norm, { ...n, chunkOrdinals: [...n.chunkOrdinals] })
    }
  }

  // 2) DB 기존 노드와도 fuzzy 매칭 — 매칭되면 insert skip, 기존 id에 mapping만 추가
  const existing = await db
    .select({ id: nodesTable.id, label: nodesTable.label })
    .from(nodesTable)
    .where(eq(nodesTable.userId, userId))
  const existingByKey = new Map<string, string>()
  for (const e of existing) {
    existingByKey.set(normalizeLabel(e.label), e.id)
  }

  const toInsert: ExtractedNode[] = []
  const resolvedIdByKey = new Map<string, string>() // normalized key → nodeId (기존 또는 신규)

  for (const [key, node] of internalByKey) {
    const match = findFuzzyMatch(key, existingByKey.keys())
    if (match) {
      resolvedIdByKey.set(key, existingByKey.get(match)!)
    } else {
      toInsert.push(node)
    }
  }

  // 3) 신규만 insert
  if (toInsert.length > 0) {
    const created = await db
      .insert(nodesTable)
      .values(
        toInsert.map((n) => ({
          userId,
          label: n.label.trim(),
          type: n.type,
          content: "",
          tldr: n.tldr,
        }))
      )
      .returning({ id: nodesTable.id, label: nodesTable.label })

    for (let i = 0; i < toInsert.length; i++) {
      resolvedIdByKey.set(normalizeLabel(toInsert[i].label), created[i].id)
    }
  }

  // 4) mappings — 같은 chunk+node pair 중복 제거
  const mappings: { chunkId: string; nodeId: string; userId: string }[] = []
  const seen = new Set<string>()
  for (const [key, node] of internalByKey) {
    const nodeId = resolvedIdByKey.get(key)
    if (!nodeId) continue
    for (const ord of new Set(node.chunkOrdinals)) {
      const chunkId = chunkIdByOrdinal.get(ord)
      if (!chunkId) continue
      const pairKey = `${chunkId}::${nodeId}`
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      mappings.push({ chunkId, nodeId, userId })
    }
  }
  if (mappings.length > 0) {
    await db
      .insert(chunkNodeMappings)
      .values(mappings)
      .onConflictDoNothing()
  }

  return { insertedCount: toInsert.length, resolvedIdByKey }
}

/**
 * LLM이 뽑은 섹션별 엣지(prerequisite / contains) 를 DB에 insert.
 * label → nodeId 매핑은 insertNodesAndMappings 에서 받은 resolvedIdByKey 사용.
 * 같은 (source, target, type) 쌍은 dedup.
 */
async function insertTypedEdges(
  userId: string,
  sectionEdges: ExtractedEdge[][],
  resolvedIdByKey: Map<string, string>
): Promise<void> {
  const seen = new Set<string>()
  const rows: {
    userId: string
    sourceNodeId: string
    targetNodeId: string
    type: "prerequisite" | "contains"
    weight: number
    label: null
    note: null
  }[] = []

  for (const edges of sectionEdges) {
    if (!edges) continue
    for (const e of edges) {
      const source = resolvedIdByKey.get(normalizeLabel(e.from))
      const target = resolvedIdByKey.get(normalizeLabel(e.to))
      if (!source || !target || source === target) continue
      const key = `${source}::${target}::${e.type}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        userId,
        sourceNodeId: source,
        targetNodeId: target,
        type: e.type,
        weight: 0.8,
        label: null,
        note: null,
      })
    }
  }

  if (rows.length === 0) return

  // 기존 edges와 중복 제거
  const existing = await db
    .select({
      source: edgesTable.sourceNodeId,
      target: edgesTable.targetNodeId,
      type: edgesTable.type,
    })
    .from(edgesTable)
    .where(eq(edgesTable.userId, userId))
  const existingKey = new Set(
    existing.map((e) => `${e.source}::${e.target}::${e.type}`)
  )

  const toInsert = rows.filter(
    (r) => !existingKey.has(`${r.sourceNodeId}::${r.targetNodeId}::${r.type}`)
  )
  if (toInsert.length === 0) return

  const BATCH = 500
  for (let i = 0; i < toInsert.length; i += BATCH) {
    await db.insert(edgesTable).values(toInsert.slice(i, i + BATCH))
  }
}

/**
 * 같은 chunk에 같이 매핑된 노드 쌍에 relatedTo 엣지를 만든다.
 *
 * 비용 특성: LLM 호출 0. 방금 업로드된 문서의 chunks에 속한 노드들만 대상으로
 * 하고, DB 레벨에서 pair 집계 후 (source<target 정규화) bulk insert한다.
 * 동일 user의 기존 relatedTo 엣지와는 UNIQUE 없이 별도 row. 중복 호출
 * 방지는 (source,target,type) 3-튜플로 자체 dedup.
 *
 * 가중치: 공출현 chunk 수를 log 스케일로 0~1 구간에 사상. 1번만 공출현은
 * weight ~0.3, 5번 이상은 1.0에 수렴.
 */
async function insertCooccurrenceEdges(
  userId: string,
  documentId: string
): Promise<void> {
  const pairs = await db.execute<{
    a: string
    b: string
    co_count: number
  }>(sql`
    with doc_chunks as (
      select id from chunks where document_id = ${documentId}
    ),
    pairs as (
      select
        least(m1.node_id, m2.node_id)::uuid as a,
        greatest(m1.node_id, m2.node_id)::uuid as b,
        count(*)::int as co_count
      from chunk_node_mappings m1
      join chunk_node_mappings m2
        on m1.chunk_id = m2.chunk_id
       and m1.node_id < m2.node_id
      where m1.chunk_id in (select id from doc_chunks)
        and m1.user_id = ${userId}
        and m2.user_id = ${userId}
      group by 1, 2
    )
    select a, b, co_count from pairs
  `)

  const rows = (pairs as unknown as { a: string; b: string; co_count: number }[])
  if (!rows || rows.length === 0) return

  // 이미 존재하는 relatedTo 엣지(양방향 모두) 조회 후 제외
  const existing = await db
    .select({
      source: edgesTable.sourceNodeId,
      target: edgesTable.targetNodeId,
    })
    .from(edgesTable)
    .where(eq(edgesTable.userId, userId))
  const existingKey = new Set<string>()
  for (const e of existing) {
    existingKey.add(`${e.source}::${e.target}`)
    existingKey.add(`${e.target}::${e.source}`)
  }

  const toInsert = rows
    .filter((p) => !existingKey.has(`${p.a}::${p.b}`))
    .map((p) => ({
      userId,
      sourceNodeId: p.a,
      targetNodeId: p.b,
      type: "relatedTo" as const,
      weight: Math.min(1, 0.3 + Math.log1p(p.co_count) * 0.4),
      note: null,
      label: null,
    }))

  if (toInsert.length === 0) return

  // 큰 배치는 분할 insert (Postgres 파라미터 한계 안전)
  const BATCH = 500
  for (let i = 0; i < toInsert.length; i += BATCH) {
    await db.insert(edgesTable).values(toInsert.slice(i, i + BATCH))
  }
}
