/**
 * GET /api/units/list — 단원 list.
 * Q1: published Pattern·Item 카운트 합계로 단일 단원만 반환.
 */

import { count, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAuth } from "@/lib/api/handler"
import type { UnitListResponse } from "@/lib/api/schemas/units"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const GET = withAuth("GET /api/units/list", async () => {
  const [patternCount] = await db
    .select({ value: count() })
    .from(nodes)
    .where(eq(nodes.type, "pattern"))

  const [itemCount] = await db
    .select({ value: count() })
    .from(nodes)
    .where(eq(nodes.type, "item"))

  const response: UnitListResponse = {
    units: [
      {
        key: "default",
        label: "수학Ⅱ · 미분/적분",
        patternCount: Number(patternCount?.value ?? 0),
        itemCount: Number(itemCount?.value ?? 0),
      },
    ],
  }
  return Response.json(response, { status: 200 })
})
