import { sql } from "drizzle-orm"
import {
  pgTable,
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  real,
  boolean,
  primaryKey,
  index,
  pgEnum,
} from "drizzle-orm/pg-core"

// Supabase가 관리하는 auth.users 참조용 shadow 정의.
// 직접 이 테이블에 쓰지 않고 FK 대상으로만 사용한다.
const authSchema = pgSchema("auth")
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
})

// ============================================================
// Enums
// ============================================================

// M1.1: Pattern only. concept/technique/application은 display_layer='concept'로 통합,
// question은 'item'으로. paper/memo/document는 옛 product 잔재라 폐기.
export const nodeTypeEnum = pgEnum("node_type", ["pattern", "item"])

export const displayLayerEnum = pgEnum("display_layer", ["concept", "pattern"])

export const nodeStatusEnum = pgEnum("node_status", ["draft", "published"])

// 학습 관점에서 의미 있는 3종만 유지.
// prerequisite: 방향 O, 학습 순서(DAG) 핵심. A를 알아야 B 이해.
// contains: 방향 O, 상위 개념 → 하위 개념 (섹션 계층 등).
// relatedTo: 무방향(관례), 같은 맥락에서 언급됨. 기본값.
export const edgeTypeEnum = pgEnum("edge_type", [
  "prerequisite",
  "contains",
  "relatedTo",
])

export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "parsing",
  "extracting",
  "ready",
  "failed",
])

export const documentJobStatusEnum = pgEnum("document_job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "canceled",
])

export const processingEventLevelEnum = pgEnum("processing_event_level", [
  "info",
  "warn",
  "error",
])

export const chunkContentTypeEnum = pgEnum("chunk_content_type", [
  "text",
  "equation_placeholder",
  "figure_placeholder",
])

// ============================================================
// users — public.users (auth.users 확장)
// ============================================================

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ============================================================
// sessions — 에이전트 챗 세션
// ============================================================

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
)

// ============================================================
// documents — 업로드된 PDF
// ============================================================

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Supabase Storage의 객체 경로 (예: user_id/uuid.pdf)
    storagePath: text("storage_path").notNull(),
    pageCount: integer("page_count"),
    status: documentStatusEnum("status").notNull().default("uploaded"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("documents_user_idx").on(t.userId)]
)

// ============================================================
// chunks — 문서에서 추출한 텍스트 단위
// ============================================================

export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    pageStart: integer("page_start"),
    pageEnd: integer("page_end"),
    sectionTitle: text("section_title"),
    contentType: chunkContentTypeEnum("content_type")
      .notNull()
      .default("text"),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chunks_document_ordinal_idx").on(t.documentId, t.ordinal),
    index("chunks_user_idx").on(t.userId),
  ]
)

// ============================================================
// nodes — 그래프 노드
// ============================================================

// ============================================================
// document_jobs - durable processing queue for uploaded PDFs
// ============================================================

export const documentJobs = pgTable(
  "document_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("process_document"),
    status: documentJobStatusEnum("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    nextRunAt: timestamp("next_run_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    errorMessage: text("error_message"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("document_jobs_user_idx").on(t.userId),
    index("document_jobs_document_idx").on(t.documentId),
    index("document_jobs_status_next_run_idx").on(t.status, t.nextRunAt),
  ]
)

export const documentProcessingEvents = pgTable(
  "document_processing_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => documentJobs.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    step: text("step").notNull(),
    level: processingEventLevelEnum("level").notNull().default("info"),
    message: text("message").notNull(),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("document_processing_events_job_idx").on(t.jobId),
    index("document_processing_events_document_idx").on(t.documentId),
    index("document_processing_events_user_idx").on(t.userId),
  ]
)

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = 시스템 콘텐츠 (전 사용자 공유). 학생 본인 콘텐츠는 user_id 채움.
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    type: nodeTypeEnum("type").notNull().default("pattern"),
    label: text("label").notNull(),
    content: text("content").notNull().default(""),
    tldr: text("tldr"),

    // Pattern 전용 (type='pattern')
    grade: text("grade"), // '중2','중3','고1','수Ⅱ','미적분' 등
    displayLayer: displayLayerEnum("display_layer"), // 'concept' | 'pattern' UI alias
    signature: jsonb("signature").$type<string[]>(), // sub-skill 목록
    isKiller: boolean("is_killer").notNull().default(false),
    frequencyRank: integer("frequency_rank"), // 1=가장 빈출
    avgCorrectRate: real("avg_correct_rate"),

    // Item 전용 (type='item')
    itemSource: text("item_source"), // '2025수능','2024_9모','EBS' 등
    itemYear: integer("item_year"),
    itemNumber: integer("item_number"),
    itemDifficulty: real("item_difficulty"), // 0.0~1.0
    itemSolution: text("item_solution"),
    itemChoices: jsonb("item_choices").$type<string[]>(),
    itemAnswer: text("item_answer"),

    status: nodeStatusEnum("status").notNull().default("published"),

    meta: jsonb("meta").$type<Record<string, unknown>>(),
    whiteboardPos: jsonb("whiteboard_pos").$type<{ x: number; y: number }>(),
    sectionId: text("section_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("nodes_user_idx").on(t.userId),
    index("nodes_type_status_idx").on(t.type, t.status),
    index("nodes_grade_idx").on(t.grade),
  ]
)

// ============================================================
// edges — 그래프 엣지
// ============================================================

export const edges = pgTable(
  "edges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceNodeId: uuid("source_node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    targetNodeId: uuid("target_node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    type: edgeTypeEnum("type").notNull().default("relatedTo"),
    label: text("label"),
    weight: real("weight"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("edges_user_idx").on(t.userId),
    index("edges_source_idx").on(t.sourceNodeId),
    index("edges_target_idx").on(t.targetNodeId),
  ]
)

// ============================================================
// chunk_node_mappings — 노드 출처 추적 (many-to-many)
// ============================================================

export const chunkNodeMappings = pgTable(
  "chunk_node_mappings",
  {
    chunkId: uuid("chunk_id")
      .notNull()
      .references(() => chunks.id, { onDelete: "cascade" }),
    nodeId: uuid("node_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.chunkId, t.nodeId] }),
    index("cnm_node_idx").on(t.nodeId),
    index("cnm_user_idx").on(t.userId),
  ]
)

// ============================================================
// token_usage — LLM 호출 토큰/비용 로깅 (per-user cap 감시용)
// ============================================================

export const tokenUsage = pgTable(
  "token_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source: text("source").notNull(), // 'agent' | 'extract_nodes' | ...
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costUsd: real("cost_usd"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("token_usage_user_idx").on(t.userId),
    index("token_usage_created_idx").on(t.createdAt),
  ]
)

// ============================================================
// user_item_history — 학습자 풀이 누적 (오답 노트 파생)
// 알고리즘 5-0. result_history는 attempt별 append-only.
// ============================================================

export type AttemptResult = {
  label: "correct" | "wrong" | "unsure"
  confidenceScore: number
  reasonTags: ReasonTag[]
  signals: {
    correct: boolean
    timeMs: number
    timeZ: number
    hintsUsed: number
    aiQuestions: number
    selfConfidence: "sure" | "mid" | "unsure"
  }
  timestamp: string // ISO8601
}

export type ReasonTag =
  | "time_overrun"
  | "hint_dependent"
  | "prereq_deficit"
  | "concept_lack"
  | "pattern_misrecognition"
  | "approach_error"
  | "calculation_error"
  | "condition_misread"
  | "graph_misread"
  | "logic_leap"

export const userItemHistory = pgTable(
  "user_item_history",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    seenCount: integer("seen_count").notNull().default(0),
    lastSolvedAt: timestamp("last_solved_at", { withTimezone: true }),
    resultHistory: jsonb("result_history")
      .$type<AttemptResult[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    markedDifficult: boolean("marked_difficult").notNull().default(false),
    userMemo: text("user_memo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.itemId] }),
    index("uih_user_idx").on(t.userId),
    index("uih_last_solved_idx").on(t.userId, t.lastSolvedAt),
  ]
)

// ============================================================
// pattern_state — Pattern Elo 숙련도 (알고리즘 2-2)
// theta 0~1 정규화 (sigmoid from Elo). beta는 Pattern 난이도.
// ============================================================

export const patternState = pgTable(
  "pattern_state",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patternId: uuid("pattern_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    theta: real("theta").notNull().default(0.5),
    beta: real("beta").notNull().default(0.5),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.patternId] }),
    index("pattern_state_user_idx").on(t.userId),
    index("pattern_state_theta_idx").on(t.userId, t.theta),
  ]
)

// ============================================================
// ai_coach_calls — 사용량 로깅 (M1.5).
// 티어별 quota function (check_ai_quota)는 M3.1에서 추가.
// ============================================================

export const aiCoachCalls = pgTable(
  "ai_coach_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: uuid("item_id").references(() => nodes.id, { onDelete: "set null" }),
    callType: text("call_type").notNull(), // 'chat' | 'suggest_chip' | 'hint' | 'classify'
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    costUsd: real("cost_usd"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("aic_user_created_idx").on(t.userId, t.createdAt)]
)

// ============================================================
// subscriptions · invoices — Q3 (M3.1) 결제.
// 02-schema §7. Free 평생 5회 / Pro 일 30회 / Pro+ 무제한.
// ============================================================

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "pro",
  "pro_plus",
])

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "expired",
])

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tier: subscriptionTierEnum("tier").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    tossCustomerKey: text("toss_customer_key"),
    tossBillingKey: text("toss_billing_key"),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sub_user_idx").on(t.userId)]
)

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    amountKrw: integer("amount_krw").notNull(),
    status: text("status").notNull(), // 'paid' | 'failed' | 'refunded'
    tossPaymentKey: text("toss_payment_key"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("inv_user_idx").on(t.userId)]
)

// ============================================================
// prereq_deficit_log — Phase 3 BN 누적 결손 (M2.3).
// 02-schema.md §5. (userId, patternId) 마다 attempt 별 새 row.
// 조회 시 MAX(deficit_probability) over 최근 30일.
// ============================================================

export const prereqDeficitLog = pgTable(
  "prereq_deficit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    patternId: uuid("pattern_id")
      .notNull()
      .references(() => nodes.id, { onDelete: "cascade" }),
    triggerItemId: uuid("trigger_item_id").references(() => nodes.id, {
      onDelete: "set null",
    }),
    deficitProbability: real("deficit_probability").notNull(),
    evidenceCount: integer("evidence_count").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pdl_user_pattern_idx").on(t.userId, t.patternId),
    index("pdl_user_created_idx").on(t.userId, t.createdAt),
  ]
)

// ============================================================
// 타입 export — API 레이어에서 재사용
// ============================================================

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Document = typeof documents.$inferSelect
export type Chunk = typeof chunks.$inferSelect
export type DocumentJob = typeof documentJobs.$inferSelect
export type DocumentProcessingEvent =
  typeof documentProcessingEvents.$inferSelect
export type Node = typeof nodes.$inferSelect
export type Edge = typeof edges.$inferSelect
export type ChunkNodeMapping = typeof chunkNodeMappings.$inferSelect
export type TokenUsage = typeof tokenUsage.$inferSelect

export type NewDocument = typeof documents.$inferInsert
export type NewDocumentJob = typeof documentJobs.$inferInsert
export type NewDocumentProcessingEvent =
  typeof documentProcessingEvents.$inferInsert
export type NewNode = typeof nodes.$inferInsert
export type NewEdge = typeof edges.$inferInsert
export type NewChunk = typeof chunks.$inferInsert

// 학습자 상태 (M1.1)
export type UserItemHistoryRow = typeof userItemHistory.$inferSelect
export type NewUserItemHistory = typeof userItemHistory.$inferInsert
export type PatternStateRow = typeof patternState.$inferSelect
export type NewPatternState = typeof patternState.$inferInsert
export type AiCoachCall = typeof aiCoachCalls.$inferSelect
export type NewAiCoachCall = typeof aiCoachCalls.$inferInsert
export type PrereqDeficitLogRow = typeof prereqDeficitLog.$inferSelect
export type NewPrereqDeficitLog = typeof prereqDeficitLog.$inferInsert
export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

// sql helper re-export (마이그레이션 후처리에서 사용)
export { sql }
