/**
 * POST /api/ocr — 풀이 PNG → 단계 추출 + LCS 정렬 + errorKind 분류.
 * Spec: docs/build-spec/03-api-contracts.md §6, 04-algorithms.md §7.
 */

import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { nodes } from "@/lib/db/schema"
import { withAuth, apiError } from "@/lib/api/handler"
import {
  OcrRequest,
  type OcrResponse,
  type AlignedStep,
} from "@/lib/api/schemas/ocr"
import { extractSteps } from "@/lib/ocr/extract-steps"
import { alignLCS, jaroWinkler } from "@/lib/ocr/align-lcs"
import { classifyUnmatchedSteps } from "@/lib/ocr/classify-step-error"
import { splitCanonicalSteps } from "@/lib/ocr/canonical-steps"
import { recordAiCall } from "@/lib/ai-coach/quota"
import { features } from "@/lib/env"
import { EXPORT_MAX_BYTES } from "@/lib/pencil/tools-config"
import { base64ByteSize } from "@/lib/pencil/export-png"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth("POST /api/ocr", async (request, { user }) => {
  if (!features.aiCoach) {
    return Response.json(
      { error: "llm_unavailable", reason: "ANTHROPIC_API_KEY 미설정" },
      { status: 503 },
    )
  }

  let body: ReturnType<typeof OcrRequest.parse>
  try {
    body = OcrRequest.parse(await request.json())
  } catch {
    return apiError.badRequest("validation_failed")
  }

  // 4MB cap (spec acceptance)
  const bytes = base64ByteSize(body.imageBase64)
  if (bytes > EXPORT_MAX_BYTES) {
    return Response.json(
      { error: "image_too_large", bytes, max: EXPORT_MAX_BYTES },
      { status: 413 },
    )
  }

  const startedAt = Date.now()

  // Item 조회 (canonical solution)
  const [item] = await db
    .select({ id: nodes.id, itemSolution: nodes.itemSolution })
    .from(nodes)
    .where(
      and(
        eq(nodes.id, body.itemId),
        eq(nodes.type, "item"),
        eq(nodes.status, "published"),
      ),
    )
    .limit(1)

  if (!item) return apiError.notFound("item_not_found")

  const canonicalSteps = splitCanonicalSteps(item.itemSolution)

  // Vision OCR
  const extracted = await extractSteps({ imageBase64: body.imageBase64 })

  // 토큰 기록 (Vision)
  void recordAiCall({
    userId: user.id,
    itemId: body.itemId,
    callType: "classify",
    promptTokens: extracted.inputTokens,
    completionTokens: extracted.outputTokens,
  })

  const userStepTexts = extracted.steps
    .filter((s) => s.type !== "note")
    .map((s) => s.text.trim())
    .filter(Boolean)

  // LCS 정렬
  const { aligned, unmatchedUserIdxs } = alignLCS({
    userSteps: userStepTexts,
    canonicalSteps,
  })

  // unmatched user step 들에 errorKind 분류 (Haiku)
  if (unmatchedUserIdxs.length > 0 && canonicalSteps.length > 0) {
    const items = unmatchedUserIdxs.map((idx) => {
      const userStep = userStepTexts[idx]
      // 가장 가까운 canonical step
      let best = { step: canonicalSteps[0] ?? "", sim: 0 }
      for (const c of canonicalSteps) {
        const s = jaroWinkler(userStep, c)
        if (s > best.sim) best = { step: c, sim: s }
      }
      return {
        userStep,
        nearestCanonicalStep: best.step || null,
        cosineSim: best.sim,
      }
    })
    const classifications = await classifyUnmatchedSteps(items)

    // aligned row 에 errorKind merge — userText 기준 매핑
    for (let i = 0; i < unmatchedUserIdxs.length; i++) {
      const cls = classifications[i]
      if (!cls) continue
      const userStep = userStepTexts[unmatchedUserIdxs[i]]
      for (const row of aligned) {
        if (row.userText === userStep && !row.errorKind) {
          row.errorKind = cls.errorKind
          if (cls.suggestion) row.suggestion = cls.suggestion
          break
        }
      }
    }
  }

  // Vision step type 정보를 row 에 merge
  for (const row of aligned as AlignedStep[]) {
    if (!row.userText) continue
    const src = extracted.steps.find((s) => s.text.trim() === row.userText)
    if (src) row.type = src.type
  }

  const response: OcrResponse = {
    steps: aligned,
    overallConfidence: extracted.overallConfidence,
    processingTimeMs: Date.now() - startedAt,
  }
  return Response.json(response, { status: 200 })
})
