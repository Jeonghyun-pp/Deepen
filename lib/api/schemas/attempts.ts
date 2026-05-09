/**
 * POST /api/attempts — request/response 스키마.
 *
 * Spec: docs/build-spec/03-api-contracts.md §2.
 *
 * Q1 단순화: ocrImageBase64 는 M2.2 (펜슬 + Vision OCR) 도입 전까지 미사용.
 *            mode 는 'practice' 만 활성, 나머지는 M2.5+/M3.2 추가.
 */

import { z } from "zod"

export const SessionMode = z.enum([
  "practice",
  "exam",
  "challenge",
  "recovery",
  "retry",
])
export type SessionMode = z.infer<typeof SessionMode>

export const SelfConfidence = z.enum(["sure", "mid", "unsure"])
export type SelfConfidence = z.infer<typeof SelfConfidence>

export const AttemptLabel = z.enum(["correct", "wrong", "unsure"])
export type AttemptLabel = z.infer<typeof AttemptLabel>

export const ReasonTag = z.enum([
  "time_overrun",
  "hint_dependent",
  "prereq_deficit",
  "concept_lack",
  "pattern_misrecognition",
  "approach_error",
  "calculation_error",
  "condition_misread",
  "graph_misread",
  "logic_leap",
])
export type ReasonTag = z.infer<typeof ReasonTag>

/** M3.2: mode='retry' 시 BN re-run 대상 prereq 들. */
export const RetryAttemptMeta = z.object({
  source: z.literal("recap_retry"),
  storedItemId: z.string().uuid(),
  recapPatternIds: z.array(z.string().uuid()).max(20),
})
export type RetryAttemptMeta = z.infer<typeof RetryAttemptMeta>

/** M3.2: mode='challenge' 시 머신 ctx — 서버 enforcement 검증용. */
export const ChallengeAttemptMeta = z.object({
  targetPatternId: z.string().uuid(),
  consecutiveCorrect: z.number().int().nonnegative(),
  consecutiveWrong: z.number().int().nonnegative(),
  difficulty: z.number().min(0).max(1),
})
export type ChallengeAttemptMeta = z.infer<typeof ChallengeAttemptMeta>

export const SubmitAttemptRequest = z.object({
  itemId: z.string().uuid(),
  selectedAnswer: z.string().min(1),
  timeMs: z.number().int().nonnegative().max(60 * 60 * 1000), // 1시간 cap
  hintsUsed: z.number().int().nonnegative().max(20),
  aiQuestions: z.number().int().nonnegative().max(50),
  selfConfidence: SelfConfidence,
  mode: SessionMode,
  ocrImageBase64: z.string().optional(), // M2.2+
  /** M3.2 mode 별 ctx. */
  retry: RetryAttemptMeta.optional(),
  challenge: ChallengeAttemptMeta.optional(),
})
export type SubmitAttemptRequest = z.infer<typeof SubmitAttemptRequest>

export const MasteryUpdate = z.object({
  patternId: z.string().uuid(),
  thetaBefore: z.number(),
  thetaAfter: z.number(),
  betaBefore: z.number(),
  betaAfter: z.number(),
})
export type MasteryUpdate = z.infer<typeof MasteryUpdate>

export const DiagnosisCandidate = z.object({
  patternId: z.string().uuid(),
  patternLabel: z.string(),
  grade: z.string().nullable(),
  deficitProb: z.number().min(0).max(1),
})
export type DiagnosisCandidate = z.infer<typeof DiagnosisCandidate>

export const Diagnosis = z.object({
  recapNeeded: z.boolean(),
  candidatePrereq: z.array(DiagnosisCandidate).optional(),
})
export type Diagnosis = z.infer<typeof Diagnosis>

export const NextActionType = z.enum([
  "next_item",
  "recap",
  "review",
  "session_end",
  "level_up", // M3.2: challenge 5연속 정답
])
export type NextActionType = z.infer<typeof NextActionType>

export const NextAction = z.object({
  type: NextActionType,
  payload: z.record(z.string(), z.unknown()).optional(),
})
export type NextAction = z.infer<typeof NextAction>

/** M3.2: challenge 모드 attempt 응답 — streak/leveledUp 클라 머신 동기화용. */
export const ChallengeMeta = z.object({
  streak: z.number().int().nonnegative(),
  streakTarget: z.literal(5),
  consecutiveWrong: z.number().int().nonnegative(),
  difficultyDelta: z.number(),
  leveledUp: z.boolean(),
})
export type ChallengeMeta = z.infer<typeof ChallengeMeta>

/** M3.2: retry recap 효과 측정 결과 (BN re-run 결과). */
export const RetryEffect = z.object({
  patternId: z.string().uuid(),
  patternLabel: z.string(),
  deficitBefore: z.number(),
  deficitAfter: z.number(),
  delta: z.number(),
})
export type RetryEffect = z.infer<typeof RetryEffect>

export const AttemptResultPayload = z.object({
  label: AttemptLabel,
  confidenceScore: z.number(),
  timeZ: z.number(),
  reasonTags: z.array(ReasonTag),
  /** result_history append 된 attempt 의 timestamp (M2.4 follow-up classify 식별용). */
  attemptTimestamp: z.string(),
  /** 오답이고 ANTHROPIC_API_KEY 가 있어 AI 7태그 분류가 가능한 경우 true. */
  reasonTagsPending: z.boolean(),
  correctAnswer: z.string(),
  explanation: z.string(),
  /** M3.2 — mode 별 부가 정보 (해당 모드일 때만 채워짐). */
  challenge: ChallengeMeta.nullable().optional(),
  retryEffect: z.array(RetryEffect).nullable().optional(),
})
export type AttemptResultPayload = z.infer<typeof AttemptResultPayload>

export const SubmitAttemptResponse = z.object({
  attemptResult: AttemptResultPayload,
  masteryUpdate: z.array(MasteryUpdate),
  diagnosis: Diagnosis,
  nextAction: NextAction,
})
export type SubmitAttemptResponse = z.infer<typeof SubmitAttemptResponse>
