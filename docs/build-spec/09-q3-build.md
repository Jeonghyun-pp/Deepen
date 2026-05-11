# 09 · Q3 빌드 — 유료 런칭 + 챌린지 + 임베딩 + iPad 베타 검토

> Q3 = M3.1~M3.6, 12주, 수능 D-180 시즌 진입. 본 분기 Definition of Done = "유료 결제 흐름이 작동하고, 차별 자산(임베딩 랭킹·챌린지·보호자 리포트)이 retention을 만들고, iPad 경로 결정이 데이터로 끝나 있다."
>
> 본 문서는 **마일스톤 단위 빌드 계약**이다. 인터페이스·스키마·알고리즘은 02~06이 lock. 본 문서는 (a) 어디에 무엇을 만드는가 (b) 인수 조건 (c) 의존 관계 (d) 작업량 추정만 다룬다.

## 분기 목표 (Q3 Definition of Done)

| # | 목표 | 측정 |
|---|---|---|
| 1 | 결제 흐름 end-to-end 작동 (Toss) | Pro 1건 결제 → 캡 30회/일 정상 적용 → 환불 처리 OK |
| 2 | AI 사용량 캡 정상 enforcement | 캡 도달 시 `429 QUOTA_EXCEEDED`, 다음 날 KST 자정 자동 리셋 |
| 3 | 챌린지 모드 + 재도전 모드 가용 | 5연속 정답 시 LEVEL_UP, recap 통과 시 자동 retry 진입 |
| 4 | 임베딩 cosine 랭킹 활성 | `/api/recommend/similar` k=5 응답 평균 latency ≤ 500ms |
| 5 | 챌린지 퀘스트 cron + 보호자 리포트 운영 | 매일 00:30 KST 발송 0 실패, 주간 리포트 발송율 ≥ 95% |
| 6 | "약점 -N개" framing 통계 대시보드 | M3.5 베타 cohort 30명 만족도 sigh ≥ 4/5 |
| 7 | iPad 네이티브 경로 결정 데이터 | 5~10명 1주 latency A/B 결과로 경로 B 채택 또는 경로 C 잠정 유지 |

## 분기 의존 관계

- **M3.1 (가격 + 캡 활성)** ← Q2 종료 (M2.5 모드 전환 + M2.6 어드민) 필요
- **M3.2 (챌린지 + 재도전)** ← M3.1 (캡), M2.5 (모드 전환 머신)
- **M3.3 (임베딩 랭킹)** ← M2 데이터 누적 (Item 풀 ≥ 500), M3.1 (Pro+ 차별화 카피 위해)
- **M3.4 (cron + 리포트)** ← M3.3 (deficit_boost 완성된 추천 풀), M3.1 (Resend·Edge Functions 인프라)
- **M3.5 (대시보드)** ← M3.4 (집계 데이터)
- **M3.6 (iPad 검토)** ← M3.5 끝나야 cohort 5~10명 확보 가능

## Q3 변경 lock 결정사항 (중복 금지 — 00-INDEX 참조)

- C-9 가격: Free 5회 평생 / Pro 일 30회 / Pro+ 무제한
- C-7 streak/푸시 도입 X — 본 분기 retention은 사회적 hook (보호자 리포트 H.5) + 일 캡 리셋 (A.5) 두 축
- 결제 KR 시장: Toss Payments 표준 결제창 + 빌링키 (자동 결제)
- 보호자 리포트 carbonation: H.5 사회적 accountability 차용. "선생님이 보고 있다" 메시지를 보호자 버전으로 재구성

---

## M3.1 · 가격 티어 + AI 사용량 캡 활성 (2주)

### Goals

1. Toss Payments 표준 결제창으로 Pro/Pro+ 구독 결제 흐름 작동
2. 빌링키 발급 → 매월 자동 결제 (cron) → 실패 시 past_due 전이
3. `check_ai_quota` Postgres 함수가 모든 AI 호출 라우트에서 강제 적용
4. 캡 도달 시 클라에 명시적 카운터 노출 (오르조 A.5 패턴 — "오늘 X/30 사용")
5. 환불·취소 흐름 (사용자 self-service)

### 파일 경로

**신규**:
```
app/api/billing/checkout/route.ts            # POST 결제창 진입 URL 생성
app/api/billing/webhook/route.ts             # POST Toss 웹훅 (signature 검증)
app/api/billing/cancel/route.ts              # POST 구독 취소 (period 끝까지 유지)
app/api/billing/me/route.ts                  # GET 현재 구독 + 오늘 사용량
app/api/cron/billing-renewal/route.ts        # POST 빌링키 자동 결제 (KST 03:00 매일)

app/v2/billing/page.tsx                      # 가격 비교 + 업그레이드 진입
app/v2/billing/_components/PriceTable.tsx
app/v2/billing/_components/CheckoutButton.tsx
app/v2/billing/_components/QuotaCard.tsx     # 사용량 카운터 (홈/풀이 화면에도 재사용)
app/v2/billing/success/page.tsx              # 결제 성공 redirect 도착지
app/v2/billing/fail/page.tsx                 # 실패 redirect

lib/billing/toss-client.ts                   # Toss API wrapper
lib/billing/verify-webhook.ts                # signature 검증 유틸
lib/billing/quota.ts                         # check_ai_quota 클라/서버 동시 호출 helper
lib/billing/tier.ts                          # tier 라벨·가격·캡 정의 (single source of truth)

lib/api/schemas/billing.ts                   # zod 스키마 (03 §9)
lib/api/handler.ts                           # withQuota 미들웨어 추가

drizzle/0010_billing.sql                     # 02 §7 마이그레이션
```

**수정**:
```
app/api/ai-coach/chat/route.ts               # check_ai_quota 게이트 + 카운트 기록
app/api/ai-coach/suggest/route.ts            # 동일
app/v2/_components/HeaderBar.tsx             # QuotaCard 미니버전 노출
lib/db/schema.ts                             # subscriptions, invoices export
lib/env.ts                                   # TOSS_CLIENT_KEY, TOSS_SECRET_KEY 검증
```

### API 엔드포인트 (03 §9 그대로)

| 메서드 | 경로 | 인증 | 비고 |
|---|---|---|---|
| POST | `/api/billing/checkout` | withAuth | tier 선택 → Toss 결제창 URL 반환 |
| POST | `/api/billing/webhook` | (Toss signature) | webhook 진입점, signature 검증 실패 시 401 |
| POST | `/api/billing/cancel` | withAuth | period 끝까지 유지, canceled_at 기록 |
| GET | `/api/billing/me` | withAuth | `{ subscription, quotaToday: { used, limit } }` |
| POST | `/api/cron/billing-renewal` | Bearer CRON_SECRET | 매일 03:00 KST 빌링키 청구 |

### 스키마 변경 (02 §7 적용)

`drizzle/0010_billing.sql`:

```sql
BEGIN;

CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'pro_plus');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'expired');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'active',
  toss_customer_key TEXT,
  toss_billing_key TEXT,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX sub_user_idx ON subscriptions(user_id);
CREATE UNIQUE INDEX sub_user_active_idx ON subscriptions(user_id) WHERE status = 'active';

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  amount_krw INTEGER NOT NULL,
  status TEXT NOT NULL,
  toss_payment_key TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- check_ai_quota 함수는 02 §4 정의 그대로 — 본 마이그레이션에 포함
CREATE OR REPLACE FUNCTION check_ai_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$ ... $$ LANGUAGE plpgsql STABLE;

-- RLS — 사용자 자기 구독만 조회
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_owner ON subscriptions FOR ALL USING (auth.uid() = user_id);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_owner ON invoices FOR SELECT USING (auth.uid() = user_id);

COMMIT;
```

### 컴포넌트 props

```typescript
// app/v2/billing/_components/PriceTable.tsx
type PriceTableProps = {
  currentTier: 'free' | 'pro' | 'pro_plus' | null
  onSelect: (tier: 'pro' | 'pro_plus') => void
}

// app/v2/billing/_components/QuotaCard.tsx
type QuotaCardProps = {
  variant: 'full' | 'mini'        // mini = 헤더 칩, full = 빌링 페이지 카드
  used: number
  limit: number | 'unlimited'
  resetAt: string                  // ISO8601, KST 자정
  onUpgrade?: () => void
}

// lib/billing/tier.ts — 모든 가격 표시의 single source
export const TIERS = {
  free:    { krw: 0,      label: '무료',    aiCap: { kind: 'lifetime', value: 5 } },
  pro:     { krw: 9_900,  label: 'Pro',     aiCap: { kind: 'daily',    value: 30 } },
  pro_plus:{ krw: 19_900, label: 'Pro+',    aiCap: { kind: 'unlimited' } },
} as const
// 가격은 오르조 F 가이드라인 (연 8.5만원 이하) 충족: 9,900원/월 = 11.88만원/년 → 연 결제 시 9.9만원 (할인 17%)으로 lock
```

### 결제 webhook 처리 (Toss signature 검증 필수)

`app/api/billing/webhook/route.ts` 흐름:

1. raw body 읽기 (서명 검증 위해 stringify 전 원본 필요)
2. `Toss-Signature` 헤더 추출
3. `lib/billing/verify-webhook.ts`:
   ```typescript
   import { createHmac, timingSafeEqual } from 'crypto'
   export function verifyTossSignature(rawBody: string, signature: string): boolean {
     const computed = createHmac('sha256', process.env.TOSS_SECRET_KEY!)
       .update(rawBody)
       .digest('base64')
     return timingSafeEqual(Buffer.from(signature), Buffer.from(computed))
   }
   ```
4. 검증 실패 → 401 (재시도 안 받음. Toss는 4xx에 재시도 X)
5. event 타입별 분기:
   - `PAYMENT_STATUS_CHANGED` (status=DONE) → invoice insert + subscription `current_period_end` 갱신
   - `PAYMENT_STATUS_CHANGED` (status=ABORTED|EXPIRED) → past_due 전이
   - `BILLING_KEY_DELETED` → subscription canceled
6. idempotency: `toss_payment_key` 중복이면 200 OK 즉시 반환 (재처리 X)
7. 모든 처리 후 200 OK + `{ ok: true }` 반환 (Toss 사양)

### Cron 설정

| Cron | 시점 (KST) | 경로 | 설명 |
|---|---|---|---|
| 빌링키 자동 결제 | 매일 03:00 | `POST /api/cron/billing-renewal` | `current_period_end < now()` AND `status='active'` 인 구독에 Toss 빌링키 청구 |

Supabase Edge Functions 등록 (`supabase/functions/billing-renewal/index.ts` 또는 `vercel.json` cron):

```json
// vercel.json (실 배포가 Vercel일 경우 — 대안: Supabase Scheduled Triggers)
{
  "crons": [
    { "path": "/api/cron/billing-renewal", "schedule": "0 18 * * *" }
  ]
}
// schedule은 UTC. 03:00 KST = 18:00 UTC (전날)
```

cron 라우트는 헤더 `Authorization: Bearer ${CRON_SECRET}` 검증 필수. 미인증 시 401.

### AI 코치 라우트 quota gate 패턴

`lib/api/handler.ts`에 `withQuota` 추가:

```typescript
export function withQuota(callType: 'chat' | 'suggest_chip', handler: ...) {
  return withAuth(async (ctx, req) => {
    const { rows } = await db.execute(sql`SELECT check_ai_quota(${ctx.userId}) AS ok`)
    if (!rows[0].ok) return jsonError('QUOTA_EXCEEDED', 'AI 코치 사용량 한도에 도달했습니다.', 429)
    const result = await handler(ctx, req)
    // 호출 성공 시 ai_coach_calls insert (callType, tokens, cost)
    return result
  })
}
```

`/api/ai-coach/chat`은 `withQuota('chat', ...)`, `/api/ai-coach/suggest`는 `withQuota('suggest_chip', ...)`로 감쌈.

### 의존 마일스톤

- M2.5 (모드 전환 머신) — 모드별 AI 차단 정책이 캡과 별개로 enforcement 되어야 함
- 환경 변수 lock: `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `CRON_SECRET` (01 §환경변수)

### 작업량 추정

| 항목 | 추정 |
|---|---|
| Toss SDK 통합 + 결제창 흐름 | 3일 |
| webhook + signature 검증 | 2일 |
| 빌링키 자동 결제 cron | 1일 |
| `check_ai_quota` 함수 + `withQuota` 미들웨어 + 라우트 적용 | 2일 |
| 가격 페이지 + QuotaCard (mini/full) | 2일 |
| 환불·취소 흐름 + self-service | 1일 |
| QA (페이먼트 테스트 모드 cohort 5명) | 3일 |
| **합계** | **2주 (10일)** |

### Acceptance criteria

- [ ] Pro 결제 → DB `subscriptions.tier='pro'`, `status='active'` 확인 + 즉시 `check_ai_quota` true
- [ ] Pro 일 30회 도달 → 31번째 호출에서 `429 QUOTA_EXCEEDED`, 클라가 업그레이드 CTA 노출
- [ ] KST 자정 지나면 카운터 0 리셋 (`ai_coach_calls.created_at >= today_kst`)
- [ ] Pro+ 사용자는 quota 게이트 통과 OK (1000회 부하 테스트로 검증)
- [ ] webhook signature 위변조 테스트 → 401 + 데이터 변경 X
- [ ] 빌링키 자동 결제 cron이 `current_period_end` 30일 연장
- [ ] 결제 실패 → past_due → 7일 grace → expired 자동 전이 cron 동작
- [ ] 사용자가 결제 취소 → `current_period_end`까지 Pro 혜택 유지 후 free로 자동 전이

---

## M3.2 · 챌린지 모드 + 리캡 후 재도전 모드 (2주)

### Goals

1. 챌린지 모드 머신 (06 §3) 구현 — 같은 Pattern 안에서 5연속 정답 시 LEVEL_UP
2. 재도전 모드 머신 (06 §5) 구현 — Practice의 sub-state로 recap 통과 후 자동 진입
3. 추천 풀 필터 (04 §4.2) — challenge: 같은 Pattern + difficulty ≥ theta+0.1 / retry: storedItemId 강제
4. 모드 진입 UI — 그래프 노드 우클릭/롱프레스 → "이 유형 챌린지" 진입점 추가
5. 재도전 결과의 recap 효과 측정 — `prereq_deficit_log` 에 evidence 누적

### 파일 경로

**신규**:
```
lib/session/challenge-machine.ts             # XState v5
lib/session/retry-machine.ts                 # Practice의 nested machine로 import
lib/recommend/policy-challenge.ts            # mode='challenge' 분기 (04 §4.1)
lib/recommend/policy-retry.ts                # mode='retry' 분기

app/v2/study/[unitId]/_components/ChallengeEntry.tsx  # 그래프 컨텍스트 메뉴
app/v2/solve/[itemId]/_components/ChallengeProgress.tsx  # streak 표시 (5/5 막대)
app/v2/solve/[itemId]/_components/RetryPrompt.tsx       # recap 통과 후 다이얼로그

tests/unit/session/challenge-machine.test.ts
tests/unit/session/retry-machine.test.ts
```

**수정**:
```
lib/session/practice-machine.ts              # retry-machine 합성 (sub-state)
app/api/recommend/next/route.ts              # challenge·retry 분기 추가
app/api/attempts/route.ts                    # mode='retry' 시 recap 효과 측정 hook
app/v2/study/[unitId]/page.tsx               # ModeSelector에 Challenge 진입점
lib/recommend/score.ts                       # challenge 모드 후보 풀 필터 분기 (M3.3과 함께 fine-tune)
```

### API 엔드포인트 (03 §5, §2 변경 X — 페이로드만 추가)

기존 `POST /api/attempts`, `POST /api/recommend/next` 그대로 사용. 단:

- `POST /api/recommend/next` req에 `mode: 'challenge'` + `targetPatternId` 시 정책 분기
- `POST /api/attempts` req에 `mode: 'retry'` + 서버가 `meta.recapPatternIds` 첨부 → BN re-run

새 응답 필드 추가 (계약 호환):

```typescript
// AttemptResult 응답에 challenge 모드 한정 필드 (선택적)
type ChallengeMeta = {
  streak: number          // 현재 연속 정답
  streakTarget: 5
  difficultyDelta: number // +0.1 등
  leveledUp: boolean      // 본 attempt에서 LEVEL_UP 발생했는지
}
// nextAction.payload에 ChallengeMeta 포함 가능
```

### 스키마 변경

신규 마이그레이션 없음. 기존 테이블 활용:

- `user_item_history.meta` (jsonb 없음 — 02 §2 그대로)에 챌린지 streak 저장 안 함. 대신 `sessions` 테이블의 meta 또는 클라 머신 ctx에만 보관 (서버는 stateless하게 mode/targetPatternId 받아 재계산).
- 단, `attempts` 자체는 영구 보존되므로 `result_history[].signals` 그대로 사용해 streak 재계산 가능.

### 컴포넌트 props

```typescript
// ChallengeEntry.tsx — 그래프 노드 우클릭 메뉴
type ChallengeEntryProps = {
  patternId: string
  patternLabel: string
  userTheta: number       // 시작 난이도 결정용 표시
  onStart: (targetPatternId: string) => void
}

// ChallengeProgress.tsx — 풀이 화면 상단
type ChallengeProgressProps = {
  streak: number
  target: 5
  patternLabel: string
  onAbort: () => void
}

// RetryPrompt.tsx — 모달
type RetryPromptProps = {
  storedItemLabel: string
  recapCardsPassed: number
  onRetry: () => void
  onSkip: () => void
}
```

### 알고리즘 함수 (04 §4.1, §4.2 그대로)

`lib/recommend/policy.ts` 안에 mode별 분기 lock:

```typescript
// 04 §4.1 lock 정책 그대로
function nextActionChallenge(ctx, attempt): NextAction {
  if (attempt.label === 'correct') {
    if (ctx.consecutiveCorrect >= 5) return { type: 'level_up' }
    return { type: 'next_item', payload: { samePattern: true, difficulty: ctx.currentDifficulty + 0.1 } }
  }
  // wrong
  if (ctx.consecutiveWrong >= 2) return { type: 'session_end' }
  return { type: 'next_item', payload: { samePattern: true, difficulty: Math.max(0, ctx.currentDifficulty - 0.1) } }
}

function nextActionRetry(ctx, attempt): NextAction {
  // storedRetryItemId로 강제 이동 후, 결과를 BN re-run에 첨부
  return {
    type: 'next_item',
    payload: {
      itemId: ctx.storedRetryItemId!,
      meta: { source: 'recap_retry', recapPatternIds: ctx.scheduledRecap.map(c => c.patternId) }
    }
  }
}
```

### 추천 풀 필터 (04 §4.2)

| mode | 필터 |
|---|---|
| challenge | `pattern_id = targetPatternId`, `difficulty BETWEEN theta+0.1 AND theta+0.3`, `not recently_solved` |
| retry | `id = storedRetryItemId` (단일 강제) |

challenge 모드는 LEVEL_UP 시 다음 Pattern 선정 = 현재 Pattern의 자식 중 `theta` 가장 낮은 1개 (DAG 위에서). 자식이 없으면 `session_end`.

### 재도전 결과의 recap 효과 측정

`/api/attempts` 핸들러 안:

```typescript
if (mode === 'retry' && body.meta?.source === 'recap_retry') {
  const recapPatternIds = body.meta.recapPatternIds as string[]
  // BN을 해당 patternIds에 한정해 re-run
  for (const pid of recapPatternIds) {
    const before = await getLatestDeficitProb(userId, pid)
    const after = await runBNForPattern(userId, pid)
    await db.insert(prereqDeficitLog).values({
      userId, patternId: pid,
      triggerItemId: body.itemId,
      deficitProbability: after,
      evidenceCount: (await countEvidence(userId, pid)) + 1,
    })
    // 효과 = before - after (양수면 recap이 효과 있었음)
  }
}
```

### 모드 enforcement (06 §7 서버 측 재적용)

`/api/attempts` 라우트 시작부에:

```typescript
if (mode === 'challenge') {
  if (body.aiQuestions > 0 || body.hintsUsed > 0)
    return jsonError('VALIDATION', 'Challenge 모드에서 AI/힌트는 사용할 수 없습니다.')
}
if (mode === 'retry') {
  // storedRetryItemId 위변조 방지 — 서버가 직전 세션의 마지막 recap 통과 itemId를 검증
  // sessions 테이블에서 해당 user의 최근 active session.meta에서 storedRetryItemId 조회 후 일치 확인
}
```

### 의존 마일스톤

- M2.5 (모드 전환 머신 + Practice 머신) — 본 마일스톤은 그 위에 nested
- M3.1 — 의존 X (병행 가능). 단 챌린지 모드는 Pro+ 차별 카피로 활용 (M3.5 stats 화면에서 "오늘 챌린지 N회" 같은 표시는 Pro+만)

### 작업량 추정

| 항목 | 추정 |
|---|---|
| challenge-machine.ts (XState) + 단위 테스트 | 2일 |
| retry-machine.ts + practice-machine 합성 | 2일 |
| ChallengeEntry / ChallengeProgress / RetryPrompt | 2일 |
| 추천 풀 필터 분기 (challenge/retry) | 1일 |
| recap 효과 측정 hook + prereq_deficit_log 누적 | 1.5일 |
| 서버 모드 enforcement 추가 | 0.5일 |
| QA (e2e: practice→recap→retry 풀 사이클 / challenge 5연속 / 1회 오답 후 후퇴) | 1일 |
| **합계** | **2주 (10일)** |

### Acceptance criteria

- [ ] 그래프 Pattern 노드 우클릭 → "이 유형 챌린지" 메뉴 노출 → 시작 → `SOLVING_CHALLENGE` 진입
- [ ] 5연속 정답 → LEVEL_UP → 다음 Pattern 자동 로드 (자식 Pattern 없으면 session_end)
- [ ] 1회 오답 → streak=0 + 더 쉬운 문제 (difficulty -0.1) 출제
- [ ] 2회 연속 오답 → session_end 자동 종료
- [ ] challenge 모드에서 AI 코치 호출 시도 → 클라 disabled + 서버 400 (이중 차단)
- [ ] practice 모드에서 recap 카드 통과 → RetryPrompt 모달 → 재도전 시 storedItemId로 강제 이동
- [ ] 재도전 정답 → `prereq_deficit_log` 에 evidenceCount += 1, before/after deficit 차이 기록
- [ ] 06 §9 단위 테스트 8종 모두 통과

---

## M3.3 · 임베딩 cosine 랭킹 + deficit_boost (2주)

### Goals

1. pgvector 확장 활성 + `nodes.text_embedding vector(1536)` 컬럼 도입
2. `text-embedding-3-large` (OpenAI) 임베딩 백필 — 모든 published Pattern·Item 1회 batch
3. 신규 Item publish 시 cron으로 자동 임베딩 (M3.4와 합류)
4. 04 §4.3 하이브리드 랭킹 활성 (ALPHA=0.30 jaccard, BETA=0.30 cosine, GAMMA=0.15 prereq overlap, DELTA=0.15 weakness alignment, EPSILON=0.10 deficit boost)
5. `/api/recommend/similar` 응답 평균 latency ≤ 500ms (k=5)

### 파일 경로

**신규**:
```
drizzle/0009_pgvector.sql                    # 02 §6 마이그레이션

lib/embeddings/openai-client.ts              # text-embedding-3-large wrapper
lib/embeddings/embed-node.ts                 # 단일 노드 임베딩 (텍스트 조립 + API 호출)
lib/embeddings/batch-embed.ts                # 백필 배치 스크립트 (rate limit 고려)
lib/embeddings/cosine-search.ts              # pgvector 쿼리 helper

lib/recommend/score.ts                       # 04 §4.3 ALPHA/BETA/GAMMA/DELTA/EPSILON 적용
lib/recommend/jaccard.ts                     # signature 자카드 유사도
lib/recommend/prereq-overlap.ts              # requiresPrereq 교집합 비율
lib/recommend/weakness-alignment.ts          # 04 §4.3 weaknessAlignment 함수
lib/recommend/deficit-boost.ts               # 04 §4.3 deficitBoost 함수

scripts/backfill-embeddings.ts               # 1회 실행 스크립트
app/api/cron/embed-items/route.ts            # 신규 publish 노드 자동 임베딩
```

**수정**:
```
lib/db/schema.ts                             # nodes.textEmbedding 컬럼 추가 (Drizzle pgvector 플러그인 또는 raw sql)
app/api/recommend/similar/route.ts           # cosine 검색으로 교체
app/api/recommend/next/route.ts              # 하이브리드 score로 정렬
lib/clients/openai.ts                        # 임베딩 호출 + token_usage 기록
lib/env.ts                                   # OPENAI_API_KEY 검증 (이미 있음 — usage 정도만)
```

### API 엔드포인트

기존 03 §5 그대로:

- `POST /api/recommend/similar` — 응답 schema 변경 없음. 내부 구현만 cosine으로
- `POST /api/recommend/next` — 마찬가지
- `POST /api/cron/embed-items` (신규, 03 §14) — 매시간 신규 publish 노드 임베딩

### 스키마 변경 (02 §6 그대로)

`drizzle/0009_pgvector.sql`:

```sql
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE nodes ADD COLUMN text_embedding vector(1536);
CREATE INDEX nodes_embedding_idx ON nodes USING ivfflat (text_embedding vector_cosine_ops) WITH (lists = 100);

-- 임베딩 누락 노드 추적용 view
CREATE OR REPLACE VIEW nodes_pending_embedding AS
SELECT id, type, label FROM nodes
WHERE text_embedding IS NULL AND status = 'published';

COMMIT;
```

Drizzle 정의 (`lib/db/schema.ts`):

```typescript
import { vector } from 'drizzle-orm/pg-core'
// nodes 테이블에 추가
textEmbedding: vector('text_embedding', { dimensions: 1536 }),
```

### 알고리즘 함수 (04 §4.3, §4.4 lock 그대로)

```typescript
// lib/recommend/score.ts
const ALPHA = 0.30, BETA = 0.30, GAMMA = 0.15, DELTA = 0.15, EPSILON = 0.10

function score(item: ItemWithMeta, base: ItemWithMeta, user: UserState): number {
  return ALPHA * jaccard(item.signature, base.signature)
       + BETA  * cosine(item.embedding, base.embedding)
       + GAMMA * overlap(item.requiresPrereq, base.requiresPrereq)
       + DELTA * weaknessAlignment(item, user)
       + EPSILON * deficitBoost(item, user)
}
```

cosine 자체는 pgvector `<=>` 연산자로 SQL에서 1차 sort → top 50 가져온 뒤 클라/서버 메모리에서 5요소 가중합 재정렬. 임베딩만으로는 약점/결손 boost가 안 들어가므로 reranking 필수.

### 백필 + 임베딩 텍스트 (04 §4.4 그대로)

입력 텍스트 lock:
```
${label}\n\n${signature.join(', ')}\n\n${content.slice(0, 2000)}
```

`scripts/backfill-embeddings.ts`:

```typescript
// 모든 published 노드 조회 → 100개씩 batch
// OpenAI batch endpoint (text-embedding-3-large) — input 배열 크기 제한 2048 차원
// Pro 사용량 = 1000 노드 × 평균 500 token = 50만 token = $0.065
// Rate limit: 3000 RPM (text-embedding-3-large) → 100/batch × 30 batches/min 충분
```

### Cron 설정

| Cron | 시점 (KST) | 경로 | 설명 |
|---|---|---|---|
| 신규 노드 임베딩 | 매시간 0분 | `POST /api/cron/embed-items` | `nodes_pending_embedding` view 조회 → batch 임베딩 |

```json
// vercel.json 추가
{ "path": "/api/cron/embed-items", "schedule": "0 * * * *" }
```

### 의존 마일스톤

- Q2 종료 — Item 풀 ≥ 500개 누적 (그 미만이면 cosine 의미 없음)
- M3.1 — Pro+ 차별 카피에 "고급 추천" 명시 (cosine 랭킹 = Pro+ 전용 기능 X. Free/Pro도 동일 랭킹 — 단 사용량 캡으로 차별)

### 성능 목표

- `/api/recommend/similar` p95 ≤ 500ms (k=5)
  - pgvector ivfflat 쿼리: ≤ 50ms (10K 노드 기준)
  - reranking: ≤ 100ms (top-50 메모리 가중합)
  - 네트워크 + JSON 직렬화: ≤ 100ms
  - 여유 ≤ 250ms
- 임베딩 cache hit 측정: 동일 base_item 1분 내 재요청 시 redis cache (M3.4와 합류). M3.3 단계는 cache 없이 raw 측정만

### 작업량 추정

| 항목 | 추정 |
|---|---|
| pgvector 마이그레이션 + Drizzle vector 컬럼 | 1일 |
| OpenAI embedding wrapper + token_usage 통합 | 1일 |
| 백필 스크립트 + 1회 실행 (Q2 누적 500~1000개) | 1.5일 |
| jaccard / prereq_overlap / weakness_alignment / deficit_boost 4함수 | 2일 |
| 하이브리드 score 통합 + similar/next 라우트 교체 | 2일 |
| 임베딩 cron + nodes_pending_embedding view 활용 | 1일 |
| 성능 측정 + ivfflat lists 튜닝 | 1.5일 |
| **합계** | **2주 (10일)** |

### Acceptance criteria

- [ ] 백필 후 `nodes_pending_embedding` view 카운트 0
- [ ] 신규 publish Item 1시간 안에 임베딩 부여됨
- [ ] `/api/recommend/similar` (k=5) p95 ≤ 500ms (Sentry custom metric)
- [ ] 같은 Pattern 다른 Item 추천 시 cosine 상위 5개가 동일 Pattern에 속할 확률 ≥ 0.7 (validation set 측정)
- [ ] deficit_boost가 활성된 사용자(deficitMap 비어있지 않음)에 대해 추천 결과 상위 1개가 deficitMap 패턴을 건드릴 확률 증가 (A/B로 EPSILON=0 vs 0.10 비교)
- [ ] 임베딩 호출 비용 token_usage 테이블 기록 정상

---

## M3.4 · 챌린지 퀘스트 cron + 보호자 리포트 (2주)

### Goals

1. 데일리 챌린지 퀘스트 — 매일 00:30 KST 사용자별 약점 3문제 추출 → 인앱 알림 (push X, 헤더 배지)
2. 주간 보호자 리포트 — 매주 일 09:00 KST 발송 (Resend 템플릿)
3. 보호자 등록 흐름 — 학생이 보호자 이메일 입력 + 보호자 1회 동의 (이메일 magic link)
4. 리포트 carbonation = 사회적 hook (오르조 H.5 응용) — "선생님이 보고 있다" → "보호자가 보고 있다" framing
5. AI 알림 카피 생성 (05 §9 Haiku 호출)

### 파일 경로

**신규**:
```
app/api/cron/daily-challenge/route.ts        # 03 §14
app/api/cron/parent-report/route.ts          # 03 §14
app/api/parents/register/route.ts            # 보호자 이메일 등록 + 동의 메일 발송
app/api/parents/confirm/route.ts             # 보호자 동의 magic link 처리
app/api/parents/unsubscribe/route.ts

app/v2/settings/parents/page.tsx             # 보호자 등록 UI
app/v2/_components/DailyChallengeBadge.tsx   # 헤더 배지 + 클릭 시 풀이 화면 진입

lib/email/render-report.tsx                  # 05 §8 — React Email 템플릿
lib/email/parent-consent.tsx                 # 보호자 동의 magic link 메일
lib/email/send.ts                            # Resend wrapper (재시도 + bounce 처리)

lib/notifications/daily-challenge.ts         # 약점 3문제 추출 로직
lib/notifications/parent-report.ts           # 주간 데이터 집계 + LLM 요약 호출

drizzle/0011_parents.sql                     # parents 테이블 (선택 — users 테이블 확장도 가능)
```

**수정**:
```
lib/db/schema.ts                             # parents 또는 users.parent_email 컬럼
lib/clients/claude.ts                        # Haiku 카피 생성 함수 추가
```

### API 엔드포인트 (03 §14, 신규 §보호자)

| 메서드 | 경로 | 인증 | 비고 |
|---|---|---|---|
| POST | `/api/cron/daily-challenge` | Bearer CRON_SECRET | 매일 00:30 KST. 모든 활성 사용자 cohort 약점 추출 + DailyChallengeBadge 활성화 |
| POST | `/api/cron/parent-report` | Bearer CRON_SECRET | 매주 일 09:00 KST. parent_email confirmed 사용자만 |
| POST | `/api/parents/register` | withAuth | req: `{ email }` |
| GET | `/api/parents/confirm?token=...` | (token) | 동의 magic link landing |
| POST | `/api/parents/unsubscribe` | (token) | one-click unsubscribe |
| GET | `/api/recommend/daily-challenge` | withAuth | 03 §5에 이미 존재 — 클라가 cron 결과 fetch |

### 스키마 변경

옵션 A (단순): `users` 테이블에 컬럼 추가:

```sql
-- drizzle/0011_parents.sql
BEGIN;
ALTER TABLE users
  ADD COLUMN parent_email TEXT,
  ADD COLUMN parent_consent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN parent_unsubscribed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX users_parent_consent_idx ON users(parent_consent_at) WHERE parent_consent_at IS NOT NULL;
COMMIT;
```

옵션 B (확장 — 다중 보호자 미래 대응): `parents` 별도 테이블. M3.4는 옵션 A로 lock — 다중 보호자 요구 시 M4 또는 이후 마이그레이션.

추가로 `daily_challenge_log` (선택, 발송 idempotency) — 단순 구현 위해 cron 멱등성을 application-level (오늘 자정 이후 already_generated 플래그 in-memory)로 처리하고 별도 테이블 X. 운영 안정성 필요 시 M3.5에서 도입.

### 알고리즘 — 약점 3문제 추출 (`lib/notifications/daily-challenge.ts`)

```typescript
async function pickDailyChallengeItems(userId: string): Promise<{ itemId: string; patternId: string; patternLabel: string }[]> {
  // 1) 약점 Pattern top 3 = pattern_state.theta 가장 낮은 (단 attemptCount >= 3 — cold 노드 제외)
  const weakPatterns = await db.execute(sql`
    SELECT p.id, p.label
    FROM pattern_state ps
    JOIN nodes p ON p.id = ps.pattern_id
    WHERE ps.user_id = ${userId} AND ps.attempt_count >= 3
    ORDER BY ps.theta ASC
    LIMIT 3
  `)

  // 2) 각 Pattern에서 사용자가 아직 안 푼 Item 1개 (difficulty ≈ theta)
  const items = await Promise.all(weakPatterns.map(async p => {
    const item = await pickItem({
      patternId: p.id,
      excludeRecentlySolvedDays: 7,
      difficultyAround: pState.theta,
    })
    return { itemId: item.id, patternId: p.id, patternLabel: p.label }
  }))

  return items
}
```

cohort sweep:
```typescript
// /api/cron/daily-challenge route
const activeUsers = await db.select().from(users).where(/* last_active_at >= 14 days */)
for (const u of activeUsers) {
  const items = await pickDailyChallengeItems(u.id)
  // 결과를 users.meta.daily_challenge 또는 별도 캐시에 저장 (TTL = 다음 자정)
  // 캐시 = Redis 또는 단순 jsonb 컬럼
}
```

### 알림 카피 (05 §9 Haiku)

매일 cron에서 cohort 1000명 이상 시 카피 생성을 batch 처리 (Haiku 1회 호출당 5명 카피 묶음 등). 카피 lock 형식:

```
오늘의 도전: ○○○ 유형 3문제 (5분)
```

기본 템플릿이고, Haiku가 학생별로 microtweak ("판별식 마무리 가자!" 같이) 가능.

### 보호자 리포트 (`lib/notifications/parent-report.ts`)

```typescript
async function buildParentReport(userId: string): Promise<ParentReportData> {
  const studentName = await getStudentDisplayName(userId)
  const since = subDays(new Date(), 7)

  const totalAttempts = await countAttempts(userId, since)
  const masteryDelta = await getMasteryDelta(userId, since)        // 평균 theta 변화
  const weakPatternsBefore = await countWeakPatterns(userId, subDays(since, 7))
  const weakPatternsAfter = await countWeakPatterns(userId, new Date())
  const topImproved = await getTopImprovedPatterns(userId, since, 3)
  const topConcerns = await getTopConcernPatterns(userId, since, 3)
  const minutesStudied = await getStudyMinutes(userId, since)

  // LLM 요약 (05 §8)
  const summary = await renderSummaryWithLLM({
    studentName, totalAttempts, masteryDelta,
    weakReduced: weakPatternsBefore - weakPatternsAfter,
    minutesStudied,
  })

  return { studentName, since, summary, masteryDelta, /* ... */ }
}
```

### 이메일 템플릿 (`lib/email/render-report.tsx`)

`@react-email/components` 사용. 구조:

```
헤더: "○○님의 이번 주 학습 리포트"
본문 1: LLM 요약 단락 (4문장)
본문 2: 숫자 카드 — "약점 N개 → N-2개", "공부 시간 +X시간", "마스터리 +0.05"
본문 3: 약점 그래프 미니 (texts only, 이미지 X — 첨부 안 하기)
본문 4: 사회적 hook — "보호자께서 보고 계시는 건 학생에게 큰 응원입니다"
푸터: 구독 해지 링크 (one-click)
```

### Cron 설정

| Cron | 시점 (KST) | 경로 |
|---|---|---|
| 데일리 챌린지 | 매일 00:30 | `POST /api/cron/daily-challenge` |
| 보호자 리포트 | 매주 일 09:00 | `POST /api/cron/parent-report` |
| 신규 노드 임베딩 (M3.3) | 매시간 0분 | `POST /api/cron/embed-items` |

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/daily-challenge",  "schedule": "30 15 * * *" },  // 00:30 KST = 15:30 UTC
    { "path": "/api/cron/parent-report",    "schedule": "0 0 * * 0" },    // 일 09:00 KST = 일 00:00 UTC
    { "path": "/api/cron/embed-items",      "schedule": "0 * * * *" },
    { "path": "/api/cron/billing-renewal",  "schedule": "0 18 * * *" }
  ]
}
```

cron 라우트 모두 `Authorization: Bearer ${CRON_SECRET}` 필수.

### 보호자 동의 흐름

1. 학생이 `/v2/settings/parents`에서 보호자 이메일 입력 → POST `/api/parents/register`
2. 서버: `users.parent_email` set + magic link 토큰 (JWT, 7일 만료) 생성 → Resend 발송
3. 보호자가 이메일 클릭 → GET `/api/parents/confirm?token=...` → `parent_consent_at = now()` 기록 → 단순 HTML 페이지 ("동의가 완료되었습니다. 매주 일 09:00 KST에 첫 리포트가 발송됩니다.")
4. 매주 cron이 `parent_consent_at IS NOT NULL AND parent_unsubscribed_at IS NULL` 사용자만 발송
5. 모든 이메일 푸터에 unsubscribe 링크 — POST `/api/parents/unsubscribe?token=...`

### 의존 마일스톤

- M3.3 — 약점 추출이 `pattern_state.theta` 안정화 후라야 의미 있음
- M3.1 — Resend 환경변수 (`RESEND_API_KEY`) — 이미 01에 lock

### 작업량 추정

| 항목 | 추정 |
|---|---|
| daily-challenge cron + 추출 로직 + DailyChallengeBadge | 2일 |
| parent-report cron + 데이터 집계 함수 | 2일 |
| LLM 요약 (Haiku 카피, Opus 요약) 통합 | 1일 |
| Resend 이메일 템플릿 (React Email) + 발송 + bounce 처리 | 2일 |
| 보호자 동의 magic link + unsubscribe | 1.5일 |
| /v2/settings/parents UI | 1일 |
| QA (테스트 cohort 5명에게 1주 발송) | 0.5일 |
| **합계** | **2주 (10일)** |

### Acceptance criteria

- [ ] 매일 00:30 KST cron 동작 — 활성 사용자 1000명 기준 5분 안에 완료
- [ ] DailyChallengeBadge 클릭 → 첫 추천 문제 화면 진입
- [ ] 매주 일 09:00 KST 보호자 리포트 발송 성공율 ≥ 95% (Resend bounce 제외)
- [ ] 보호자 magic link 동의 흐름 end-to-end 작동 (3분 안에 완료)
- [ ] unsubscribe one-click 작동 — 다음 주 cron에서 발송 안 함
- [ ] 리포트 LLM 요약이 음수 표현 없이 4문장 이내 (05 §8 규칙 준수)
- [ ] 모든 cron이 `Bearer CRON_SECRET` 미인증 시 401

---

## M3.5 · 통계 대시보드 + "약점 -N개" framing (1주)

### Goals

1. `app/v2/stats/` 페이지 — 주간 마스터리 변화, 약점 노드 변화, 풀이 시간 누적
2. "지난 주 약점 N개 → 이번 주 N-2개" 같은 개선 framing (오르조 H.3 응용)
3. 풀이 시간 분포 (오르조 C.2 검증 패턴 — 정답률 + 시간 동시 표시)
4. 데이터는 M3.4 cron 결과 + 실시간 집계 혼합

### 파일 경로

**신규**:
```
app/v2/stats/page.tsx                        # 메인 대시보드
app/v2/stats/_components/MasteryDeltaCard.tsx
app/v2/stats/_components/WeakNodesReducedCard.tsx
app/v2/stats/_components/SolveTimeBreakdown.tsx
app/v2/stats/_components/WeeklyComparisonChart.tsx   # recharts 또는 custom svg
app/v2/stats/_components/PatternHeatmap.tsx          # mini heatmap (Pattern × week)

app/api/stats/overview/route.ts              # 03 §8
app/api/stats/timeline/route.ts              # 03 §8

lib/stats/aggregate.ts                       # 집계 쿼리 (재사용 — 보호자 리포트도 호출)
lib/stats/cache.ts                           # 5분 TTL 캐시 (Postgres NOTIFY 또는 Redis)
```

**수정**:
```
app/v2/_components/HeaderBar.tsx             # "통계" 메뉴 항목 추가
```

### API 엔드포인트 (03 §8 그대로)

```
GET /api/stats/overview
  → { weeklyMasteryDelta, weakNodesReduced, totalSolveTimeMin, weeklyComparison: [{ week, mastery }] }

GET /api/stats/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD
  → { events: [{ date, type, payload }] }
```

### 스키마 변경

없음. 기존 `pattern_state`, `user_item_history.result_history`, `attempts` (또는 동등 테이블) 만으로 집계.

집계 view 추가 (성능 위해):

```sql
-- drizzle/0012_stats_views.sql (선택 — M3.5 안에 포함)
CREATE OR REPLACE VIEW user_weekly_stats AS
SELECT
  user_id,
  date_trunc('week', created_at AT TIME ZONE 'Asia/Seoul') AS week_start,
  COUNT(*) AS attempts,
  AVG((result_history->-1->>'confidence_score')::float) AS avg_confidence,
  ...
FROM user_item_history, jsonb_array_elements(result_history) ...
GROUP BY user_id, week_start;
```

view는 정확한 집계가 비싸지면 materialized view + 30분 refresh로 변경 (Q3 안에는 일반 view로 시작).

### 컴포넌트 props

```typescript
// MasteryDeltaCard
type MasteryDeltaCardProps = {
  thisWeek: number    // 평균 theta
  lastWeek: number
  changeArrow: 'up' | 'down' | 'flat'
}

// WeakNodesReducedCard ⭐ Deepen 특화 retention 카피
type WeakNodesReducedCardProps = {
  before: number      // 지난 주
  after: number       // 이번 주
  reducedPatterns: { id: string; label: string }[]   // 약점에서 벗어난 Pattern들
}

// SolveTimeBreakdown — 오르조 C.2 패턴
type SolveTimeBreakdownProps = {
  byDifficulty: { difficulty: 'easy' | 'mid' | 'hard'; avgMs: number; correctRate: number }[]
}

// WeeklyComparisonChart
type WeeklyComparisonChartProps = {
  weeks: { week: string; mastery: number; attempts: number }[]
  highlight?: 'mastery' | 'attempts'
}
```

### "약점 -N개" framing 알고리즘

```typescript
// lib/stats/aggregate.ts
async function getWeakNodesDelta(userId: string): Promise<{ before: number; after: number; reduced: Pattern[] }> {
  const TAU_WEAK = 0.4   // theta < 0.4 = 약점
  const lastWeekEnd = startOfWeek(new Date())
  const lastWeekStart = subWeeks(lastWeekEnd, 1)

  // 지난 주말 시점의 weakPatterns
  const before = await getWeakPatternsAt(userId, lastWeekStart, TAU_WEAK)
  const after = await getWeakPatternsAt(userId, new Date(), TAU_WEAK)

  const reduced = before.filter(b => !after.find(a => a.id === b.id))
  return { before: before.length, after: after.length, reduced }
}
```

`getWeakPatternsAt` 은 `pattern_state.last_updated_at` 기준으로 그 시점 스냅샷 재구성. 정확한 스냅샷은 attempt 단위 재계산 필요 — Q3 단순화 버전:
- 현재 `pattern_state` snapshot (after)
- 1주 전 시점 snapshot은 `pattern_state` last_updated_at 무관하게 기록 안 됨 → 보완: M3.5 마이그레이션에 `pattern_state_snapshots` 주간 cron (M3.4 cron 안에 묶어서) 도입
  - 또는 attempt 단위로 reconstruct: `attempts WHERE created_at < lastWeekStart` 만으로 Elo replay (성능 위해 캐시)

권장: `pattern_state_snapshots` 주간 cron — M3.4 parent-report cron이 발송 직후 동시에 stats snapshot도 저장. 단순하고 정확.

### 의존 마일스톤

- M3.4 — parent-report cron이 stats snapshot도 저장하는 구조면 의존
- M3.3 — 의존 X (단 추천 정확도가 stats에 반영되는 영향 있음)

### 작업량 추정

| 항목 | 추정 |
|---|---|
| /api/stats/overview + aggregate.ts | 1.5일 |
| WeakNodesReducedCard + SolveTimeBreakdown + WeeklyComparisonChart | 2일 |
| 캐시 + view 또는 materialized view | 1일 |
| pattern_state_snapshots 주간 cron 추가 | 0.5일 |
| /api/stats/timeline (타임라인 events) | 0.5일 |
| QA + 디자인 polish | 0.5일 |
| **합계** | **1주 (5.5일)** |

### Acceptance criteria

- [ ] `/v2/stats` 진입 후 1초 안에 메인 카드 4종 렌더 (캐시 hit 시 200ms)
- [ ] WeakNodesReducedCard에 "지난 주 약점 N개 → 이번 주 N-2개" 카피 + 빠진 패턴 목록 노출
- [ ] SolveTimeBreakdown — easy/mid/hard 3분위 정답률 + 평균 풀이 시간
- [ ] WeeklyComparisonChart — 4주 막대 차트, mastery 또는 attempts 토글
- [ ] 보호자 리포트와 동일한 숫자 — 같은 주에 동일한 weakNodesReduced 값 (집계 함수 공유 검증)
- [ ] timezone KST 자정 기준 주 경계 정확

---

## M3.6 · iPad 네이티브 베타 검토 (3주)

### Goals

1. iPad 베타 앱 빌드 — SwiftUI + WKWebView로 메인 라우트 wrapping (경로 B 가설)
2. PencilKit 기반 풀이 입력 (오르조 C.1 검증 패턴)
3. 5~10명 학생 1주 latency A/B 테스트 — 경로 B (네이티브 wrapping) vs 경로 C (모바일 웹 PWA)
4. 데이터 기반 결정: 경로 B 채택 vs 경로 C 잠정 유지
5. 결정 기록을 분기 retro 문서에 첨부 (별도 spec 변경 PR 트리거)

### 경로 정의 (05 §iOS, 01 §iOS)

| 경로 | 정의 | 장단점 |
|---|---|---|
| **B (네이티브 wrapping)** | SwiftUI 컨테이너 + 메인 라우트는 WKWebView 임베드. PencilKit 풀이 입력만 네이티브, 그 외 화면은 웹뷰 | (+) 풀이 latency 우수 (ink rendering 네이티브) (+) PencilKit 표준 위에 자연스러움 (-) 빌드·배포 cost (App Store 심사) |
| C (모바일 웹) | 그냥 PWA로 iPad에서 사파리 풀이 | (+) 빌드 X (-) ink latency 한계 + Apple Pencil API 부분만 가용 |

오르조는 경로 A (full native) — Deepen이 그걸 1년 안에 따라가긴 자원 부족. 본 마일스톤은 **경로 B vs C 결정**.

### 파일 경로

**신규 (별도 git subdir or monorepo `deepy-ios/`)**:
```
deepy-ios/
├── DeepyApp.swift                           # @main
├── Modules/
│   ├── WebViewContainer/                    # WKWebView wrapper + bridge
│   │   ├── ContentView.swift
│   │   ├── WebViewModel.swift
│   │   └── JSBridge.swift                   # postMessage ↔ Swift
│   ├── PencilKit/
│   │   ├── DrawingView.swift                # PencilKit canvas
│   │   ├── DrawingExporter.swift            # PNG + PKDrawing 직렬화
│   │   └── DrawingViewModel.swift
│   └── Auth/
│       └── AuthBridge.swift                 # Supabase 토큰 공유 (Keychain)
├── Resources/
│   ├── Assets.xcassets
│   └── Info.plist                           # camera/photo X, pencil 권한만
├── fastlane/
│   ├── Fastfile                             # 빌드 + TestFlight 배포
│   └── Appfile
└── README.md
```

**신규 (웹)**:
```
app/api/ios-bridge/upload-drawing/route.ts   # 03 §13
app/api/ios-bridge/get-context/route.ts
lib/api/schemas/ios.ts
```

**수정 (웹)**:
```
app/v2/solve/[itemId]/page.tsx               # window.__DEEPY_IOS__ 감지 → 네이티브 풀이 호출 분기
```

### API 엔드포인트 (03 §13 그대로)

```
POST /api/ios-bridge/upload-drawing
  req: { itemId, pkDrawingBase64, pngBase64 }
  resp: { drawingId }

POST /api/ios-bridge/get-context
  req: { itemId }
  resp: { item, contextChain, userMastery }
```

### 컴포넌트 (Swift)

```swift
// DrawingView.swift
struct DrawingView: UIViewRepresentable {
    @Binding var drawing: PKDrawing
    let canvasSize: CGSize
    let onStroke: (PKStroke) -> Void  // 스트로크 단위 콜백 (latency 측정용)
}

// JSBridge.swift — WKWebView ↔ Swift 메시지
class JSBridge: NSObject, WKScriptMessageHandler {
    func userContentController(_ uc: WKUserContentController, didReceive msg: WKScriptMessage) {
        // msg.body = { "type": "openDrawing", "itemId": "..." }
        // → DrawingView 모달로 띄움
        // 완료 시 web으로 postMessage({ type: "drawingDone", drawingId })
    }
}
```

### Latency A/B 측정 프로토콜

```
경로 B 측정:
  - 첫 스트로크 시작 → 화면 픽셀 갱신 latency (Instruments Time Profiler)
  - 풀이 완료 → 서버 업로드 → OCR 결과 도착 latency (네트워크 + 서버)
  - 메모리 사용량 (10 페이지 풀이 누적 시)

경로 C 측정:
  - 같은 시나리오 PWA에서
  - Apple Pencil 입력은 PointerEvent + force/azimuth 캡처
  - touch-action: none + canvas 직접 렌더 (가장 빠른 PWA 경로)

비교 지표:
  - p50 stroke latency (목표: < 16ms = 60fps)
  - p95 stroke latency
  - 1페이지 풀이 (200 strokes) 시 단말 발열 (배터리 % 변화)
  - 사용자 만족도 (5-point Likert)
```

cohort: 5~10명. 참여자 절반은 경로 B, 절반은 경로 C로 1주씩 사용 후 cross-over (같은 학생이 양쪽 경험). 한 주차 = 30~50 attempt.

### 의사결정 게이트

```
if (B의 p95 stroke latency < 32ms AND C의 p95 > 50ms AND 만족도 B - C > 0.5):
  경로 B 채택 → M4 빌드 spec에 11-ios-app.md 활성 (Q4 베타 제출)
else if (B와 C 차이가 latency < 16ms 이내 AND 만족도 차이 < 0.3):
  경로 C 잠정 유지 → 빌드·배포 cost 절감, M4에서 PWA 최적화에 자원 투입
else:
  → 데이터 추가 수집 (cohort 30명으로 확대) → M4에서 재검토
```

결정 결과는 본 spec의 `00-INDEX.md` 의사결정 기록에 신규 row 추가:

```
| C-10 | iPad 경로 = B (or C) | M3.6 latency cohort 데이터 |
```

### 빌드·배포

- fastlane Fastfile에 `beta` lane: `gym → pilot upload to TestFlight`
- 코드 사이닝: Apple Developer 계정 + provisioning profile 신청 (M3.6 시작 시 1주 lead time)
- TestFlight cohort 초대: 5~10명 이메일

### 의존 마일스톤

- M3.5 — cohort 5~10명 확보 (활성 학생 cohort에서 모집)
- 기존 웹 완성도가 cohort 만족도의 기저 — Q1~Q2 안정화 필수

### 작업량 추정 (3주, 15일)

| 항목 | 추정 |
|---|---|
| Apple Developer 계정 + provisioning + Xcode 프로젝트 셋업 | 2일 |
| WKWebView wrapper + Auth Bridge + JSBridge | 3일 |
| PencilKit DrawingView + PNG/PKDrawing export + 업로드 | 3일 |
| iOS bridge 라우트 (web) + 통합 | 1일 |
| TestFlight 배포 + 5~10명 onboarding | 1일 |
| 1주 cohort 운영 + latency 측정 | 5일 (cohort 1주, 그동안 다른 분기 spec 보조) |
| 데이터 분석 + 결정 문서 작성 + INDEX 업데이트 PR | 1일 (cohort 끝난 직후) |
| **합계** | **3주 (15일, 그중 1주는 운영 대기)** |

> 주: 1주 cohort 운영 동안 엔지니어가 idle하지 않도록, M3.6 시작 시점이 M3.5 종료와 겹쳐서 5+5+5 분배가 자연스럽다 (셋업 1주 → cohort 1주 → 분석 1주).

### Acceptance criteria

- [ ] iPad 베타 앱이 TestFlight에 배포되어 5명 이상 설치 성공
- [ ] PencilKit 풀이 입력 → 서버 업로드 → OCR 결과 표시 end-to-end 작동
- [ ] cohort 1주 동안 평균 30 attempt/명 누적
- [ ] latency 측정값 4종 (p50/p95 stroke, 업로드, OCR) 양 경로 수집 완료
- [ ] 만족도 설문 회수율 ≥ 80%
- [ ] 의사결정 문서 (`docs/q3-ios-decision-2026-XX-XX.md`) + `00-INDEX.md` 의사결정 row C-10 추가 PR 머지

---

## Q3 분기 종료 retro (2주차 끝나는 마지막 주)

### 데이터 점검

- M3.1: Pro 결제 건수 / 빌링 실패율 / 캡 도달율 (Pro 사용자 중 30회 도달 %)
- M3.3: `/api/recommend/similar` p95, deficit_boost A/B 결과
- M3.4: 보호자 리포트 발송 성공율, 클릭율, 학생 다음날 retention (리포트 발송 다음날 active 비율)
- M3.5: stats 페이지 weekly active rate
- M3.6: 경로 결정 (B / C / 추가 데이터)

### 분기 retro 문서

`docs/q3-retro-2026-XX.md` 생성. 다음 항목 lock 형식:

1. 분기 목표 7개 vs 실 달성 (✅/❌/△)
2. 학습한 것 (예상 빗나간 가설)
3. 다음 분기에 들고 갈 것
4. spec 변경 누적 (lock 깬 PR들)

---

## 결정 lock 일람 (Q3 한정)

| ID | 결정 | 근거 |
|---|---|---|
| C-9 (재확인) | 가격: Free 5회 평생 / Pro 9,900원·일 30회 / Pro+ 19,900원·무제한 | 오르조 F + 본 분기 retention 엔진 |
| C-7 (재확인) | streak/푸시 도입 X | 오르조 H.1 부재 finding 차용 |
| C-10 (예정) | iPad 경로 = B 또는 C | M3.6 cohort 데이터로 결정 |
| Q3-A | 보호자 리포트 carbonation = 사회적 hook (오르조 H.5 응용) | "교사가 보고 있다" → "보호자가 보고 있다" framing |
| Q3-B | 챌린지 모드는 Pro+ 전용 X — 모든 티어 가용, 단 캡 영향 받음 | 챌린지에서는 AI 사용 X 이므로 캡과 독립 |
| Q3-C | 임베딩은 Free/Pro/Pro+ 동일 품질 | tier 차별은 사용량(캡)으로만 — 알고리즘 차별 X |
| Q3-D | 보호자 다중 등록 X (M3.4 단순화) | M4 이후 요구 시 옵션 B 마이그레이션 |
| Q3-E | 통계 대시보드 = "약점 -N개" framing 1순위 카드 | 오르조 H.3 응용 + Deepen 차별 자산 부각 |

## 누적 마이그레이션 순서 (Q3 종료 시점)

```
0004_pattern_only          (M1.1)
0005_learner_state         (M1.1)
0006_confidence_log        (M1.2, 선택)
0007_prereq_deficit        (M2.3)
0008_admin_review          (M2.6)
0009_pgvector              (M3.3)
0010_billing               (M3.1)
0011_parents               (M3.4)
0012_stats_views           (M3.5, 선택)
```

## Q3 환경변수 추가 lock (01 §환경변수 보강)

신규:
```bash
# Q3 lock — 본 분기 시작 시 secret manager 등록
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
RESEND_API_KEY=                # Q2에 이미 있을 수 있음 — Q3 필수
CRON_SECRET=                   # M3.1부터 모든 cron이 의존
OPENAI_API_KEY=                # Q1에 이미 있음 — Q3에 임베딩으로 사용량 증가
```

iOS (M3.6):
```bash
APPLE_TEAM_ID=
APPSTORE_CONNECT_API_KEY=     # fastlane용
```

---

## Q3 cron 일람 (vercel.json 또는 Supabase Scheduled)

```json
{
  "crons": [
    { "path": "/api/cron/billing-renewal",  "schedule": "0 18 * * *" },
    { "path": "/api/cron/daily-challenge",  "schedule": "30 15 * * *" },
    { "path": "/api/cron/parent-report",    "schedule": "0 0 * * 0" },
    { "path": "/api/cron/embed-items",      "schedule": "0 * * * *" }
  ]
}
```

| KST 시점 | UTC schedule | 라우트 |
|---|---|---|
| 매일 03:00 | `0 18 * * *` | billing-renewal |
| 매일 00:30 | `30 15 * * *` | daily-challenge |
| 매주 일 09:00 | `0 0 * * 0` | parent-report |
| 매시간 0분 | `0 * * * *` | embed-items |

모든 cron 라우트는 `Authorization: Bearer ${CRON_SECRET}` 검증 lock.

## Q3 알고리즘 lock 재확인 (04에서 변경된 것 없음 — 적용 시점만)

| 알고리즘 | 분기 | 활성 마일스톤 |
|---|---|---|
| 04 §1 채점 분기 | Q1 | M1 — Q3에 변경 X |
| 04 §2 Pattern Elo | Q1 | M1 — Q3에 변경 X |
| 04 §3 BN 진단 | Q2 | M2 — Q3에 변경 X (재도전 효과 측정에서 재호출) |
| 04 §4.1 정책 | Q1 | M1 — Q3 challenge/retry 분기 추가 |
| 04 §4.3 하이브리드 랭킹 | Q3 | **M3.3** |
| 04 §4.4 임베딩 | Q3 | **M3.3** |
| 04 §5 리캡 카드 | Q2 | M2 — Q3 변경 X |
| 04 §8 그래프 시각 인코딩 | Q1 | M1 — Q3 변경 X |

## Q3 LLM 호출 lock (05에서 활성되는 것)

| § | 호출 | 활성 마일스톤 |
|---|---|---|
| §1 AI 코치 chat | M1 — Q3 캡만 추가 (M3.1) |
| §2 5칩 동적 카피 | M2 — Q3 변경 X |
| §3 리캡카드 빌드 | M2 — Q3 변경 X |
| §4 PDF 노드 추출 | M2.6 — Q3 변경 X |
| §5 오답 원인 분류 (Haiku) | M2 — Q3 변경 X |
| §6 풀이 OCR (Vision) | M2.2 — Q3 변경 X |
| §7 LCS 단계 분류 (Haiku) | M2.2 — Q3 변경 X |
| §8 보호자 리포트 요약 | **M3.4** |
| §9 챌린지 알림 카피 (Haiku) | **M3.4** |

## Q3 모드 머신 lock (06)

| § | 모드 | 활성 |
|---|---|---|
| §1 Practice | M1 |
| §2 Exam | M2.5 |
| §3 Challenge | **M3.2** |
| §4 Recovery | M2.5 |
| §5 Retry | **M3.2** (Practice의 sub-state) |

---

## Q3 위험 + 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| Toss webhook signature 검증 실패 → 결제 처리 실패 | 매출 직격 | 테스트 모드에서 위변조 시나리오 + 실패 시 Sentry alert + 수동 보정 runbook (13-deployment) |
| 임베딩 백필 OpenAI rate limit | M3.3 일정 지연 | batch=100, sleep=2s. 1000개 = 약 30분, 5000개 = 2.5시간. M3.3 시작 첫날 1회 |
| 보호자 리포트 spam 분류 | retention 효과 0 | Resend domain authentication (DKIM, SPF) 사전 설정 + 첫 발송 cohort 5명 inbox 검수 |
| iPad 빌드 사이닝 1주 lead time | M3.6 시작 지연 | M3.5 시작과 동시에 Apple Developer 계정 + provisioning 신청 |
| 챌린지 모드 LEVEL_UP 후 다음 Pattern 자식 없음 | 모드가 1 단계만에 종료 | 자식 없으면 같은 Pattern에서 difficulty cap 도달 시까지 계속, 5문제 더 풀고 session_end로 전이 |
| Pro 캡 30회가 너무 빡빡 | 사용자 이탈 | M3.1 launch 후 첫 2주 캡 도달율 모니터 — 50% 이상이 캡 도달 시 cohort A/B로 40회 테스트 검토 (단 변경은 PR + 별도 cohort 결과 첨부) |

---

## 분기 끝 산출물 (다음 분기 진입 조건)

- [ ] 본 spec의 7가지 Definition of Done 중 ≥ 5개 ✅
- [ ] Q3 retro 문서 머지
- [ ] M3.6 결정 (C-10) PR 머지 — 00-INDEX 갱신
- [ ] Q4 baseline 데이터 cohort: Pro 사용자 ≥ 50명, 보호자 동의 ≥ 30명, 활성 사용자 ≥ 200명
