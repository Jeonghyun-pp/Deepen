/**
 * pgvector cosine 검색 — M3.3.
 * Spec: 04-algorithms.md §4.4.
 *
 * `text_embedding <=> $1::vector` = cosine distance (0 = identical, 2 = opposite).
 * similarity = 1 - distance.
 *
 * ivfflat probes 는 default 1 — recall 높이려면 SET ivfflat.probes = 10 호출.
 * 본 프로젝트는 노드 풀이 작아 default 로 충분.
 */
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import type { NodeForEmbed } from "./embed-node"

export interface CosineCandidate {
  id: string
  label: string
  signature: string[] | null
  itemDifficulty: number | null
  similarity: number
}

/**
 * baseId 의 임베딩으로 cosine 유사도 top-k Item 검색.
 * baseId 자기 자신은 제외. status='published' + type='item' 만.
 */
export async function searchSimilarItems(
  baseId: string,
  k: number,
): Promise<CosineCandidate[]> {
  const rows = (await db.execute(sql`
    WITH base AS (
      SELECT text_embedding AS emb FROM nodes WHERE id = ${baseId}
    )
    SELECT
      n.id,
      n.label,
      n.signature,
      n.item_difficulty AS "itemDifficulty",
      1 - (n.text_embedding <=> base.emb) AS similarity
    FROM nodes n, base
    WHERE n.text_embedding IS NOT NULL
      AND n.type = 'item'
      AND n.status = 'published'
      AND n.id <> ${baseId}
      AND base.emb IS NOT NULL
    ORDER BY n.text_embedding <=> base.emb
    LIMIT ${k}
  `)) as unknown as Array<{
    id: string
    label: string
    signature: unknown
    itemDifficulty: number | null
    similarity: number
  }>

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    signature: (r.signature as string[] | null) ?? null,
    itemDifficulty: r.itemDifficulty,
    similarity: Number(r.similarity ?? 0),
  }))
}

/**
 * 임의 임베딩 벡터로 직접 검색 — practice 모드 weakness alignment 용.
 */
export async function searchByEmbedding(
  vec: number[],
  k: number,
  excludeIds: string[] = [],
): Promise<CosineCandidate[]> {
  if (vec.length === 0) return []
  const literal = `[${vec.join(",")}]`
  const exclude =
    excludeIds.length > 0
      ? sql` AND n.id NOT IN (${sql.join(
          excludeIds.map((id) => sql`${id}`),
          sql`, `,
        )})`
      : sql``

  const rows = (await db.execute(sql`
    SELECT
      n.id,
      n.label,
      n.signature,
      n.item_difficulty AS "itemDifficulty",
      1 - (n.text_embedding <=> ${literal}::vector) AS similarity
    FROM nodes n
    WHERE n.text_embedding IS NOT NULL
      AND n.type = 'item'
      AND n.status = 'published'
      ${exclude}
    ORDER BY n.text_embedding <=> ${literal}::vector
    LIMIT ${k}
  `)) as unknown as Array<{
    id: string
    label: string
    signature: unknown
    itemDifficulty: number | null
    similarity: number
  }>

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    signature: (r.signature as string[] | null) ?? null,
    itemDifficulty: r.itemDifficulty,
    similarity: Number(r.similarity ?? 0),
  }))
}

/**
 * 노드 풀 (ID 배열) 안에서만 cosine 정렬. 후처리 reranking 단계 후보 풀 좁히기.
 */
export async function searchSimilarWithinPool(
  baseId: string,
  poolIds: string[],
  k: number,
): Promise<CosineCandidate[]> {
  if (poolIds.length === 0) return []
  const rows = (await db.execute(sql`
    WITH base AS (
      SELECT text_embedding AS emb FROM nodes WHERE id = ${baseId}
    )
    SELECT
      n.id,
      n.label,
      n.signature,
      n.item_difficulty AS "itemDifficulty",
      1 - (n.text_embedding <=> base.emb) AS similarity
    FROM nodes n, base
    WHERE n.id IN (${sql.join(
      poolIds.map((id) => sql`${id}`),
      sql`, `,
    )})
      AND n.text_embedding IS NOT NULL
      AND base.emb IS NOT NULL
    ORDER BY n.text_embedding <=> base.emb
    LIMIT ${k}
  `)) as unknown as Array<{
    id: string
    label: string
    signature: unknown
    itemDifficulty: number | null
    similarity: number
  }>

  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    signature: (r.signature as string[] | null) ?? null,
    itemDifficulty: r.itemDifficulty,
    similarity: Number(r.similarity ?? 0),
  }))
}

export type { NodeForEmbed }
