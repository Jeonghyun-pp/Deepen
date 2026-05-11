-- North Star Stage 1 (2026-05-11)
-- Spec: docs/north-star-spec-2026-05-11.md §2
--
-- 강의안 도메인 (Coverage·DAG·Mastery·Badge) 데이터 모델.
-- 입시 도메인 (pattern_state·user_item_history) 와 분리.

-- Enums
CREATE TYPE "public"."chunk_map_state" AS ENUM('proposed', 'confirmed', 'rejected');
CREATE TYPE "public"."chunk_map_proposed_by" AS ENUM('llm', 'user');
CREATE TYPE "public"."mastery_state" AS ENUM('unseen', 'viewed', 'tested', 'mastered');
CREATE TYPE "public"."check_item_type" AS ENUM('cloze', 'order', 'mcq', 'argument');
CREATE TYPE "public"."check_item_status" AS ENUM('active', 'flagged', 'retired');
CREATE TYPE "public"."lecture_status" AS ENUM('in_progress', 'completed');

-- lectures
CREATE TABLE "lectures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "document_id" uuid NOT NULL REFERENCES "documents"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "total_chunks" integer NOT NULL,
  "total_nodes" integer NOT NULL DEFAULT 0,
  "status" "lecture_status" NOT NULL DEFAULT 'in_progress',
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "completed_at" timestamp with time zone
);
CREATE INDEX "lectures_user_doc_uniq" ON "lectures" ("user_id", "document_id");

-- chunk_node_map (별도 — 기존 chunk_node_mappings 와 의도 다름)
CREATE TABLE "chunk_node_map" (
  "chunk_id" uuid NOT NULL REFERENCES "chunks"("id") ON DELETE CASCADE,
  "node_id" uuid NOT NULL REFERENCES "nodes"("id") ON DELETE CASCADE,
  "state" "chunk_map_state" NOT NULL DEFAULT 'proposed',
  "confidence" real NOT NULL,
  "proposed_by" "chunk_map_proposed_by" NOT NULL,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("chunk_id", "node_id")
);
CREATE INDEX "chunk_node_map_node_idx" ON "chunk_node_map" ("node_id");
CREATE INDEX "chunk_node_map_state_idx" ON "chunk_node_map" ("state");

-- node_mastery
CREATE TABLE "node_mastery" (
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "node_id" uuid NOT NULL REFERENCES "nodes"("id") ON DELETE CASCADE,
  "state" "mastery_state" NOT NULL DEFAULT 'unseen',
  "tested_at" timestamp with time zone,
  "mastered_at" timestamp with time zone,
  "last_failed_at" timestamp with time zone,
  "fail_count" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "node_id")
);
CREATE INDEX "node_mastery_user_state_idx" ON "node_mastery" ("user_id", "state");

-- check_items
CREATE TABLE "check_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "node_id" uuid NOT NULL REFERENCES "nodes"("id") ON DELETE CASCADE,
  "type" "check_item_type" NOT NULL,
  "prompt" text NOT NULL,
  "payload" jsonb NOT NULL,
  "status" "check_item_status" NOT NULL DEFAULT 'active',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "check_items_node_idx" ON "check_items" ("node_id", "status");

-- check_attempts
CREATE TABLE "check_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "check_item_id" uuid NOT NULL REFERENCES "check_items"("id") ON DELETE CASCADE,
  "correct" boolean NOT NULL,
  "response" jsonb NOT NULL,
  "attempted_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX "check_attempts_user_item_idx" ON "check_attempts" ("user_id", "check_item_id");

-- lecture_badges
CREATE TABLE "lecture_badges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "lecture_id" uuid NOT NULL REFERENCES "lectures"("id") ON DELETE CASCADE,
  "issued_at" timestamp with time zone NOT NULL DEFAULT now(),
  "coverage_snapshot" jsonb NOT NULL,
  "mastered_node_ids" jsonb NOT NULL
);
CREATE INDEX "lecture_badges_user_lecture_uniq" ON "lecture_badges" ("user_id", "lecture_id");
