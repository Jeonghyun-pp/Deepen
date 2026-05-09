/**
 * GET /api/admin/nodes/search — 어드민 노드 검색.
 * Spec: 시드 화면 EdgeSection autocomplete.
 *
 * 매칭:
 *   - q 가 빈 문자열이면 최근 N개 (createdAt DESC)
 *   - q 가 있으면 label·grade·itemSource 부분 매칭 (ILIKE %q%)
 *   - type 필터 옵션 (prerequisite=pattern, contains=item)
 *   - status 'any' 기본 (draft 도 prereq 후보로 등록 가능)
 *   - excludeId: 자기 자신 제외
 */

import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAdmin, apiError } from "@/lib/api/handler"
import {
  NodeSearchRequest,
  type NodeSearchHitDto,
  type NodeSearchResponse,
} from "@/lib/api/schemas/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const toHit = (n: typeof nodes.$inferSelect): NodeSearchHitDto => ({
  id: n.id,
  type: n.type,
  label: n.label,
  grade: n.grade,
  displayLayer: n.displayLayer,
  itemSource: n.itemSource,
  itemNumber: n.itemNumber,
  status: n.status,
})

export const GET = withAdmin("GET /api/admin/nodes/search", async (request) => {
  const url = new URL(request.url)
  const parsed = NodeSearchRequest.safeParse({
    q: url.searchParams.get("q") ?? "",
    type: url.searchParams.get("type") ?? undefined,
    status: url.searchParams.get("status") ?? "any",
    excludeId: url.searchParams.get("excludeId") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 10),
  })
  if (!parsed.success) return apiError.badRequest("validation_failed")
  const { q, type, status, excludeId, limit } = parsed.data

  const term = q.trim()
  const wildcardQ = term ? `%${term}%` : null

  const conditions = []
  if (type) conditions.push(eq(nodes.type, type))
  if (status !== "any") conditions.push(eq(nodes.status, status))
  if (excludeId) conditions.push(ne(nodes.id, excludeId))
  if (wildcardQ) {
    conditions.push(
      or(
        ilike(nodes.label, wildcardQ),
        ilike(nodes.grade, wildcardQ),
        ilike(nodes.itemSource, wildcardQ),
      )!,
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // ranking: 정확히 prefix 일치 > label 매칭 > 기타. 단순 ORDER BY 로.
  const rows = await db
    .select()
    .from(nodes)
    .where(whereClause)
    .orderBy(
      // 정확 일치(label = q)면 가장 위로 — 단순 expression
      term
        ? sql`CASE WHEN LOWER(${nodes.label}) = LOWER(${term}) THEN 0
                   WHEN LOWER(${nodes.label}) LIKE LOWER(${term + "%"}) THEN 1
                   ELSE 2 END`
        : asc(sql`1`),
      desc(nodes.status), // published 가 alphabetical 로 'd' 보다 뒤 — published 우선이려면 ASC; 그러나 status text 'draft'<'published' 알파벳. 'published' 우선 위해 DESC
      desc(nodes.createdAt),
    )
    .limit(limit)

  const response: NodeSearchResponse = { hits: rows.map(toHit) }
  return Response.json(response, { status: 200 })
})
