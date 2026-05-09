/**
 * POST /api/recap/build-card — Anthropic tool_use 로 RecapCard 1장 생성.
 * Spec: docs/build-spec/03-api-contracts.md §4, 05-llm-prompts.md §3.
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { patternState } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  RecapBuildCardRequest,
  type RecapBuildCardResponse,
} from "@/lib/api/schemas/recap"
import { buildRecapCard } from "@/lib/recap/build-card"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/recap/build-card",
  async (request, { user }) => {
    let body: ReturnType<typeof RecapBuildCardRequest.parse>
    try {
      body = RecapBuildCardRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    const [stateRow] = await db
      .select({ theta: patternState.theta })
      .from(patternState)
      .where(
        and(
          eq(patternState.userId, user.id),
          eq(patternState.patternId, body.patternId),
        ),
      )
      .limit(1)

    const userTheta = stateRow?.theta ?? 0.5

    const card = await buildRecapCard({
      userId: user.id,
      patternId: body.patternId,
      triggerItemId: body.currentItemId,
      userTheta,
    })

    const response: RecapBuildCardResponse = { card }
    return Response.json(response, { status: 200 })
  },
)
