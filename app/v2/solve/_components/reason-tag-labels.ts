/**
 * 내부 reason_tag enum → 학생용 한국어 라벨.
 *
 * 메모리 feedback (내부 분류 체계 노출 금지) — raw enum 키는 절대 노출 X.
 * Spec: docs/build-spec/07-q1-build.md M1.3 ResultPanel.
 */

import type { ReasonTag } from "@/lib/db/schema"

export const REASON_TAG_LABEL: Record<ReasonTag, string> = {
  // 룰 즉시 (M1.2)
  time_overrun: "시간 초과",
  hint_dependent: "힌트 의존",
  prereq_deficit: "이전 학년 결손 의심",
  // AI 분류 (M2.4)
  concept_lack: "현재 개념 부족",
  pattern_misrecognition: "유형 인식 실패",
  approach_error: "접근 방향 오류",
  calculation_error: "계산 실수",
  condition_misread: "조건 해석 오류",
  graph_misread: "그래프 해석 오류",
  logic_leap: "논리 비약",
}

export const REASON_TAG_TONE: Record<ReasonTag, "warning" | "alert" | "info"> = {
  time_overrun: "warning",
  hint_dependent: "warning",
  prereq_deficit: "alert",
  concept_lack: "alert",
  pattern_misrecognition: "alert",
  approach_error: "alert",
  calculation_error: "info",
  condition_misread: "info",
  graph_misread: "info",
  logic_leap: "info",
}
