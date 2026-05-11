/**
 * AI 코치 UIMessage 타입 — AI SDK v6 / @ai-sdk/react v2.
 *
 * 서버가 send 하는 custom data part 3종:
 *   - data-card        (RecapCard 인서트, 비-transient → message.parts 에 누적)
 *   - data-card-error  (RecapCard 빌드 실패 알림, 비-transient)
 *   - data-highlight   (그래프 노드 강조, transient → onData 만)
 *   - data-similar     (비슷한 문제 추천, transient → onData 만)
 *
 * Spec: docs/build-spec/05-llm-prompts.md §1.
 */

import type { UIMessage } from "ai"
import type { RecapCardPayload } from "@/lib/api/schemas/recap"

export type CoachDataParts = {
  card: { card: RecapCardPayload; reason: string }
  "card-error": { patternId: string; reason: string }
  highlight: { nodeIds: string[] }
  similar: { patternId: string; count: number; items: { id: string }[] }
}

export type CoachUIMessage = UIMessage<unknown, CoachDataParts>
