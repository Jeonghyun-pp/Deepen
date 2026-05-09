/**
 * POST /api/recap/quiz/submit — 리캡카드 확인 퀴즈 제출.
 * Spec: docs/build-spec/03-api-contracts.md §4.
 *
 * Q1 단순화: 단답 비교 (trim + 대소문자 무시).
 *           expected='_open_' 이면 항상 통과 (서술형 fallback 카드용).
 *           복잡한 채점은 M2.3+ AI 평가로.
 */

import { withAuth, apiError } from "@/lib/api/handler"
import {
  RecapQuizSubmitRequest,
  type RecapQuizSubmitResponse,
} from "@/lib/api/schemas/recap"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\.,;:!?'"`~()\[\]{}<>]/g, "")

export const POST = withAuth(
  "POST /api/recap/quiz/submit",
  async (request) => {
    let body: ReturnType<typeof RecapQuizSubmitRequest.parse>
    try {
      body = RecapQuizSubmitRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    const expected = body.expectedAnswer
    const correct =
      expected === "_open_"
        ? body.userAnswer.trim().length > 0
        : norm(expected) === norm(body.userAnswer)

    const response: RecapQuizSubmitResponse = {
      correct,
      hint: correct ? undefined : "한 줄 더 떠올려 보세요.",
    }
    return Response.json(response, { status: 200 })
  },
)
