-- M1.1 — Pattern-only 노드 스키마 + 학습자 상태 테이블 추가.
-- 참조: docs/build-spec/02-schema.md §1, §2, §3, §4.
--
-- 변경:
--   1) 신규 enum 2개 (display_layer, node_status).
--   2) 기존 nodes 데이터를 새 type/displayLayer로 백필.
--   3) node_type enum 단순화 (paper/concept/technique/application/question/memo/document → pattern/item).
--   4) nodes 컬럼 14개 추가 (Pattern·Item 메타 + status).
--   5) 신규 테이블 3개 (user_item_history, pattern_state, ai_coach_calls).

-- ============================================================
-- 1) 새 enum
-- ============================================================
CREATE TYPE "public"."display_layer" AS ENUM ('concept', 'pattern');--> statement-breakpoint
CREATE TYPE "public"."node_status"   AS ENUM ('draft', 'published');--> statement-breakpoint

-- ============================================================
-- 2) nodes — 새 컬럼 추가 (백필 위해 type 변경 전에 먼저)
-- ============================================================
ALTER TABLE "nodes" ADD COLUMN "grade"             text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "display_layer"     "display_layer";--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "signature"         jsonb;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "is_killer"         boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "frequency_rank"    integer;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "avg_correct_rate"  real;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_source"       text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_year"         integer;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_number"       integer;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_difficulty"   real;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_solution"     text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_choices"      jsonb;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "item_answer"       text;--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "status"            "node_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint

-- ============================================================
-- 3) 백필 — 옛 type 값을 display_layer로 분리
-- ============================================================
UPDATE "nodes" SET "display_layer" = 'concept'
  WHERE "type"::text IN ('concept', 'technique', 'application');--> statement-breakpoint

UPDATE "nodes" SET "display_layer" = 'pattern'
  WHERE "display_layer" IS NULL;--> statement-breakpoint

-- ============================================================
-- 4) node_type enum 단순화. question → 'item', 그 외 → 'pattern'.
-- ============================================================
ALTER TABLE "nodes" ADD COLUMN "type_new" text;--> statement-breakpoint

UPDATE "nodes" SET "type_new" = CASE
  WHEN "type"::text = 'question' THEN 'item'
  ELSE 'pattern'
END;--> statement-breakpoint

ALTER TABLE "nodes" DROP COLUMN "type";--> statement-breakpoint
DROP TYPE "public"."node_type";--> statement-breakpoint
CREATE TYPE "public"."node_type" AS ENUM ('pattern', 'item');--> statement-breakpoint
ALTER TABLE "nodes" ADD COLUMN "type" "node_type" NOT NULL DEFAULT 'pattern';--> statement-breakpoint
UPDATE "nodes" SET "type" = "type_new"::"public"."node_type";--> statement-breakpoint
ALTER TABLE "nodes" DROP COLUMN "type_new";--> statement-breakpoint

-- ============================================================
-- 5) user_id 를 nullable 로 (시스템 콘텐츠 = null)
-- ============================================================
ALTER TABLE "nodes" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint

-- ============================================================
-- 6) 인덱스
-- ============================================================
CREATE INDEX "nodes_type_status_idx" ON "nodes" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "nodes_grade_idx"       ON "nodes" USING btree ("grade");--> statement-breakpoint

-- ============================================================
-- 7) user_item_history — 학습자 풀이 이력 (알고리즘 5-0)
-- ============================================================
CREATE TABLE "user_item_history" (
  "user_id"          uuid NOT NULL,
  "item_id"          uuid NOT NULL,
  "seen_count"       integer DEFAULT 0 NOT NULL,
  "last_solved_at"   timestamp with time zone,
  "result_history"   jsonb DEFAULT '[]'::jsonb NOT NULL,
  "marked_difficult" boolean DEFAULT false NOT NULL,
  "user_memo"        text,
  "created_at"       timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at"       timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "user_item_history_pkey" PRIMARY KEY ("user_id","item_id")
);--> statement-breakpoint

ALTER TABLE "user_item_history"
  ADD CONSTRAINT "uih_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint

ALTER TABLE "user_item_history"
  ADD CONSTRAINT "uih_item_fk"
  FOREIGN KEY ("item_id") REFERENCES "public"."nodes"("id") ON DELETE cascade;--> statement-breakpoint

CREATE INDEX "uih_user_idx"        ON "user_item_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uih_last_solved_idx" ON "user_item_history" USING btree ("user_id","last_solved_at");--> statement-breakpoint

-- ============================================================
-- 8) pattern_state — Pattern Elo 숙련도 (알고리즘 2-2)
-- ============================================================
CREATE TABLE "pattern_state" (
  "user_id"         uuid NOT NULL,
  "pattern_id"      uuid NOT NULL,
  "theta"           real DEFAULT 0.5 NOT NULL,
  "beta"            real DEFAULT 0.5 NOT NULL,
  "attempt_count"   integer DEFAULT 0 NOT NULL,
  "last_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "pattern_state_pkey" PRIMARY KEY ("user_id","pattern_id")
);--> statement-breakpoint

ALTER TABLE "pattern_state"
  ADD CONSTRAINT "pattern_state_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint

ALTER TABLE "pattern_state"
  ADD CONSTRAINT "pattern_state_pattern_fk"
  FOREIGN KEY ("pattern_id") REFERENCES "public"."nodes"("id") ON DELETE cascade;--> statement-breakpoint

CREATE INDEX "pattern_state_user_idx"  ON "pattern_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pattern_state_theta_idx" ON "pattern_state" USING btree ("user_id","theta");--> statement-breakpoint

-- ============================================================
-- 9) ai_coach_calls — 사용량 로깅 (티어별 quota function은 M3.1)
-- ============================================================
CREATE TABLE "ai_coach_calls" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"           uuid NOT NULL,
  "item_id"           uuid,
  "call_type"         text NOT NULL,
  "prompt_tokens"     integer DEFAULT 0 NOT NULL,
  "completion_tokens" integer DEFAULT 0 NOT NULL,
  "cost_usd"          real,
  "created_at"        timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "ai_coach_calls"
  ADD CONSTRAINT "aic_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;--> statement-breakpoint

ALTER TABLE "ai_coach_calls"
  ADD CONSTRAINT "aic_item_fk"
  FOREIGN KEY ("item_id") REFERENCES "public"."nodes"("id") ON DELETE set null;--> statement-breakpoint

CREATE INDEX "aic_user_created_idx" ON "ai_coach_calls" USING btree ("user_id","created_at");
