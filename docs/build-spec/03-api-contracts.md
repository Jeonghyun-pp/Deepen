# 03 · API 계약 (lock)

> 모든 엔드포인트의 request/response 스키마. zod 정의 그대로. 변경 시 frontend·backend 동시 PR.

## 공통

### Response 포맷

성공:
```typescript
{ ok: true, data: <엔드포인트별 페이로드> }
```

실패:
```typescript
{ ok: false, error: { code: ErrorCode, message: string, details?: unknown } }
```

### Error codes (`lib/api/errors.ts`)

```typescript
export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
  EXTERNAL_API: 'EXTERNAL_API',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const
```

### Auth

모든 라우트는 `withAuth` 또는 `withRole(['admin'|'teacher'|'org_owner'])` 래퍼. 요청에 `Authorization: Bearer <supabase_access_token>` 또는 쿠키 기반. 미인증 → `401 UNAUTHORIZED`.

### Rate limit

- 일반 API: 60 req/min/user (Postgres 카운터)
- AI 코치 chat: `check_ai_quota` 통과 필수 (티어별)
- OCR: 10 req/min/user

---

## 1. Documents (PDF 업로드)

### POST `/api/documents/upload`
multipart/form-data
**req**: `file: File (PDF), title?: string`
**resp**:
```typescript
{ documentId: string, jobId: string }
```
**flow**: Storage 업로드 → documents row insert → document_jobs queue → resp

### GET `/api/documents`
**req**: query `status?, limit=20, offset=0`
**resp**: `{ items: Document[], total: number }`

### GET `/api/documents/[id]`
**resp**: `{ document: Document, chunks: Chunk[], extractedNodeCount: number }`

### DELETE `/api/documents/[id]`
cascade로 chunks, mappings 삭제

### POST `/api/documents/[id]/reprocess`
실패한 job 재시도. admin 또는 owner만.

---

## 2. Attempts (풀이 제출) — Phase 2 진입점

### POST `/api/attempts` ⭐ 핵심
**req**:
```typescript
{
  itemId: string,
  selectedAnswer: string,         // 객관식 번호 또는 주관식 텍스트
  timeMs: number,
  hintsUsed: number,
  aiQuestions: number,
  selfConfidence: 'sure' | 'mid' | 'unsure',
  mode: 'practice' | 'exam' | 'challenge' | 'recovery' | 'retry',
  ocrImageBase64?: string,        // M2.2+ 펜슬 풀이
}
```
**resp**:
```typescript
{
  attemptResult: {
    label: 'correct' | 'wrong' | 'unsure',
    confidenceScore: number,
    reasonTags: ReasonTag[],
    correctAnswer: string,
    explanation: string,
  },
  masteryUpdate: {
    patternId: string,
    thetaBefore: number,
    thetaAfter: number,
  }[],
  diagnosis: {
    recapNeeded: boolean,
    candidatePrereq?: { patternId: string, deficitProb: number, signature: string[] }[],
  },
  nextAction: {
    type: 'next_item' | 'recap' | 'review' | 'session_end',
    payload?: any,
  },
}
```
**구현 순서**:
1. AttemptResult 분류 (lib/grading/score.ts)
2. user_item_history.result_history append
3. Pattern Elo 갱신 (lib/grading/elo.ts) → pattern_state upsert
4. Phase 3 진단 (lib/recap/diagnose.ts)
5. 8가지 reason_tags 룰 즉시 부여, AI 분류는 비동기 큐
6. 모드별 nextAction 결정 (lib/recommend/policy.ts)

---

## 3. AI Coach (Phase 6)

### POST `/api/ai-coach/chat` ⭐
**req**:
```typescript
{
  itemId?: string,                 // 풀이 컨텍스트 (없을 수도)
  sessionId?: string,
  message: string,
  chipKey?: 'hint' | 'definition' | 'wrong_reason' | 'unfold' | 'variant',  // 5칩 중 하나
}
```
**resp**: streaming SSE
```
event: token
data: { delta: string }

event: card        // 인서트 리캡카드
data: { card: RecapCard }

event: highlight   // 그래프 노드 하이라이트
data: { nodeIds: string[] }

event: done
data: { tokensUsed: number, costUsd: number }
```

**precondition**: `check_ai_quota(userId)` true. 실패 시 `429 QUOTA_EXCEEDED`.

### POST `/api/ai-coach/suggest`
5칩 시안을 컨텍스트별로 customization (선택, M2 이후). Q1엔 정적 lock 카피.
**req**: `{ itemId: string }`
**resp**: `{ chips: { key: ChipKey, label: string }[] }`

---

## 4. Recap (Phase 3)

### POST `/api/recap/diagnose`
**req**: `{ userId?, currentItemId: string }` (userId는 서버가 auth에서)
**resp**:
```typescript
{
  recapNeeded: boolean,
  candidates: {
    patternId: string,
    patternLabel: string,
    grade: string,
    deficitProb: number,
    evidenceCount: number,
  }[],
}
```

### POST `/api/recap/build-card`
**req**: `{ patternId: string, currentItemId: string }`
**resp**:
```typescript
{
  card: {
    patternId: string,
    grade: string,
    name: string,
    durationMin: number,           // 1~3
    whyNeeded: string,
    coreBullets: string[],         // 3줄
    checkQuiz: { question: string, answer: string, hint?: string },
  },
}
```

### POST `/api/recap/quiz/submit`
**req**: `{ cardId: string, userAnswer: string }`
**resp**: `{ correct: boolean, hint?: string }`
정답 시 클라가 `nextAction.type='next_item'` (원래 문제 복귀)로 이동.

---

## 5. Recommend (Phase 5)

### POST `/api/recommend/next`
**req**:
```typescript
{
  mode: SessionMode,
  contextItemId?: string,   // 방금 푼 문제
  targetPatternId?: string, // 챌린지 모드 등
}
```
**resp**:
```typescript
{
  recommendations: {
    type: 'item' | 'recap' | 'similar',
    itemId?: string,
    cardId?: string,
    score: number,
    reason?: string,
  }[],
}
```

### POST `/api/recommend/similar`
**req**: `{ baseItemId: string, k?: number }` (기본 k=5)
**resp**: `{ items: { id, label, difficulty, score }[] }`

### GET `/api/recommend/daily-challenge`
**resp**: `{ items: { id, label, patternId }[] }` (3개)
M3.4 cron이 매일 자정 자동 추출 → 클라 fetch

---

## 6. OCR (M2.2+)

### POST `/api/ocr` ⭐
**req**: `{ itemId: string, imageBase64: string }` (image: PNG, ≤4MB)
**resp**:
```typescript
{
  steps: { stepIdx: number, text: string, errorKind?: string, suggestion?: string }[],
  overallConfidence: number,    // 0~1
  processingTimeMs: number,
}
```
**구현**: Claude Vision (system prompt = 05-llm-prompts §6) → LCS 정렬 (lib/ocr/align-lcs.ts)

---

## 7. Graph (그래프 조회)

### GET `/api/graph/unit/[unitKey]`
unitKey 예: `math2-calc`, `math2-int`
**resp**:
```typescript
{
  nodes: GraphNode[],
  edges: GraphEdge[],
  userState: {
    masteryByPattern: Record<string, { theta: number, beta: number }>,
    deficitCandidates: string[],   // 누적 결손 의심 patternId
    inWrongNoteItems: string[],
  },
}

GraphNode = {
  id, type: 'pattern'|'item', label, grade,
  displayLayer?: 'concept'|'pattern',
  signature?: string[],
  isKiller, frequencyRank, avgCorrectRate,
  visualAttrs?: VisualAttrs,    // lib/graph/encode-visual.ts 결과 (M1.6+ 서버 사이드 인코딩)
}

GraphEdge = {
  id, source, target, type: 'prerequisite'|'contains'|'relatedTo',
  weight?: number,
}
```

### GET `/api/graph/node/[id]/focus`
포커스 3분할 뷰 데이터 (M2.6+)
**resp**:
```typescript
{
  node: GraphNode,
  prereqDag: { nodes: GraphNode[], edges: GraphEdge[] },  // 좌측 DAG
  items: GraphNode[],                                       // 우측 Item 목록 (history 포함)
}
```

---

## 8. Stats (M3.5)

### GET `/api/stats/overview`
**resp**:
```typescript
{
  weeklyMasteryDelta: number,        // 마스터리 평균 변화
  weakNodesReduced: number,          // 약점 노드 감소 수
  totalSolveTimeMin: number,
  weeklyComparison: { week: string, mastery: number }[],
}
```

### GET `/api/stats/timeline`
**req**: query `?from=YYYY-MM-DD&to=YYYY-MM-DD`
**resp**: `{ events: { date, type, payload }[] }`

---

## 9. Billing (M3.1)

### POST `/api/billing/checkout`
**req**: `{ tier: 'pro' | 'pro_plus' }`
**resp**: `{ tossPaymentUrl: string, orderId: string }`

### POST `/api/billing/webhook`
Toss webhook. signature 검증 후 `subscriptions`/`invoices` 갱신.

### POST `/api/billing/cancel`
**resp**: `{ canceledAt: string, currentPeriodEnd: string }`

### GET `/api/billing/me`
**resp**: `{ subscription: Subscription | null, quotaToday: { used: number, limit: number } }`

---

## 10. Admin (M2.6+)

### GET `/api/admin/review/queue`
role=admin 필요
**req**: query `?type=node|edge&limit=50`
**resp**: `{ items: { id, type, payload, sourceDocumentId }[] }`

### POST `/api/admin/nodes/[id]/publish`
**req**: `{ overrides?: Partial<Node> }`
**resp**: `{ node: Node }`
status를 published로 + 옵션 수정

### POST `/api/admin/nodes/[id]/discard`

### POST `/api/admin/edges/[id]/publish` / `/discard`

### POST `/api/admin/patterns/[id]/signature`
**req**: `{ signature: string[] }`

---

## 11. Teacher (M4.2)

### GET `/api/teacher/classes`
role=teacher
**resp**: `{ classes: { id, name, studentCount }[] }`

### GET `/api/teacher/classes/[id]/heatmap`
**resp**:
```typescript
{
  patterns: { id, label }[],
  students: { id, name }[],
  matrix: number[][],   // [studentIdx][patternIdx] = mastery 0~1
}
```

### GET `/api/teacher/students/[id]`
**resp**:
```typescript
{
  student: { id, name },
  graph: GraphResponse,        // /api/graph/unit/* 와 동일 구조
  recentAttempts: AttemptResult[],
  weakPatterns: { id, label, theta }[],
  recordedView: boolean,        // teacher_views insert
}
```

### POST `/api/teacher/students/[id]/note`
**req**: `{ note: string }`

---

## 12. Organizations (M4.1)

### POST `/api/orgs` (owner 가입 시 자동)
### GET `/api/orgs/me`
### POST `/api/orgs/members/invite`
**req**: `{ email: string, role: OrgRole }`

### POST `/api/orgs/classes`
**req**: `{ name: string, teacherId?: string }`

### POST `/api/orgs/classes/[id]/students/import`
CSV 또는 학생 코드 일괄 등록

### POST `/api/orgs/branding`
role=org_owner
**req**: `{ logoUrl?, primaryColor?, customDomain? }`

---

## 13. iOS Bridge (M3.6)

### POST `/api/ios-bridge/upload-drawing`
**req**: `{ itemId, pkDrawingBase64, pngBase64 }` (PKDrawing 보존용 + 렌더된 PNG)
**resp**: `{ drawingId: string }`

### POST `/api/ios-bridge/get-context`
**req**: `{ itemId }` — 웹뷰 진입 시 컨텍스트 동기화

---

## 14. Cron / Worker

### POST `/api/cron/document-jobs/process`
header `Authorization: Bearer ${DOCUMENT_JOB_WORKER_TOKEN}`
**resp**: `{ processed: number, failed: number }`

### POST `/api/cron/daily-challenge`
header `Authorization: Bearer ${CRON_SECRET}`
모든 활성 사용자 cohort 약점 추출 → 알림 큐

### POST `/api/cron/parent-report`
주간 (Sun 09:00 KST), 보호자 등록한 학생만

### POST `/api/cron/embed-items`
신규 publish된 item에 임베딩 부여 (M3.3)

---

## 15. Health / Misc

### GET `/api/health` — `{ ok, version, db, llm }`
### GET `/api/me` — 로그인 사용자 + tier + role

---

## zod 스키마 위치 (lock)

```
lib/api/schemas/
  attempts.ts
  ai-coach.ts
  recap.ts
  recommend.ts
  ocr.ts
  graph.ts
  stats.ts
  billing.ts
  admin.ts
  teacher.ts
  org.ts
  ios.ts
```

각 모듈은 `<EndpointName>RequestSchema`, `<EndpointName>ResponseSchema` 둘 다 export. 핸들러는 `parseRequest(schema, req)` 헬퍼 사용.

## 헬퍼 시그니처 (lock)

```typescript
// lib/api/handler.ts
export function withAuth<T>(handler: (ctx: AuthContext, req: Request) => Promise<T>): Handler
export function withRole(roles: Role[], handler: ...): Handler
export function jsonOk<T>(data: T): Response
export function jsonError(code: ErrorCode, message: string, status?: number): Response
export async function parseRequest<S extends ZodSchema>(schema: S, req: Request): Promise<z.infer<S>>
```
