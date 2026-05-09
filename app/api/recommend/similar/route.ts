/**
 * POST /api/recommend/similar — base Item 의 cosine 유사 + 가중합 reranking.
 * Spec: 03-api-contracts.md §5, 04-algorithms.md §4.3·§4.4, 09-q3-build.md M3.3.
 *
 * 흐름:
 *   1) base Item 메타 조회 (signature, patternIds, requiresPrereq, embedding 존재 여부)
 *   2) pgvector cosine top-50 (RAW_K)
 *   3) 후보 enrich (signature, patternIds, requiresPrereq)
 *   4) 사용자 mastery + deficit 로드
 *   5) rankScore 가중합 → 상위 k
 *
 * embedding 누락 시 embeddingMissing=true + items=[] (백필 필요 안내).
 */
import { withAuth, apiError } from "@/lib/api/handler"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { nodes } from "@/lib/db/schema"
import {
  SimilarRequest,
  type SimilarResponse,
} from "@/lib/api/schemas/recommend"
import { searchSimilarItems } from "@/lib/embeddings/cosine-search"
import { enrichItems, loadUserState } from "@/lib/recommend/enrich"
import { rankScore } from "@/lib/recommend/score"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const RAW_K = 50

export const POST = withAuth(
  "POST /api/recommend/similar",
  async (request, { user }) => {
    let body: SimilarRequest
    try {
      body = SimilarRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // 1) base 의 임베딩 존재 확인
    const [baseRow] = await db
      .select({
        id: nodes.id,
        embedding: nodes.textEmbedding,
        type: nodes.type,
      })
      .from(nodes)
      .where(eq(nodes.id, body.itemId))
      .limit(1)
    if (!baseRow) return apiError.notFound("item_not_found")
    if (baseRow.type !== "item") {
      return apiError.badRequest("not_an_item")
    }
    if (!baseRow.embedding) {
      const empty: SimilarResponse = {
        baseItemId: body.itemId,
        items: [],
        embeddingMissing: true,
      }
      return Response.json(empty, { status: 200 })
    }

    // 2) cosine top-50
    const candidates = await searchSimilarItems(body.itemId, RAW_K)
    if (candidates.length === 0) {
      const empty: SimilarResponse = {
        baseItemId: body.itemId,
        items: [],
        embeddingMissing: false,
      }
      return Response.json(empty, { status: 200 })
    }

    // 3) enrich (base + candidates 한 번에)
    const enrichIds = [body.itemId, ...candidates.map((c) => c.id)]
    const enriched = await enrichItems(enrichIds)
    const base = enriched.get(body.itemId)
    if (!base) {
      return Response.json(
        {
          baseItemId: body.itemId,
          items: [],
          embeddingMissing: false,
        } satisfies SimilarResponse,
        { status: 200 },
      )
    }

    // 4) user state
    const userState = await loadUserState(user.id)

    // 5) rank
    const ranked = candidates
      .map((c) => {
        const meta = enriched.get(c.id)
        if (!meta) return null
        const breakdown = rankScore({
          item: {
            id: c.id,
            signature: meta.signature,
            patternIds: meta.patternIds,
            requiresPrereq: meta.requiresPrereq,
            cosineSimilarity: c.similarity,
          },
          base: {
            signature: base.signature,
            requiresPrereq: base.requiresPrereq,
          },
          user: userState,
        })
        return {
          itemId: c.id,
          label: c.label,
          similarity: c.similarity,
          rankScore: breakdown.total,
          difficulty: c.itemDifficulty,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, body.k)

    const response: SimilarResponse = {
      baseItemId: body.itemId,
      items: ranked,
      embeddingMissing: false,
    }
    return Response.json(response, { status: 200 })
  },
)
