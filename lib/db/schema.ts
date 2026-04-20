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

export const nodeTypeEnum = pgEnum("node_type", [
  "paper",
  "concept",
  "technique",
  "application",
  "question",
  "memo",
  "document",
])

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

export const nodes = pgTable(
  "nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    type: nodeTypeEnum("type").notNull().default("concept"),
    content: text("content").notNull().default(""),
    tldr: text("tldr"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    // Whiteboard 뷰 전용 좌표 — reagraph 뷰는 무시
    whiteboardPos: jsonb("whiteboard_pos").$type<{ x: number; y: number }>(),
    sectionId: text("section_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("nodes_user_idx").on(t.userId)]
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
// 타입 export — API 레이어에서 재사용
// ============================================================

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Document = typeof documents.$inferSelect
export type Chunk = typeof chunks.$inferSelect
export type Node = typeof nodes.$inferSelect
export type Edge = typeof edges.$inferSelect
export type ChunkNodeMapping = typeof chunkNodeMappings.$inferSelect
export type TokenUsage = typeof tokenUsage.$inferSelect

export type NewDocument = typeof documents.$inferInsert
export type NewNode = typeof nodes.$inferInsert
export type NewEdge = typeof edges.$inferInsert
export type NewChunk = typeof chunks.$inferInsert

// sql helper re-export (마이그레이션 후처리에서 사용)
export { sql }
