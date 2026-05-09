/**
 * 노드 임베딩 텍스트 조립 + 일괄 처리 — M3.3.
 * Spec: 04-algorithms.md §4.4 (입력 텍스트 lock).
 *
 * 입력 텍스트:  `${label}\n\n${signature.join(', ')}\n\n${content.slice(0, 2000)}`
 */
import { eq, inArray, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { embedTexts } from "./openai-client"

export interface NodeForEmbed {
  id: string
  label: string
  signature: string[] | null
  content: string
}

const CONTENT_TRUNCATE = 2000

export function composeEmbeddingInput(node: NodeForEmbed): string {
  const sig = (node.signature ?? []).join(", ")
  const head = node.label
  const body = (node.content ?? "").slice(0, CONTENT_TRUNCATE)
  return `${head}\n\n${sig}\n\n${body}`
}

/** 임베딩 부여 — N개 노드 batch. 결과는 nodes.text_embedding 에 기록. */
export async function embedNodesById(nodeIds: string[]): Promise<{
  embedded: number
  promptTokens: number
}> {
  if (nodeIds.length === 0) return { embedded: 0, promptTokens: 0 }

  const rows = await db
    .select({
      id: nodes.id,
      label: nodes.label,
      signature: nodes.signature,
      content: nodes.content,
    })
    .from(nodes)
    .where(inArray(nodes.id, nodeIds))

  if (rows.length === 0) return { embedded: 0, promptTokens: 0 }

  const inputs = rows.map((r) =>
    composeEmbeddingInput({
      id: r.id,
      label: r.label,
      signature: (r.signature as string[] | null) ?? null,
      content: r.content ?? "",
    }),
  )

  const { vectors, promptTokens } = await embedTexts(inputs)

  // pgvector array literal: '[0.1,0.2,...]'
  for (let i = 0; i < rows.length; i++) {
    const v = vectors[i]
    if (!v) continue
    const literal = `[${v.join(",")}]`
    await db
      .update(nodes)
      .set({ textEmbedding: sql`${literal}::vector` })
      .where(eq(nodes.id, rows[i].id))
  }

  return { embedded: rows.length, promptTokens }
}
