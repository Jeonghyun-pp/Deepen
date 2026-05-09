/**
 * POST /api/recap/diagnose — 결손 진단.
 * Spec: docs/build-spec/03-api-contracts.md §4.
 */

import { withAuth, apiError } from "@/lib/api/handler"
import {
  RecapDiagnoseRequest,
  type RecapDiagnoseResponse,
} from "@/lib/api/schemas/recap"
import { diagnose } from "@/lib/recap/diagnose"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/recap/diagnose",
  async (request, { user }) => {
    let body: ReturnType<typeof RecapDiagnoseRequest.parse>
    try {
      body = RecapDiagnoseRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    const diagnosis = await diagnose({
      userId: user.id,
      currentItemId: body.currentItemId,
    })

    const response: RecapDiagnoseResponse = {
      recapNeeded: diagnosis.recapNeeded,
      candidates: diagnosis.candidates.map((c) => ({
        patternId: c.patternId,
        patternLabel: c.patternLabel,
        grade: c.grade,
        deficitProb: c.deficitProb,
      })),
    }

    return Response.json(response, { status: 200 })
  },
)
