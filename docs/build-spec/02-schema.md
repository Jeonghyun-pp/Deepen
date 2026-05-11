# 02 · DB 스키마 (lock)

> Drizzle 정의 + 마이그레이션 SQL. 모든 테이블·컬럼·인덱스·RLS·enum이 이 문서에서 lock된다. 신규 컬럼·테이블 추가는 PR + 마이그레이션 SQL 동시 작성 필수.

## 마이그레이션 순서 (분기별)

| 마이그레이션 | 시점 | 내용 |
|---|---|---|
| `0004_pattern_only` | M1.1 | enum 단순화 + nodes 컬럼 추가 + 기존 데이터 백필 |
| `0005_learner_state` | M1.1 | user_item_history, pattern_state, ai_coach_calls |
| `0006_confidence_log` | M1.2 | (선택, B-5 자신감 슬라이더 응답 별도 저장 시) |
| `0007_prereq_deficit` | M2.3 | prereq_deficit_log (BN 누적 결손) |
| `0008_admin_review` | M2.6 | nodes/edges status='draft' 활용 — 별도 컬럼 없음 |
| `0009_pgvector` | M3.3 | pgvector 확장 + items.text_embedding |
| `0010_billing` | M3.1 | subscriptions, invoices |
| `0011_org_saas` | M4.1 | organizations, org_members, org_classes, class_students, org_branding |
| `0012_teacher_views` | M4.4 | teacher_views (읽음 로그) |

## 0. 기존 테이블 (유지)

`users`, `sessions`, `documents`, `chunks`, `document_jobs`, `document_processing_events`, `chunk_node_mappings`, `token_usage` — 현재 schema.ts 그대로 유지. RLS 정책만 점검.

## 1. nodes (수정) — Pattern only + alias

기존 `nodes` 테이블을 다음과 같이 변경:

```typescript
// Drizzle (lib/db/schema.ts)
export const nodeTypeEnum = pgEnum("node_type", ["pattern", "item"])
export const displayLayerEnum = pgEnum("display_layer", ["concept", "pattern"])
export const nodeStatusEnum = pgEnum("node_status", ["draft", "published"])

export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),  // null = 시스템 콘텐츠
  type: nodeTypeEnum("type").notNull(),
  label: text("label").notNull(),
  content: text("content").notNull().default(""),
  tldr: text("tldr"),

  // Pattern 전용 (type='pattern' 일 때 채움)
  grade: text("grade"),                                    // '중2','중3','고1','수Ⅱ','미적분' 등
  displayLayer: displayLayerEnum("display_layer"),         // 'concept' | 'pattern' (UI alias)
  signature: jsonb("signature").$type<string[]>(),         // sub-skill 목록
  isKiller: boolean("is_killer").default(false),
  frequencyRank: integer("frequency_rank"),                // 1=가장 빈출
  avgCorrectRate: real("avg_correct_rate"),

  // Item 전용 (type='item' 일 때 채움)
  itemSource: text("item_source"),                         // '2025수능','2024_9모','EBS' 등
  itemYear: integer("item_year"),
  itemNumber: integer("item_number"),
  itemDifficulty: real("item_difficulty"),                 // 0.0~1.0
  itemSolution: text("item_solution"),
  itemChoices: jsonb("item_choices").$type<string[]>(),
  itemAnswer: text("item_answer"),

  status: nodeStatusEnum("status").notNull().default("published"),

  meta: jsonb("meta").$type<Record<string, unknown>>(),
  whiteboardPos: jsonb("whiteboard_pos").$type<{ x: number; y: number }>(),
  sectionId: text("section_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("nodes_user_idx").on(t.userId),
  index("nodes_type_status_idx").on(t.type, t.status),
  index("nodes_grade_idx").on(t.grade),
])
```

### 마이그레이션 SQL (`drizzle/0004_pattern_only.sql`)

```sql
BEGIN;

-- 1) 신규 enum
CREATE TYPE display_layer AS ENUM ('concept', 'pattern');
CREATE TYPE node_status AS ENUM ('draft', 'published');

-- 2) nodes 컬럼 추가
ALTER TABLE nodes
  ADD COLUMN grade TEXT,
  ADD COLUMN display_layer display_layer,
  ADD COLUMN signature JSONB,
  ADD COLUMN is_killer BOOLEAN DEFAULT FALSE,
  ADD COLUMN frequency_rank INTEGER,
  ADD COLUMN avg_correct_rate REAL,
  ADD COLUMN item_source TEXT,
  ADD COLUMN item_year INTEGER,
  ADD COLUMN item_number INTEGER,
  ADD COLUMN item_difficulty REAL,
  ADD COLUMN item_solution TEXT,
  ADD COLUMN item_choices JSONB,
  ADD COLUMN item_answer TEXT,
  ADD COLUMN status node_status NOT NULL DEFAULT 'published';

-- 3) 기존 데이터 백필
-- concept/technique/application → pattern + display_layer='concept'
-- question → item
UPDATE nodes SET
  display_layer = 'concept'
  WHERE type IN ('concept', 'technique', 'application');

UPDATE nodes SET
  display_layer = 'pattern'
  WHERE type IS NULL;

-- 4) type 컬럼 재매핑
-- 임시 컬럼으로 옮기고 enum 교체
ALTER TABLE nodes ADD COLUMN type_new TEXT;
UPDATE nodes SET type_new = CASE
  WHEN type IN ('concept', 'technique', 'application') THEN 'pattern'
  WHEN type = 'question' THEN 'item'
  ELSE 'pattern'
END;

ALTER TABLE nodes DROP COLUMN type;
DROP TYPE node_type;
CREATE TYPE node_type AS ENUM ('pattern', 'item');
ALTER TABLE nodes ADD COLUMN type node_type NOT NULL DEFAULT 'pattern';
UPDATE nodes SET type = type_new::node_type;
ALTER TABLE nodes DROP COLUMN type_new;
ALTER TABLE nodes ALTER COLUMN type DROP DEFAULT;

-- 5) 인덱스
CREATE INDEX nodes_type_status_idx ON nodes(type, status);
CREATE INDEX nodes_grade_idx ON nodes(grade);

-- 6) RLS — published만 학생 노출
ALTER TABLE nodes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nodes_select_published ON nodes;
CREATE POLICY nodes_select_published ON nodes
  FOR SELECT
  USING (status = 'published' OR auth.uid() = user_id OR auth.role() = 'service_role');

COMMIT;
```

## 2. user_item_history (신규) — 알고리즘 5-0

```typescript
export const userItemHistory = pgTable("user_item_history", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  seenCount: integer("seen_count").notNull().default(0),
  lastSolvedAt: timestamp("last_solved_at", { withTimezone: true }),
  resultHistory: jsonb("result_history").$type<AttemptResult[]>().notNull().default([]),
  markedDifficult: boolean("marked_difficult").notNull().default(false),
  userMemo: text("user_memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.itemId] }),
  index("uih_user_idx").on(t.userId),
  index("uih_last_solved_idx").on(t.userId, t.lastSolvedAt),
])

// JSONB 타입
export type AttemptResult = {
  label: 'correct' | 'wrong' | 'unsure'
  confidenceScore: number
  reasonTags: ReasonTag[]
  signals: {
    correct: boolean
    timeMs: number
    timeZ: number
    hintsUsed: number
    aiQuestions: number
    selfConfidence: 'sure' | 'mid' | 'unsure'
  }
  timestamp: string  // ISO8601
}

export type ReasonTag =
  | 'time_overrun' | 'hint_dependent' | 'prereq_deficit'
  | 'concept_lack' | 'pattern_misrecognition' | 'approach_error'
  | 'calculation_error' | 'condition_misread' | 'graph_misread' | 'logic_leap'
```

### `in_wrong_note` 파생 쿼리

`UserItemHistory`에 별도 컬럼 없음. 다음 SQL view로 뽑음:

```sql
CREATE OR REPLACE VIEW user_wrong_note AS
SELECT
  user_id,
  item_id,
  seen_count,
  last_solved_at,
  -- 파생 로직: 오답이 1+ 존재하고 마지막 오답 이후 연속 정답 < 3
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(result_history) r
    WHERE r->>'label' = 'wrong'
  ) AND (
    -- 마지막 오답 이후 연속 정답 카운트
    SELECT COUNT(*)
    FROM jsonb_array_elements(result_history) WITH ORDINALITY r(val, ord)
    WHERE r.ord > (
      SELECT MAX(ord) FROM jsonb_array_elements(result_history) WITH ORDINALITY r2(v2, ord)
      WHERE v2->>'label' = 'wrong'
    ) AND r.val->>'label' = 'correct'
  ) < 3 AS in_wrong_note
FROM user_item_history;
```

## 3. pattern_state (신규) — 알고리즘 2-2 Elo 출력

```typescript
export const patternState = pgTable("pattern_state", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patternId: uuid("pattern_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),
  theta: real("theta").notNull().default(0.0),    // 사용자 능력 (0~1, scaled from Elo)
  beta: real("beta").notNull().default(0.5),       // Pattern 난이도
  attemptCount: integer("attempt_count").notNull().default(0),
  lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.patternId] }),
  index("pattern_state_user_idx").on(t.userId),
  index("pattern_state_theta_idx").on(t.userId, t.theta),
])
```

θ를 0~1 범위로 정규화하기 위해 Elo 점수를 sigmoid로 매핑. 자세한 공식은 04-algorithms.md 2.2 절.

## 4. ai_coach_calls (신규) — C-9 사용량 캡

```typescript
export const aiCoachCalls = pgTable("ai_coach_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => nodes.id, { onDelete: "set null" }),
  callType: text("call_type").notNull(),  // 'chat' | 'suggest_chip' | 'hint' | 'classify'
  promptTokens: integer("prompt_tokens").notNull().default(0),
  completionTokens: integer("completion_tokens").notNull().default(0),
  costUsd: real("cost_usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("aic_user_created_idx").on(t.userId, t.createdAt),
])
```

### 사용량 함수 (Postgres function)

```sql
CREATE OR REPLACE FUNCTION check_ai_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_used_today INT;
  v_used_lifetime INT;
BEGIN
  SELECT tier INTO v_tier FROM subscriptions WHERE user_id = p_user_id AND status = 'active' LIMIT 1;
  IF v_tier IS NULL THEN v_tier := 'free'; END IF;

  IF v_tier = 'pro_plus' THEN
    RETURN TRUE;
  END IF;

  IF v_tier = 'free' THEN
    SELECT COUNT(*) INTO v_used_lifetime
      FROM ai_coach_calls
      WHERE user_id = p_user_id AND call_type IN ('chat', 'suggest_chip');
    RETURN v_used_lifetime < 5;
  END IF;

  IF v_tier = 'pro' THEN
    SELECT COUNT(*) INTO v_used_today
      FROM ai_coach_calls
      WHERE user_id = p_user_id
        AND call_type IN ('chat', 'suggest_chip')
        AND created_at >= (CURRENT_DATE AT TIME ZONE 'Asia/Seoul');
    RETURN v_used_today < 30;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;
```

## 5. prereq_deficit_log (신규, M2.3) — Phase 3 누적 결손

```typescript
export const prereqDeficitLog = pgTable("prereq_deficit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  patternId: uuid("pattern_id").notNull().references(() => nodes.id, { onDelete: "cascade" }),  // 결손 후보 Pattern
  triggerItemId: uuid("trigger_item_id").references(() => nodes.id, { onDelete: "set null" }),  // 진단 트리거가 된 Item
  deficitProbability: real("deficit_probability").notNull(),  // 0~1
  evidenceCount: integer("evidence_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pdl_user_pattern_idx").on(t.userId, t.patternId),
  index("pdl_user_created_idx").on(t.userId, t.createdAt),
])
```

누적 결손 조회는 `MAX(deficit_probability)` over 최근 30일.

## 6. items (pgvector, M3.3)

별도 테이블 신설하지 않고 `nodes` 위에 vector 컬럼 추가:

```sql
-- 0009_pgvector.sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE nodes ADD COLUMN text_embedding vector(1536);
CREATE INDEX nodes_embedding_idx ON nodes USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);
```

Pattern signature embedding도 같은 컬럼 사용 (text는 label + signature concat).

## 7. subscriptions, invoices (M3.1)

```typescript
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "pro", "pro_plus"])
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled", "expired"])

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: subscriptionTierEnum("tier").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  tossCustomerKey: text("toss_customer_key"),
  tossBillingKey: text("toss_billing_key"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("sub_user_idx").on(t.userId),
])

export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id, { onDelete: "set null" }),
  amountKrw: integer("amount_krw").notNull(),
  status: text("status").notNull(),  // 'paid' | 'failed' | 'refunded'
  tossPaymentKey: text("toss_payment_key"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})
```

## 8. organizations (M4.1) — 학원 SaaS

```typescript
export const orgRoleEnum = pgEnum("org_role", ["owner", "teacher", "curator"])

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),       // 서브도메인용
  customDomain: text("custom_domain").unique(),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const orgMembers = pgTable("org_members", {
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: orgRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.orgId, t.userId] }),
  index("om_user_idx").on(t.userId),
])

export const orgClasses = pgTable("org_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  teacherId: uuid("teacher_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

export const classStudents = pgTable("class_students", {
  classId: uuid("class_id").notNull().references(() => orgClasses.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.classId, t.studentId] }),
])

// 학원 전용 콘텐츠 격리: nodes에 org_id 추가
// nodes.org_id IS NULL = 시스템 콘텐츠 (모두에게 보임)
// nodes.org_id = X = 해당 학원만 보임
ALTER TABLE nodes ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX nodes_org_idx ON nodes(org_id);
```

## 9. teacher_views (M4.4)

```typescript
export const teacherViews = pgTable("teacher_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  teacherId: uuid("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  studentId: uuid("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("tv_student_viewed_idx").on(t.studentId, t.viewedAt),
])
```

## 10. RLS 정책 일람

모든 사용자 데이터 테이블에 RLS enable. 정책은 다음 패턴:

```sql
-- 패턴 A: user_id = auth.uid() 만 R/W
CREATE POLICY <table>_owner ON <table>
  FOR ALL USING (auth.uid() = user_id);

-- 패턴 B: published 콘텐츠 + 본인
CREATE POLICY nodes_select ON nodes
  FOR SELECT USING (status = 'published' OR auth.uid() = user_id OR auth.role() = 'service_role');

-- 패턴 C: 학원 멤버
CREATE POLICY org_members_read ON org_classes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM org_members WHERE org_members.org_id = org_classes.org_id AND org_members.user_id = auth.uid()
  ));
```

테이블별 정책은 마이그레이션에 동봉. 개발 시 `supabase db reset --debug`로 검증.

## 11. 타입 export

`lib/db/schema.ts` 마지막에 모든 새 테이블 + JSONB 타입 export:

```typescript
export type UserItemHistoryRow = typeof userItemHistory.$inferSelect
export type AttemptResult = /* 위 정의 */
export type ReasonTag = /* 위 정의 */
export type PatternStateRow = typeof patternState.$inferSelect
export type AiCoachCall = typeof aiCoachCalls.$inferSelect
export type PrereqDeficitLog = typeof prereqDeficitLog.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
export type Organization = typeof organizations.$inferSelect
export type OrgMember = typeof orgMembers.$inferSelect
export type OrgClass = typeof orgClasses.$inferSelect
```

## 12. 백필 스크립트 (M1.1 운영)

`scripts/migrate-to-pattern-only.ts`:

```typescript
// 마이그레이션 후 실행
// 1) 기존 'concept' 노드를 display_layer='concept', type='pattern'로
// 2) edges 정리 — 무효해진 prerequisite 검증 (사이클 발견 시 경고)
// 3) chunkNodeMappings 그대로 (item 노드와도 매핑 가능)
```
