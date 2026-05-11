# 북극성 4종 구현 설계서

> 작성: 2026-05-11 · 다음 세션 entry · 사용자 결정: "ROI 단계적 (1+4 → 2 → 7)" 의 7번 단계
> 기반: `docs/strategy-lecture-mastery.md` (3원칙 + 책임 분리) · `docs/product-features.md` §2 (약속 7개)
> 상태: **설계 alignment**. 본 문서 합의 후 코드 진입.

---

## 0 · 4종 통합 약속

> **"이 강의안(p.1~87, 54개념)을 빠짐없이, 순서대로 이해했습니다."**

이 한 문장이 4종을 묶는다.

| # | 약속 | 동사 |
|---|---|---|
| 1 | **Coverage** — 빠짐없이 | 원문 모든 chunk 가 노드로 역추적 |
| 2 | **Prerequisite DAG** — 순서대로 | 학습 순서가 저자 목차가 아닌 의존성 |
| 3 | **Mastery 상태 머신** — 이해했다 | 행동으로 증명 |
| 4 | **완주 뱃지** — 발급 가능 | 위 3개 불변식 통과 시 |

**불변식**:
```
완주(user, lecture) ⟺
  coverage(lecture) == 100%
∧ ∀ node ∈ lecture: mastery(user, node) == 'mastered'
∧ DAG(lecture).hasCycle() == false
```

---

## 1 · 현재 자산과 갭

### 이미 가진 것 (재사용)
- `chunks` 테이블 (`documentId`, `ordinal`, `sectionTitle`, `pageStart`, `content`) — Phase 1 job queue 가 채움
- `nodes` 테이블 (`type: 'item'|'pattern'|'concept'|...`, `status: 'draft'|'published'|'discarded'`)
- `edges` 테이블 (`type: 'contains'|'prerequisite'|...`)
- `pattern_state` (`theta`, `beta`, `attemptCount`) — 입시 도메인 mastery 근사
- 어드민 검수 (`/admin/seed-review`) — draft → published 게이트
- `prereq_deficit_log` — 결손 시계열 (재사용 가능)

### 신규로 필요한 것
- `chunk_node_map` — chunk ↔ node 다대다 + `proposed|confirmed|rejected` 상태
- `node_mastery` — user 별 노드 mastery 상태 머신 (입시 도메인의 `pattern_state.theta` 와 별도 — 강의안 도메인용)
- `check_items` — 노드별 자동 생성된 확인 문항 (`type: 'cloze'|'order'|'mcq'|'argument'`)
- `check_attempts` — check item 시도 기록 (mastery 전이 trigger)
- `lectures` — 강의안 단위 컨테이너 (`documentId` 1:1 또는 N:1)
- `lecture_badges` — 완주 뱃지 발급 기록
- `edges.kind: 'logical-prerequisite'|'pedagogical-order'` — 기존 `prerequisite` 분화 (또는 metadata.jsonb 추가)

---

## 2 · 데이터 모델 (drizzle 스키마 추가)

> 본격 마이그레이션 전 한 번 더 리뷰. SQL DDL 은 다음 세션에서 작성.

```ts
// lectures — 강의안 컨테이너 (한 documentId 가 한 lecture)
export const lectures = pgTable("lectures", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  documentId: uuid("document_id").references(() => documents.id).notNull(),
  title: text("title").notNull(),
  totalChunks: integer("total_chunks").notNull(),   // 진단 시점 snapshot
  totalNodes: integer("total_nodes").notNull(),     // 발급 시점 snapshot
  status: text("status").$type<"in_progress" | "completed">().notNull().default("in_progress"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (t) => ({
  uniqueDoc: uniqueIndex("lectures_user_doc_uniq").on(t.userId, t.documentId),
}))

// chunk_node_map — chunk ↔ node 매핑 (다대다, 상태 머신)
export const chunkNodeMap = pgTable("chunk_node_map", {
  chunkId: uuid("chunk_id").references(() => chunks.id).notNull(),
  nodeId: uuid("node_id").references(() => nodes.id).notNull(),
  state: text("state").$type<"proposed" | "confirmed" | "rejected">().notNull().default("proposed"),
  confidence: real("confidence").notNull(),         // LLM 제안 신뢰도 0~1
  proposedBy: text("proposed_by").$type<"llm" | "user">().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.chunkId, t.nodeId] }),
  idxNode: index("chunk_node_map_node_idx").on(t.nodeId),
}))

// node_mastery — 강의안 도메인 mastery 상태 머신 (pattern_state.theta 와 별도)
export const nodeMastery = pgTable("node_mastery", {
  userId: uuid("user_id").references(() => users.id).notNull(),
  nodeId: uuid("node_id").references(() => nodes.id).notNull(),
  state: text("state").$type<"unseen" | "viewed" | "tested" | "mastered">().notNull().default("unseen"),
  testedAt: timestamp("tested_at"),
  masteredAt: timestamp("mastered_at"),
  lastFailedAt: timestamp("last_failed_at"),
  failCount: integer("fail_count").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.nodeId] }),
  idxUserState: index("node_mastery_user_state_idx").on(t.userId, t.state),
}))

// check_items — 노드별 확인 문항 (LLM 제안, 사용자 신고 가능)
export const checkItems = pgTable("check_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  nodeId: uuid("node_id").references(() => nodes.id).notNull(),
  type: text("type").$type<"cloze" | "order" | "mcq" | "argument">().notNull(),
  prompt: text("prompt").notNull(),
  payload: jsonb("payload").notNull(),              // 타입별 정답·옵션
  status: text("status").$type<"active" | "flagged" | "retired">().notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// check_attempts — mastery 전이 trigger
export const checkAttempts = pgTable("check_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  checkItemId: uuid("check_item_id").references(() => checkItems.id).notNull(),
  correct: boolean("correct").notNull(),
  response: jsonb("response").notNull(),
  attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
}, (t) => ({
  idxUserItem: index("check_attempts_user_item_idx").on(t.userId, t.checkItemId),
}))

// lecture_badges — 완주 뱃지
export const lectureBadges = pgTable("lecture_badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  lectureId: uuid("lecture_id").references(() => lectures.id).notNull(),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  // 발급 시점 snapshot — 이후 노드/엣지 변동에도 뱃지는 동결
  coverageSnapshot: jsonb("coverage_snapshot").notNull(),
  masteredNodeIds: jsonb("mastered_node_ids").notNull(),
}, (t) => ({
  uniqueIssue: uniqueIndex("lecture_badges_user_lecture_uniq").on(t.userId, t.lectureId),
}))
```

**edges.kind 분화** — 기존 `edges.type='prerequisite'` 를 `kind: 'logical' | 'pedagogical'` 로 metadata.jsonb 에 추가. SQL `ALTER TABLE` 비파괴.

---

## 3 · 검증 함수 시그니처 (pure functions)

> **LLM = Untrusted Worker. Code = Trusted Judge.** — 모든 판정은 LLM 호출 없이 결정론적.

```ts
// lib/north-star/coverage.ts
export interface CoverageReport {
  totalChunks: number
  mappedChunks: number               // confirmed 만 카운트 (proposed/rejected 제외)
  unmappedChunkIds: string[]
  coveragePct: number                // 0~100
}
export function computeCoverage(args: {
  chunks: { id: string }[]
  mappings: { chunkId: string; nodeId: string; state: ChunkMapState }[]
}): CoverageReport

// lib/north-star/dag.ts
export interface DagReport {
  hasCycle: boolean
  cycles: string[][]                 // 사이클 발견 시 패스 (Tarjan SCC)
  layers: string[][]                 // 위상정렬 후 레이어
  rootNodeIds: string[]              // in-degree 0
}
export function analyzeDag(args: {
  nodeIds: string[]
  edges: { source: string; target: string; kind: "logical" | "pedagogical" }[]
}): DagReport

// lib/north-star/mastery.ts
export type MasteryState = "unseen" | "viewed" | "tested" | "mastered"
export function nextMasteryState(args: {
  current: MasteryState
  event: { type: "view" } | { type: "check_pass"; itemType: CheckItemType } | { type: "check_fail" }
  history: { itemType: CheckItemType; correct: boolean; attemptedAt: Date }[]
}): MasteryState
// 규칙:
//   unseen → viewed (event=view)
//   viewed → tested (첫 check 시도, 정답·오답 무관)
//   tested → mastered (다른 type 의 check 까지 1회 이상 통과, 또는 같은 type 24h 간격 재통과)
//   mastered → tested (check_fail 시 회수, 정직성 원칙)

// lib/north-star/badge.ts
export function canIssueBadge(args: {
  coverage: CoverageReport
  dag: DagReport
  masteryByNode: Map<string, MasteryState>
  nodeIds: string[]
}): { ok: true } | { ok: false; reason: "incomplete_coverage" | "dag_has_cycle" | "unmastered_nodes"; detail: unknown }
```

**단위 테스트 우선** — 위 4함수는 LLM 의존 없음. 다음 세션 첫 작업은 함수 + 테스트.

---

## 4 · UX 윤곽 (어디에 노출)

### 4.1 신규 라우트 후보
- `/v2/lecture/[id]` — 강의안 워크스페이스 (PDF + 노드 DAG + 커버리지 배지 + mastery 진척)
- `/v2/lecture/[id]/coverage` — 커버리지 검수 패널 (미매핑 chunk 리스트, 사용자 승급)
- `/v2/lecture/[id]/check/[nodeId]` — check item 풀이 (mastery 전이 진입점)
- `/v2/lecture/[id]/badge` — 완주 뱃지 share-able 페이지

> **현재 워크스페이스 `/v2/workspace/[itemId]` 와 충돌 X** — 입시 도메인(item) ↔ 강의안 도메인(lecture) 도메인 분리. 둘 다 PDF-centric 이지만 hero 가 다름. 통합은 Q3+ 결정.

### 4.2 핵심 surface 6개
1. **커버리지 배지** — 강의안 hero 헤더에 `📊 94% · 미매핑 4` 배지. 100% 만 emerald.
2. **미매핑 chunk drawer** — "미매핑 4" 클릭 시 우측 drawer 로 chunk 리스트. 각 행에 "노드로 승급 / Deepen 해설로 표시 / 무시" 액션.
3. **DAG 레이아웃 뷰** — 강의안 노드를 layer 별로 정렬. 사이클이면 빨간 경고 + axiom 후보 제안.
4. **mastery 칩** — 각 노드 카드에 `unseen` 회색 → `viewed` 노랑 → `tested` 보라 → `mastered` 에메랄드.
5. **check item 카드** — 클로즈/순서/객관식/논증 4 타입. 통과 시 mastery 전이 + 다음 노드 추천.
6. **완주 뱃지** — 불변식 통과 시 등장. 캡처/공유 가능.

### 4.3 정직성 원칙 (UX 결정)
- 커버리지 99% 면 "거의 다" 가 아니라 **"99%"** 그대로 표시
- mastery 회수 시 "mastered 였는데 회수됨" 알림 명시 — 무음 강등 금지
- 완주 뱃지는 **lecture snapshot 으로 동결** — 발급 후 강의안 변경되어도 뱃지는 변동 X (재발급은 별도 행위)

---

## 5 · LLM 제안 파이프라인

> 사용자 메모리 `feedback_no_internal_taxonomy_exposure` — enum 노출 금지. LLM tool schema 는 internal.

### 5.1 chunk → node 매핑 제안 (Coverage 1차 패스)
- 트리거: 강의안 업로드 후 chunks 추출 직후
- 입력: chunks 200건 (sectionTitle + pageStart + content)
- 출력: `[{ chunkId, proposedNodeLabel, proposedNodeType, confidence, justification }]`
- 신뢰도 임계: `≥ 0.7` 자동 confirmed, 0.4~0.7 admin review, < 0.4 discarded
- 비용: `claude-haiku` (싸고 빠름), 강의안 단위 일괄

### 5.2 prerequisite 엣지 제안 (DAG 1차 패스)
- 트리거: 노드 confirmed 후 모인 시점
- 입력: 노드 label + description + assumedKnowledge
- 출력: `[{ sourceNodeId, targetNodeId, kind, evidence, confidence }]`
- 1차 필터: 코드 — 명시 참조 (`"A 는 B 의 ..."`), embedding cosine similarity
- 2차 LLM judge: "A 를 이해하려면 B 가 필요한가? 이진 + 근거"
- 검증: Tarjan SCC 로 사이클 제거, 사이클 발견 시 axiom 후보 제시

### 5.3 check item 자동 생성
- 트리거: 노드 confirmed + label/description 채워진 시점
- 노드 type 별 템플릿:
  - **definition / theorem** → cloze (정의의 빈칸 채우기)
  - **procedure** → order (단계 순서 배열)
  - **concept** → mcq (개념 정의 5지선다)
  - **argument** → argument (논증 재구성, LLM 일관성 채점)
- 한 노드당 2~4 item, 다른 type 1개 이상 권장 (mastered 전이 조건과 정합)

---

## 6 · 단계별 ship plan

### Stage 1 — 기초 데이터 모델 (1주)
1. drizzle migration (lectures, chunk_node_map, node_mastery, check_items, check_attempts, lecture_badges)
2. `lib/north-star/{coverage, dag, mastery, badge}.ts` — pure functions + 단위 테스트
3. `/api/lectures/[id]/coverage` GET (커버리지 계산만)

**Acceptance**: 빈 강의안 fixture → coverage 0%. chunk 매핑 추가 시 % 갱신. DAG/mastery/badge 함수 단위 테스트 통과.

### Stage 2 — LLM 매핑 + 커버리지 검수 UI (1~1.5주)
1. 업로드 후 chunk→node 매핑 LLM 제안 job (`document-job-runner` 확장)
2. `/v2/lecture/[id]` 셸 + 커버리지 배지 + 미매핑 drawer
3. 사용자 액션 — 매핑 confirm/reject, 미매핑 chunk → 신규 노드 승급

**Acceptance**: PDF 업로드 → 90초 안에 커버리지 ≥80% 도달, 사용자 액션으로 100% 가능.

### Stage 3 — DAG 분화 + 레이어드 뷰 (1주)
1. `edges.kind` 분화 (logical / pedagogical), 기존 prerequisite migration
2. LLM judge pass — 1차 필터 통과 후 이진 판정
3. 레이어드 뷰 컴포넌트 (`/v2/lecture/[id]` 안 또는 별도 탭)
4. Tarjan SCC 사이클 감지 + axiom 후보 UI

**Acceptance**: 강의안 노드 20+ 에서 layer 3 이상, 사이클 0.

### Stage 4 — Check item + Mastery 머신 (1.5~2주)
1. 노드 type 별 check item LLM 생성 job
2. `/v2/lecture/[id]/check/[nodeId]` 풀이 라우트
3. 채점 → check_attempts → mastery 전이 (`nextMasteryState`)
4. 실패 시 prerequisite 역추적 제안 (이미 있는 결손 진단 재사용)

**Acceptance**: 한 노드 cloze 1개 통과 → `tested` 전이. 다른 type 통과 → `mastered`. 실패 → prerequisite 칩 surface.

### Stage 5 — 완주 뱃지 + 공유 (0.5주)
1. `canIssueBadge` 트리거 — 마지막 노드 mastered 시 자동 평가
2. `lecture_badges` 발급 + snapshot 동결
3. `/v2/lecture/[id]/badge` 공유 페이지 + OG 이미지

**Acceptance**: 가짜 강의안 → 모든 노드 mastered + 사이클 0 + coverage 100% → 뱃지 발급. 일부만 mastered → 발급 불가.

**총 추정**: **5~6주**. 사용자 메모리 `project_q1_mvp_decisions.md` "Q1 = 연습 모드만" 결정과 충돌 가능 — 북극성은 **별도 도메인 (강의안)** 이므로 Q1 입시 도메인 일정 영향 X. 병렬 가능.

---

## 7 · 핵심 트레이드오프 결정 (확정)

| 결정 | 선택 | 이유 |
|---|---|---|
| 입시 mastery (`pattern_state.theta`) 와 강의안 mastery 통합? | **분리** | 도메인 다름. theta 는 Elo, mastery 는 상태 머신. 통합 시 무한 야크. |
| chunk → node 매핑 다대다? | **다대다** | 한 chunk 가 여러 노드 근거일 수 있음 (정의문이 여러 개념 도입) |
| 매핑 자동 confirm 임계? | **0.7** | 시작값. 측정 후 튜닝. |
| 사이클 발견 시 자동 axiom? | **수동 승급** | 자동은 위험. LLM 이 axiom 후보 제안 → 사용자 1-click 승급. |
| 완주 뱃지 재발급? | **별도 issuance** | 강의안 갱신 후 별도 발급 행위. 기존 뱃지는 동결. |
| check item 사용자 신고? | **있음** | flagged 상태로 재생성 큐. 메모리 §6.4 "사용자 반박 권한". |
| 강의안 도메인 라우트 prefix? | `/v2/lecture/[id]` | 입시 `/v2/workspace/[itemId]` 와 평행. |

---

## 8 · 미결정 — 다음 세션 첫 30분

다음 세션 진입 시 먼저 합의:

1. **Stage 1 진입 OK?** — drizzle migration + pure functions 만으로 1주, ship risk 낮음.
2. **chunk_node_map.state 머신 디테일** — `proposed` 단계에서 사용자가 직접 confirm 가능? 어드민 검수 거쳐야?
3. **node_mastery vs pattern_state 의 union view 필요?** — 통계 surface 에서 둘 다 노출 시 합쳐서 보여줄지.
4. **lectures.title 의 source** — `documents.title` 그대로 vs 사용자가 따로 명명.
5. **뱃지 OG 이미지** — 정적 SVG vs `@vercel/og` 동적 생성.

---

## 9 · 참조

- `docs/strategy-lecture-mastery.md` — 3원칙 + 책임 분리 (LLM/Code/DB)
- `docs/product-features.md` §2 — 약속 7개 (완결성·DAG·이해 확인·뱃지·멀티모달·반박 권한·확장 시나리오)
- `docs/build-spec/02-schema.md` — 기존 nodes/edges/pattern_state 스키마
- `docs/workspace-v0-phase1-progress.md` — 입시 도메인 워크스페이스 (참고용 평행 도메인)
- 메모리 `project_concept_node_decision.md` — Concept 노드 + draft → published 게이트 (재사용)
- 메모리 `feedback_no_internal_taxonomy_exposure.md` — enum 노출 금지 (UX 준수)
- 메모리 `feedback_korean_english_dual_support.md` — LLM 추출 시 두 언어 동작 필요
