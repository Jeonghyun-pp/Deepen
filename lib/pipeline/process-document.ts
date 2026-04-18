/**
 * Week 2 파이프라인 오케스트레이터.
 *
 * 흐름:
 *   documents.status: uploaded → parsing → extracting → ready | failed
 *
 * Stage 1 (parsePdf) 실패는 치명적 — 분모가 부정확해지므로 failed로 종료.
 * Stage 3 (LLM) 실패는 섹션 단위로 격리되어 warning만 남기고 계속 진행.
 */

import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  chunks as chunksTable,
  documents,
  nodes as nodesTable,
  chunkNodeMappings,
} from "@/lib/db/schema"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { parsePdf, type RawChunk } from "./parse-pdf"
import { groupSections } from "./group-sections"
import { extractNodesFromSections, type ExtractedNode } from "./extract-nodes"

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
    const sectionResults = await extractNodesFromSections(sections)
    for (const res of sectionResults) if (res.length === 0) failedSections++

    // 5) DB insert: nodes + mappings
    const allExtracted: ExtractedNode[] = sectionResults.flat()
    const totalNodes = await insertNodesAndMappings(
      userId,
      allExtracted,
      chunkIdByOrdinal
    )

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
): Promise<number> {
  if (extracted.length === 0) return 0

  // 같은 userId 범위 내 label 중복 단순 dedup (Stage 4는 B 스코프에서 제외 — naive 매칭만)
  const byLabel = new Map<string, ExtractedNode>()
  for (const n of extracted) {
    const key = n.label.trim().toLowerCase()
    if (!byLabel.has(key)) {
      byLabel.set(key, n)
    } else {
      // chunkOrdinals만 합쳐 놓고 나중에 mappings로 반영
      byLabel.get(key)!.chunkOrdinals.push(...n.chunkOrdinals)
    }
  }

  const unique = [...byLabel.values()]

  const created = await db
    .insert(nodesTable)
    .values(
      unique.map((n) => ({
        userId,
        label: n.label.trim(),
        type: n.type,
        content: "",
        tldr: n.tldr,
      }))
    )
    .returning({ id: nodesTable.id, label: nodesTable.label })

  // mappings — 같은 chunk+node pair 중복 제거
  const mappings: { chunkId: string; nodeId: string; userId: string }[] = []
  const seen = new Set<string>()
  for (let i = 0; i < unique.length; i++) {
    const node = unique[i]
    const nodeId = created[i].id
    for (const ord of new Set(node.chunkOrdinals)) {
      const chunkId = chunkIdByOrdinal.get(ord)
      if (!chunkId) continue
      const key = `${chunkId}::${nodeId}`
      if (seen.has(key)) continue
      seen.add(key)
      mappings.push({ chunkId, nodeId, userId })
    }
  }
  if (mappings.length > 0) {
    await db
      .insert(chunkNodeMappings)
      .values(mappings)
      .onConflictDoNothing()
  }

  return unique.length
}
