/**
 * POST /api/recommend/next — 다음 Item 추천 (mode 분기).
 * Spec: 03-api-contracts.md §5, 04-algorithms.md §4.1·§4.2, 09-q3-build.md M3.2.
 *
 * mode:
 *   - 'practice'  → pickPracticeDefault (excludeItemId 와 다른 1개)
 *   - 'challenge' → pickChallengeItem (targetPatternId + difficultyAnchor)
 *   - 'retry'     → pickRetryItem (storedRetryItemId 강제)
 *
 * exam/recovery 는 자체 라우트 사용 (M2.5 batch). 본 라우트로 들어오면 fallback
 * 으로 practice 와 동일하게 처리.
 */
import { withAuth, apiError } from "@/lib/api/handler"
import {
  NextRecommendRequest,
  type NextRecommendResponse,
} from "@/lib/api/schemas/recommend"
import {
  pickChallengeItem,
  pickPracticeDefault,
  pickRankedNextForPractice,
  pickRetryItem,
} from "@/lib/recommend/policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const POST = withAuth(
  "POST /api/recommend/next",
  async (request, { user }) => {
    let body: NextRecommendRequest
    try {
      body = NextRecommendRequest.parse(await request.json())
    } catch {
      return apiError.badRequest("validation_failed")
    }

    // M3.3: practice + baseItemId 면 ranked. base 임베딩 없으면 default fallback.
    if (body.mode === "practice" && body.baseItemId) {
      const ranked = await pickRankedNextForPractice({
        userId: user.id,
        baseItemId: body.baseItemId,
        excludeItemId: body.excludeItemId,
      })
      if (ranked) {
        const r: NextRecommendResponse = {
          itemId: ranked.itemId,
          reason: "ranked",
          difficulty: ranked.difficulty,
          scoreBreakdown: ranked.scoreBreakdown,
        }
        return Response.json(r, { status: 200 })
      }
      // 아래 default fallback 으로 fall-through
    }

    let pick: Awaited<ReturnType<typeof pickPracticeDefault>>

    if (body.mode === "challenge") {
      pick = await pickChallengeItem({
        userId: user.id,
        targetPatternId: body.targetPatternId!,
        difficultyAnchor: body.difficultyAnchor,
      })
    } else if (body.mode === "retry") {
      pick = await pickRetryItem({
        userId: user.id,
        storedRetryItemId: body.storedRetryItemId!,
      })
    } else {
      pick = await pickPracticeDefault({
        userId: user.id,
        excludeItemId: body.excludeItemId,
      })
    }

    const response: NextRecommendResponse = {
      itemId: pick?.itemId ?? null,
      reason: pick?.reason ?? null,
      difficulty: pick?.difficulty ?? null,
    }
    return Response.json(response, { status: 200 })
  },
)
