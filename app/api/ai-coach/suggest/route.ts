/**
 * POST /api/ai-coach/suggest — 5칩 라벨 응답.
 * Spec: docs/build-spec/03-api-contracts.md §3, B-4 시안 lock.
 *
 * Q1: 정적 카피만. 동적 customizing 은 M2+.
 *     API 형태는 미래 호환 위해 동일.
 *     ai_coach_calls 에 기록 X (실 LLM 호출 0).
 */

import { withAuth, apiError } from "@/lib/api/handler"
import {
  CoachSuggestRequest,
  type CoachSuggestResponse,
} from "@/lib/api/schemas/ai-coach"

export const runtime = "nodejs"

const STATIC_CHIPS: CoachSuggestResponse = {
  chips: [
    { key: "hint", label: "첫 한 줄 힌트" },
    { key: "definition", label: "이 용어 정의" },
    { key: "wrong_reason", label: "오답 풀이 근거" },
    { key: "unfold", label: "한 단계 더 펼치기" },
    { key: "variant", label: "같은 유형 다른 문제" },
  ],
}

export const POST = withAuth("POST /api/ai-coach/suggest", async (request) => {
  try {
    CoachSuggestRequest.parse(await request.json())
  } catch {
    return apiError.badRequest("validation_failed")
  }
  return Response.json(STATIC_CHIPS, { status: 200 })
})
