/**
 * 빈 상태 / 에러 카피 한 곳에.
 * Spec: docs/build-spec/12-acceptance.md (수동 QA 체크리스트), 메모리 한국어 톤.
 *
 * 톤 가이드:
 *   - 학생에게: 존댓말, 친근. "~할 수 있어요" "~해주세요"
 *   - 어드민/관리자에게: 간결, 명령조 OK. "확인 필요"
 *   - 에러는 학생 탓으로 들리지 않게. "잠시 후 다시" "곧 추가됩니다"
 *   - 내부 enum/code 노출 X (메모리 feedback 충실)
 */

export const COPY = {
  empty: {
    seedNotReady: "콘텐츠 시드 작업 중입니다 — 첫 풀이 가능 문제가 곧 추가됩니다.",
    noPatternsInUnit: "이 단원에는 아직 등록된 유형이 없어요.",
    noAttemptsYet: "아직 풀이 이력이 없어요. 첫 문제부터 시작해 보세요.",
    noQueueItems: "대기 중인 draft 가 없어요. PDF 를 업로드하면 자동으로 채워집니다.",
  },
  error: {
    network: "잠시 네트워크가 불안정했어요. 다시 시도해 주세요.",
    submit: "제출 실패. 잠시 후 다시 시도해 주세요.",
    coachUnavailable: "AI 코치가 일시적으로 동작하지 않아요. 곧 복구됩니다.",
    quotaExceeded:
      "AI 코치는 평생 5회까지 무료에요. Pro 업그레이드 시 일 30회 사용 가능.",
    recapBuildFailed: "리캡 카드를 만들지 못했어요. 다시 한 번 시도해 주세요.",
    notFound: "찾을 수 없어요. 이미 삭제됐거나 권한이 없을 수 있어요.",
    forbidden: "권한이 없는 화면이에요.",
    unauthorized: "로그인이 필요해요.",
    internal: "잠시 문제가 있었어요. 다시 시도해 주세요.",
  },
  cta: {
    retry: "다시 시도",
    goHome: "홈으로",
    contactAdmin: "관리자에게 문의",
    upgradePro: "Pro 보기",
  },
} as const

/**
 * HTTP status / error code → 학생 친화 카피 매핑.
 * 내부 enum 노출 금지 (feedback 메모리).
 */
export function errorCopyForCode(code: string | undefined): string {
  switch (code) {
    case "validation_failed":
      return "입력 값에 문제가 있어요. 다시 확인해 주세요."
    case "quota_exceeded":
      return COPY.error.quotaExceeded
    case "ai_coach_unavailable":
    case "llm_unavailable":
      return COPY.error.coachUnavailable
    case "item_not_found":
    case "node_not_found":
    case "edge_not_found":
      return COPY.error.notFound
    case "forbidden":
      return COPY.error.forbidden
    case "Unauthorized":
    case "unauthorized":
      return COPY.error.unauthorized
    case "would_create_cycle":
      return "선행 관계 사이클이 생겨요. 다른 노드를 선택해 주세요."
    case "edge_exists":
      return "이미 같은 엣지가 있어요."
    case "published_cannot_delete":
    case "published_cannot_discard":
      return "발행된 항목은 삭제할 수 없어요."
    case "missing_fields":
      return "필수 필드가 비어 있어요."
    case "network_error":
      return COPY.error.network
    default:
      return COPY.error.internal
  }
}
