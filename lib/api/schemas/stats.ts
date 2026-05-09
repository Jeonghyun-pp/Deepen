/**
 * /api/stats/* zod 스키마.
 * Spec: 03-api-contracts.md §8, 09-q3-build.md M3.5.
 */
import { z } from "zod"

const WeakPattern = z.object({
  id: z.string().uuid(),
  label: z.string(),
  theta: z.number(),
})

const WeeklyRow = z.object({
  weekEnding: z.string(), // 'YYYY-MM-DD'
  attempts: z.number().int().nonnegative(),
  avgMastery: z.number(),
})

const SolveTimeRow = z.object({
  difficulty: z.enum(["easy", "mid", "hard"]),
  attempts: z.number().int().nonnegative(),
  avgMs: z.number().nonnegative(),
  correctRate: z.number().min(0).max(1),
})

const PatternImprovement = z.object({
  patternId: z.string().uuid(),
  patternLabel: z.string(),
  thetaBefore: z.number(),
  thetaAfter: z.number(),
  thetaDelta: z.number(),
})

const PatternConcern = z.object({
  patternId: z.string().uuid(),
  patternLabel: z.string(),
  theta: z.number(),
})

export const StatsOverviewResponse = z.object({
  weeklyMasteryDelta: z.object({
    thisWeek: z.number(),
    lastWeek: z.number(),
    delta: z.number(),
  }),
  weakNodesReduced: z.object({
    before: z.number().int().nonnegative(),
    after: z.number().int().nonnegative(),
    reduced: z.array(WeakPattern),
  }),
  studyMinutes: z.object({
    totalAttempts: z.number().int().nonnegative(),
    minutes: z.number().nonnegative(),
  }),
  weeklyComparison: z.array(WeeklyRow),
  solveTimeBreakdown: z.array(SolveTimeRow),
  topImproved: z.array(PatternImprovement),
  topConcerns: z.array(PatternConcern),
})
export type StatsOverviewResponse = z.infer<typeof StatsOverviewResponse>

// /api/stats/timeline — 14일 학습 events
export const StatsTimelineEvent = z.object({
  date: z.string(), // 'YYYY-MM-DD'
  type: z.enum([
    "attempts",
    "recap_pass",
    "challenge_level_up",
    "mastery_jump",
  ]),
  count: z.number().int().nonnegative(),
})
export type StatsTimelineEvent = z.infer<typeof StatsTimelineEvent>

export const StatsTimelineResponse = z.object({
  events: z.array(StatsTimelineEvent),
})
export type StatsTimelineResponse = z.infer<typeof StatsTimelineResponse>
