# 12 · 인수 테스트 + E2E 시나리오 (lock)

> 시장 출시 가능 여부를 판정하는 단일 통과 기준 문서. 본 문서가 통과를 선언해야 release 태그를 찍을 수 있다. Playwright(E2E) + Vitest(단위/통합) + k6(부하) + 수동 QA가 모두 본 문서 안에서 lock된다.

## 0. 인수 정의 (Definition of Done)

00-INDEX의 4조건을 측정 가능한 형태로 구체화.

### 0.1 D1~D4 통합 데모 시나리오 통과

| ID | 명칭 | 분기 | 자동화 | 통과 조건 |
|---|---|---|---|---|
| D1 | 헷갈림 → 결손 도출 → 리캡 → 재도전 | Q1 말 | Playwright `tests/e2e/d1.spec.ts` | 모든 단계 assert 통과, 총 소요 ≤ 4분 (CI), 0 flaky over 10 run |
| D2 | 펜슬 풀이 → OCR → LCS → 시퀀스 리캡 → 통과 | Q2 말 | Playwright `tests/e2e/d2.spec.ts` | OCR mock에서 단계 4개 추출, LCS 매칭률 ≥ 80%, 시퀀스 카드 2장 통과 |
| D3 | 가입 → Pro 결제 → 챌린지 5연속 → 보호자 리포트 | Q3 말 | Playwright `tests/e2e/d3.spec.ts` | Toss sandbox 결제 OK, 챌린지 모드 LEVEL_UP 도달, Resend mock 발송 호출 검증 |
| D4 | 학원 owner → 교사 초대 → 강의안 검수 → 학생 풀이 → 교사 대시보드 | Q4 말 | Playwright `tests/e2e/d4.spec.ts` | RLS로 다른 학원 격리 확인, 교사 heatmap에 본 학원 학생만 표시 |

### 0.2 티어별 사용량 캡 검증

- Free 사용자: AI 코치 호출 5회 lifetime → 6번째에 `429 QUOTA_EXCEEDED` 응답
- Pro 사용자: 30회/day(KST) 초과 시 `429`. 자정(KST) 후 카운터 리셋
- Pro+ 사용자: 무제한 (1,000회 호출에도 통과)
- Toss webhook 시뮬레이션: 결제 성공 → tier 자동 승격, 만료 → free 강등

### 0.3 학원 SaaS 베타 cohort

- 별도 cohort 운영 문서가 30일 무사고 로그를 첨부 (자동화 외 수동 검증)
- 데이터: 결제 1건 이상, 학생 attempt 100건 이상, 교사 로그인 1회/주 이상
- 본 spec은 그 cohort의 결과 첨부를 release 게이트로 명시

### 0.4 SLO

| 메트릭 | 임계 | 측정 |
|---|---|---|
| API p95 latency | ≤ 800ms | k6 `tests/load/api.js` 24h roll-up |
| AI 코치 첫 토큰 | ≤ 1.5s | k6 `tests/load/ai-coach-stream.js` p95 |
| 가용성 | ≥ 99.5% | Sentry uptime 30d roll-up |
| 에러율 | ≤ 0.5% (5xx) | Sentry error count / total requests |
| Web Vitals LCP | ≤ 2.5s p75 | Sentry Web Vitals |
| Web Vitals INP | ≤ 200ms p75 | Sentry Web Vitals |
| Web Vitals CLS | ≤ 0.1 p75 | Sentry Web Vitals |

## 1. 테스트 분류

```
tests/
├── unit/                   # Vitest, ms 단위, 모킹 적극
│   ├── grading/
│   ├── recap/
│   ├── recommend/
│   └── session/
├── integration/            # Vitest + Postgres up, 모킹 LLM만
│   ├── attempt-flow.test.ts
│   └── pattern-mastery.test.ts
├── e2e/                    # Playwright, headless, mock LLM/결제
│   ├── d1.spec.ts
│   ├── d2.spec.ts
│   ├── d3.spec.ts
│   ├── d4.spec.ts
│   ├── auth.spec.ts
│   ├── quota.spec.ts
│   └── _helpers/
├── load/                   # k6
│   ├── api.js
│   └── ai-coach-stream.js
├── fixtures/
│   ├── seed-math2.sql
│   ├── seed-users.sql
│   └── seed-orgs.sql
└── __mocks__/
    ├── anthropic.ts
    ├── openai.ts
    ├── toss.ts
    └── resend.ts
```

## 2. 픽스처 데이터 — 수학Ⅱ 미분/적분 시드

`tests/fixtures/seed-math2.sql`. 모든 E2E가 같은 시드 사용. CI 시작 시 `pnpm test:db:reset` → seed.

### 2.1 Pattern 노드 (수학Ⅱ 미분/적분 핵심)

```sql
-- 시스템 콘텐츠 (user_id=NULL, org_id=NULL, status='published')
INSERT INTO nodes (id, type, label, grade, display_layer, signature, frequency_rank, is_killer, avg_correct_rate, status) VALUES
  -- 미적분 단원 Pattern
  ('11111111-0001-0000-0000-000000000001', 'pattern', '미분계수 정의로 극한 계산', '수Ⅱ', 'pattern',
   '["극한 정의","f(a+h)-f(a)/h","연속함수","치환","좌극한 우극한"]'::jsonb,
   3, false, 0.62, 'published'),
  ('11111111-0001-0000-0000-000000000002', 'pattern', '곡선 위 접선의 방정식', '수Ⅱ', 'pattern',
   '["미분계수","접선 기울기","점-기울기 형태","접점 미지수"]'::jsonb,
   1, false, 0.55, 'published'),
  ('11111111-0001-0000-0000-000000000003', 'pattern', '곡선 밖 점에서 그은 접선', '수Ⅱ', 'pattern',
   '["접점 (t,f(t))","두 식 연립","판별식","접점 개수 분기"]'::jsonb,
   2, true, 0.41, 'published'),
  ('11111111-0001-0000-0000-000000000004', 'pattern', '정적분 활용 - 넓이', '수Ⅱ', 'pattern',
   '["적분 구간","경계 교점","절댓값 분기"]'::jsonb,
   5, false, 0.58, 'published'),
  -- 중3 prereq (display_layer='concept' 표기)
  ('11111111-0001-0000-0000-000000000010', 'pattern', '이차방정식 판별식', '중3', 'concept',
   '["D=b^2-4ac","근의 개수 분기","D>0/=0/<0"]'::jsonb,
   NULL, false, 0.78, 'published'),
  ('11111111-0001-0000-0000-000000000011', 'pattern', '이차방정식 풀이', '중3', 'concept',
   '["인수분해","근의 공식","완전제곱식"]'::jsonb,
   NULL, false, 0.82, 'published'),
  -- 고1 prereq
  ('11111111-0001-0000-0000-000000000020', 'pattern', '함수의 그래프와 평행이동', '고1', 'concept',
   '["y=f(x-p)+q","축 대칭","원점 대칭"]'::jsonb,
   NULL, false, 0.71, 'published');

-- prerequisite edges
INSERT INTO edges (id, source_id, target_id, type, status) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0001-0000-0000-000000000010', '11111111-0001-0000-0000-000000000003', 'prerequisite', 'published'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0001-0000-0000-000000000011', '11111111-0001-0000-0000-000000000003', 'prerequisite', 'published'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0001-0000-0000-000000000002', '11111111-0001-0000-0000-000000000003', 'prerequisite', 'published'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0001-0000-0000-000000000020', '11111111-0001-0000-0000-000000000002', 'prerequisite', 'published');
```

### 2.2 Item 노드 (객관식 + 주관식)

```sql
INSERT INTO nodes (id, type, label, item_source, item_year, item_number, item_difficulty,
                   item_choices, item_answer, item_solution, status) VALUES
  -- D1 시나리오용: '곡선 밖 점에서 그은 접선' Pattern의 객관식 5지선다
  ('33333333-0000-0000-0000-000000000001', 'item',
   '곡선 y=x³-3x 위의 점이 아닌 (0,2)에서 그은 접선의 개수는?',
   '2024_9모', 2024, 21, 0.65,
   '["1","2","3","4","5"]'::jsonb,
   '3',
   '접점을 (t, t³-3t)라 두면 접선의 기울기는 3t²-3. 점-기울기로 (0,2) 지나는 조건 → t³ - 3t·...(생략). 판별식으로 t의 실근 개수 = 접선 개수.',
   'published'),
  -- D2 시나리오용: 주관식 (펜슬 풀이)
  ('33333333-0000-0000-0000-000000000002', 'item',
   '∫₀² |x²-1| dx 의 값을 구하시오.',
   '2025수능', 2025, 14, 0.55,
   NULL,
   '2',
   '|x²-1| = (1-x²) for x∈[0,1], (x²-1) for x∈[1,2]. 적분 후 합산.',
   'published'),
  -- D3 챌린지용: 같은 Pattern 다양한 난이도
  ('33333333-0000-0000-0000-000000000010', 'item', '곡선 y=x³ 위의 점 (1,1)에서의 접선의 방정식은?',
   '교과서', NULL, NULL, 0.30, NULL, 'y=3x-2', '...', 'published'),
  ('33333333-0000-0000-0000-000000000011', 'item', '곡선 y=x³-x에서 기울기가 2인 접선의 방정식을 모두 구하시오.',
   '교과서', NULL, NULL, 0.45, NULL, '...', '...', 'published'),
  ('33333333-0000-0000-0000-000000000012', 'item', '점 (1,0)에서 곡선 y=x³에 그은 접선이 곡선과 만나는 다른 점의 좌표는?',
   '교과서', NULL, NULL, 0.55, NULL, '...', '...', 'published'),
  ('33333333-0000-0000-0000-000000000013', 'item', '...(난이도 0.65)', '교과서', NULL, NULL, 0.65, NULL, '...', '...', 'published'),
  ('33333333-0000-0000-0000-000000000014', 'item', '...(난이도 0.75)', '교과서', NULL, NULL, 0.75, NULL, '...', '...', 'published');

-- chunk_node_mappings로 Item ↔ Pattern 다대다 (생략 — 실 fixture에서 채움)
```

### 2.3 사용자 fixture

```sql
INSERT INTO users (id, email, name, role, created_at) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'student.d1@test.deepen.kr', 'D1학생', 'student', now()),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'student.d2@test.deepen.kr', 'D2학생', 'student', now()),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'student.d3@test.deepen.kr', 'D3학생', 'student', now()),
  ('aaaaaaaa-0000-0000-0000-000000000010', 'owner.d4@test.deepen.kr', 'D4원장', 'org_owner', now()),
  ('aaaaaaaa-0000-0000-0000-000000000011', 'teacher.d4@test.deepen.kr', 'D4교사', 'teacher', now()),
  ('aaaaaaaa-0000-0000-0000-000000000012', 'student.d4@test.deepen.kr', 'D4학원생', 'student', now());
```

D1 학생은 prereq 결손을 유도해야 하므로 추가 시드:

```sql
-- D1 학생: '이차방정식 판별식' Pattern theta=0.30 (낮음)
INSERT INTO pattern_state (user_id, pattern_id, theta, beta, attempt_count, last_updated_at) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0001-0000-0000-000000000010',
   0.30, 0.55, 4, now() - interval '5 days'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0001-0000-0000-000000000003',
   0.45, 0.70, 0, now());

-- D1 학생: 최근 판별식 Item 오답 1회 (BN 누적 결손 evidence)
INSERT INTO user_item_history (user_id, item_id, seen_count, result_history, last_solved_at) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001',
   '33333333-0000-0000-0000-000000000010',
   1,
   '[{"label":"wrong","confidenceScore":-0.3,"reasonTags":["calculation_error"],"signals":{"correct":false,"timeMs":180000,"timeZ":1.8,"hintsUsed":1,"aiQuestions":0,"selfConfidence":"unsure"},"timestamp":"2026-04-30T12:00:00Z"}]'::jsonb,
   now() - interval '5 days');
```

## 3. 모킹 정책

### 3.1 LLM (Anthropic) 모킹 — `tests/__mocks__/anthropic.ts`

deterministic. test 파일별로 시나리오 등록.

```typescript
// tests/__mocks__/anthropic.ts
import { vi } from 'vitest'

type ToolCall = { name: string; input: Record<string, unknown> }
type MockResponse = { text: string; toolCalls?: ToolCall[]; usage: { in: number; out: number } }

const scenarioStore = new Map<string, MockResponse[]>()
let callIndex = 0
let currentScenario = 'default'

export function setLlmScenario(name: string, responses: MockResponse[]) {
  scenarioStore.set(name, responses)
  currentScenario = name
  callIndex = 0
}

export function resetLlmMocks() {
  scenarioStore.clear()
  callIndex = 0
  currentScenario = 'default'
}

export const mockAnthropic = {
  messages: {
    create: vi.fn(async () => {
      const responses = scenarioStore.get(currentScenario) ?? []
      const r = responses[callIndex] ?? responses[responses.length - 1]
      callIndex++
      return {
        content: [
          ...(r.toolCalls ?? []).map((t) => ({ type: 'tool_use', name: t.name, input: t.input })),
          { type: 'text', text: r.text },
        ],
        usage: { input_tokens: r.usage.in, output_tokens: r.usage.out },
        stop_reason: r.toolCalls?.length ? 'tool_use' : 'end_turn',
      }
    }),
    stream: vi.fn(async function* () {
      const responses = scenarioStore.get(currentScenario) ?? []
      const r = responses[callIndex] ?? responses[responses.length - 1]
      callIndex++
      // yield chunk by chunk
      const chunks = r.text.split(/(\s+)/)
      for (const c of chunks) {
        yield { type: 'content_block_delta', delta: { type: 'text_delta', text: c } }
      }
      for (const t of r.toolCalls ?? []) {
        yield { type: 'content_block_start', content_block: { type: 'tool_use', name: t.name, input: t.input } }
      }
      yield { type: 'message_stop', usage: { input_tokens: r.usage.in, output_tokens: r.usage.out } }
    }),
  },
}

vi.mock('@/lib/clients/claude', () => ({ getClaude: () => mockAnthropic }))
```

E2E (Playwright)에서는 백엔드를 dev server로 띄우되, `process.env.MOCK_LLM=1`일 때 `lib/clients/claude.ts`가 위 모킹 클라이언트를 export하도록 분기. CI는 `MOCK_LLM=1`로 항상 띄움.

### 3.2 Toss 결제 sandbox — `tests/__mocks__/toss.ts`

Toss는 자체 sandbox 환경 제공. `TOSS_CLIENT_KEY=test_ck_...`, `TOSS_SECRET_KEY=test_sk_...` 사용. E2E에서 결제 페이지로 진입하면 Playwright가 sandbox 결제창의 "결제 승인" 버튼을 자동 클릭. webhook은 dev server 내부 fetch로 직접 호출:

```typescript
// tests/e2e/_helpers/toss.ts
export async function simulateTossWebhook(orderId: string, paymentKey: string) {
  await fetch(`${BASE_URL}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'TossPayments-Signature': computeTestSig({ orderId, paymentKey }) },
    body: JSON.stringify({ eventType: 'PAYMENT_DONE', data: { orderId, paymentKey, status: 'DONE' } }),
  })
}
```

### 3.3 Resend (이메일) 모킹

```typescript
// tests/__mocks__/resend.ts
export const sentEmails: Array<{ to: string; subject: string; html: string }> = []

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: any) => {
        sentEmails.push({ to: payload.to, subject: payload.subject, html: payload.html })
        return { id: 'mock-' + Date.now() }
      },
    }
  },
}))
```

E2E에서는 dev server에 `RESEND_API_KEY=mock_test_key` 부여 + `lib/email/render-report.tsx`가 키 prefix `mock_`이면 메모리 큐로 기록. 테스트는 `GET /api/test/sent-emails`(test-only endpoint, prod에서 404)로 검증.

### 3.4 Supabase Storage

E2E는 실제 supabase test 프로젝트 사용. 별도 격리된 `documents-test` 버킷. 테스트 후 cleanup hook이 업로드 파일 삭제.

## 4. 셀렉터 전략 (lock)

모든 E2E 테스트는 `data-testid` 속성으로 셀렉트. 텍스트나 클래스 의존 금지(국제화·디자인 변경에 취약).

명명 규칙: `<도메인>-<요소>-<상태?>`. 예: `attempt-submit-btn`, `recap-card-quiz-input`, `graph-node-pattern-{id}`.

### 4.1 핵심 testid 카탈로그

| 화면 | testid | 용도 |
|---|---|---|
| solve | `item-text` | 문제 본문 |
| solve | `choice-btn-{idx}` | 객관식 보기 (idx=0..4) |
| solve | `confidence-slider` | 자신감 슬라이더 (input range) |
| solve | `submit-attempt-btn` | 제출 |
| solve | `chip-hint` ~ `chip-variant` | 5칩 |
| solve | `ai-coach-input` | 챗 입력 |
| solve | `ai-coach-send-btn` | 전송 |
| solve | `ai-coach-token-stream` | 스트리밍 영역 (data-state="streaming"\|"done") |
| solve | `pencil-canvas` | tldraw 캔버스 (M2.2+) |
| solve | `ocr-submit-btn` | 펜슬 풀이 OCR 제출 |
| recap | `recap-card-{idx}` | 리캡카드 (시퀀스 idx 0..n) |
| recap | `recap-card-name` | 카드 이름 |
| recap | `recap-card-bullet-{idx}` | bullet 0..2 |
| recap | `recap-quiz-input` | 단답 입력 |
| recap | `recap-quiz-submit` | 제출 |
| recap | `recap-quiz-result` | 결과 표시 (data-state="pass"\|"fail") |
| recap | `retry-prompt-confirm` | 재도전 진입 |
| graph | `graph-node-pattern-{id}` | Pattern 노드 |
| graph | `graph-node-item-{id}` | Item 노드 |
| graph | `graph-node-color` | 색 attribute (fill) |
| billing | `tier-pro-btn` | Pro 결제 진입 |
| billing | `toss-checkout-frame` | Toss iframe |
| challenge | `challenge-streak` | 연속 정답 표시 |
| challenge | `challenge-levelup-banner` | LEVEL_UP 배너 |
| teacher | `class-heatmap` | 히트맵 표 |
| teacher | `student-row-{id}` | 학생 행 |
| admin | `review-queue-row-{id}` | 검수 행 |
| admin | `publish-btn` | publish 버튼 |

## 5. D1 시나리오 — Q1 (M1.6 말)

### 5.1 의도

학생이 '곡선 밖 접선' 객관식을 푼다 → 정답 + 자신감 unsure → "헷갈림" 분류 → BN/룰 진단으로 '판별식' prereq 결손 도출 → 리캡카드 생성·통과 → 원래 문제 재도전 정답.

### 5.2 사전 조건 (fixture로 보장)

- D1 학생 로그인 (storage state 미리 생성 — `tests/e2e/_helpers/auth.ts`)
- 위 §2의 시드 데이터 적용
- LLM mock 시나리오 = `d1`: 리캡카드 빌드 1회, AI 코치 호출 0회

### 5.3 LLM mock 시나리오 등록

```typescript
// tests/e2e/_helpers/llm-scenarios.ts
import { setLlmScenario } from '../../__mocks__/anthropic'

export const D1_SCENARIO = [
  // recap/build-card 호출
  {
    text: '',
    toolCalls: [{
      name: 'emit_recap_card',
      input: {
        name: '판별식',
        grade: '중3',
        durationMin: 2,
        whyNeeded: '접선 개수 분기 = 판별식 부호 분기. 잊으면 이 문제 못 풉니다.',
        coreBullets: [
          '판별식 D = b² - 4ac, 이차방정식 ax²+bx+c=0',
          'D>0: 서로 다른 두 실근, D=0: 중근, D<0: 허근',
          '접점 개수 = 매개변수 t의 실근 개수',
        ],
        checkQuiz: {
          question: '판별식 D=0일 때 이차방정식의 근의 개수는?',
          answer: '1',
          hint: '중근',
        },
      },
    }],
    usage: { in: 350, out: 180 },
  },
]
```

dev server에 시나리오 주입은 test-only endpoint:

```typescript
// app/api/test/llm-scenario/route.ts (NODE_ENV !== 'production' 가드)
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') return new Response('not found', { status: 404 })
  const { scenario, responses } = await req.json()
  // 글로벌 mock store에 주입
  ;(globalThis as any).__llmScenario = { scenario, responses, idx: 0 }
  return Response.json({ ok: true })
}
```

### 5.4 Playwright 코드

```typescript
// tests/e2e/d1.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './_helpers/auth'
import { setLlmScenario } from './_helpers/llm-scenarios'
import { D1_SCENARIO } from './_helpers/llm-scenarios'

test.describe('D1 — 헷갈림 → 결손 도출 → 리캡 → 재도전', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/api/test/db-reset', { data: { fixture: 'math2' } })
    await setLlmScenario(request, 'd1', D1_SCENARIO)
    await loginAs(page, 'student.d1@test.deepen.kr')
  })

  test('객관식 정답 + unsure → 리캡카드 → 재도전 정답', async ({ page }) => {
    // 1) 단원 진입
    await page.goto('/v2/study/math2-calc')
    await expect(page.getByTestId('graph-node-pattern-11111111-0001-0000-0000-000000000003')).toBeVisible()

    // 2) 곡선 밖 접선 Pattern 노드 클릭 → 우측 패널에서 Item 선택
    await page.getByTestId('graph-node-pattern-11111111-0001-0000-0000-000000000003').click()
    await page.getByTestId('graph-node-item-33333333-0000-0000-0000-000000000001').click()

    // 3) 풀이 화면 진입
    await expect(page).toHaveURL(/\/v2\/solve\/33333333-0000-0000-0000-000000000001/)
    await expect(page.getByTestId('item-text')).toContainText('곡선 y=x³-3x')

    // 4) 정답 (보기 idx=2 = "3") 선택
    await page.getByTestId('choice-btn-2').click()

    // 5) 자신감 슬라이더 'unsure' (왼쪽 끝)
    await page.getByTestId('confidence-slider').fill('0')

    // 6) 제출
    const submitResp = page.waitForResponse(r => r.url().includes('/api/attempts') && r.request().method() === 'POST')
    await page.getByTestId('submit-attempt-btn').click()
    const resp = await submitResp
    expect(resp.status()).toBe(200)

    const body = await resp.json()
    expect(body.ok).toBe(true)
    expect(body.data.attemptResult.label).toBe('unsure')          // 정답 + 헷갈림
    expect(body.data.diagnosis.recapNeeded).toBe(true)
    expect(body.data.diagnosis.candidatePrereq[0].patternId).toBe('11111111-0001-0000-0000-000000000010') // 판별식

    // 7) 리캡카드 표시
    await expect(page.getByTestId('recap-card-0')).toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('recap-card-name')).toContainText('판별식')
    await expect(page.getByTestId('recap-card-bullet-0')).toContainText('D = b² - 4ac')
    await expect(page.getByTestId('recap-card-bullet-1')).toContainText('서로 다른 두 실근')

    // 8) 카드 퀴즈 — 정답 '1'
    await page.getByTestId('recap-quiz-input').fill('1')
    await page.getByTestId('recap-quiz-submit').click()
    await expect(page.getByTestId('recap-quiz-result')).toHaveAttribute('data-state', 'pass')

    // 9) 재도전 prompt → 진입 → 같은 itemId 자동 로드
    await page.getByTestId('retry-prompt-confirm').click()
    await expect(page).toHaveURL(/\/v2\/solve\/33333333-0000-0000-0000-000000000001/)
    await expect(page.getByTestId('item-text')).toContainText('곡선 y=x³-3x')

    // 10) 다시 정답 + 자신감 'sure' → correct 분류
    await page.getByTestId('choice-btn-2').click()
    await page.getByTestId('confidence-slider').fill('100')
    const retrySubmit = page.waitForResponse(r => r.url().includes('/api/attempts') && r.request().method() === 'POST')
    await page.getByTestId('submit-attempt-btn').click()
    const retryResp = await retrySubmit
    const retryBody = await retryResp.json()

    expect(retryBody.data.attemptResult.label).toBe('correct')
    // recap 후 재도전이므로 meta source 표기
    expect(retryBody.data.attemptResult.meta?.source ?? null).toBe(null)  // 클라가 보내지는 않음, 서버 attempt에 meta 부착은 별도
    // mastery 상승 확인
    const before = retryBody.data.masteryUpdate.find((m: any) => m.patternId === '11111111-0001-0000-0000-000000000003')
    expect(before.thetaAfter).toBeGreaterThan(before.thetaBefore)

    // 11) 그래프 색 갱신 검증
    await page.goto('/v2/study/math2-calc')
    const targetNode = page.getByTestId('graph-node-pattern-11111111-0001-0000-0000-000000000003')
    const fill = await targetNode.locator('[data-testid="graph-node-color"]').getAttribute('fill')
    expect(fill).not.toBe('#E5E5E5')  // 회색(미학습) 아님
  })

  test('타이밍 budget — 4분 이내 완료', async ({ page }) => {
    const start = Date.now()
    // ... 위 시나리오 축약 실행
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(4 * 60 * 1000)
  })
})
```

### 5.5 D1 통과 기준

- 위 모든 assert 통과
- p95 over 10 runs: 단계 8 (recap quiz pass)까지 ≤ 60s
- flaky rate over 30 runs ≤ 5%

## 6. D2 시나리오 — Q2 (M2.5 말)

### 6.1 의도

학생이 펜슬로 ∫₀² |x²-1| dx 풀이 → OCR로 단계 추출 → LCS로 정답 풀이와 매칭 → 매칭 안 된 단계에 errorKind 부여 → 시퀀스 리캡(2장: 절댓값 분기, 정적분 계산) → 통과.

### 6.2 사전 조건

- D2 학생 로그인
- LLM mock 시나리오 = `d2` (OCR + LCS errorKind + 시퀀스 카드 2장)
- M2.2+ 펜슬 캔버스 활성

### 6.3 LLM mock

```typescript
export const D2_SCENARIO = [
  // 1) /api/ocr 호출 (Vision)
  {
    text: '',
    toolCalls: [{
      name: 'emit_steps',
      input: {
        steps: [
          { line: 1, text: '$|x^2-1|$ 분기', type: 'condition' },
          { line: 2, text: '$\\int_0^1 (1-x^2) dx$', type: 'equation' },
          { line: 3, text: '$\\int_1^2 (x^2-1) dx$', type: 'equation' },
          { line: 4, text: '$= \\frac{2}{3} + \\frac{4}{3}$', type: 'equation' },
          { line: 5, text: '$= 2$', type: 'conclusion' },
        ],
        overallConfidence: 0.92,
      },
    }],
    usage: { in: 1200, out: 280 },
  },
  // 2) recap/build-card #1 (절댓값 분기 prereq)
  { text: '', toolCalls: [{ name: 'emit_recap_card', input: { name: '절댓값 분기', grade: '고1', durationMin: 1, whyNeeded: '|x²-1|을 적분하려면 부호별 구간 분기 필수', coreBullets: ['|f(x)|=f(x) if f≥0', '|f(x)|=-f(x) if f<0', '교점에서 부호 바뀜'], checkQuiz: { question: 'x∈[0,1]에서 |x²-1| =?', answer: '1-x²', hint: 'x²<1' } } }], usage: { in: 350, out: 200 } },
  // 3) recap/build-card #2 (정적분 기본)
  { text: '', toolCalls: [{ name: 'emit_recap_card', input: { name: '정적분 계산', grade: '수Ⅱ', durationMin: 2, whyNeeded: '구간 나눈 후 각각 적분·합산', coreBullets: ['∫a^b f dx = F(b)-F(a)', '구간 나눠도 결과 합산', 'x²의 부정적분 = x³/3'], checkQuiz: { question: '∫₀¹ x² dx =?', answer: '1/3', hint: 'x³/3' } } }], usage: { in: 320, out: 180 } },
]
```

### 6.4 Playwright 코드

```typescript
// tests/e2e/d2.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './_helpers/auth'
import { setLlmScenario, D2_SCENARIO } from './_helpers/llm-scenarios'
import { drawSampleStrokes } from './_helpers/pencil'
import * as fs from 'node:fs'
import * as path from 'node:path'

test.describe('D2 — 펜슬 → OCR → LCS → 시퀀스 리캡', () => {
  test.beforeEach(async ({ page, request }) => {
    await request.post('/api/test/db-reset', { data: { fixture: 'math2' } })
    await setLlmScenario(request, 'd2', D2_SCENARIO)
    await loginAs(page, 'student.d2@test.deepen.kr')
  })

  test('펜슬 풀이 → 시퀀스 카드 2장 통과', async ({ page }) => {
    // 1) 주관식 Item 직접 진입
    await page.goto('/v2/solve/33333333-0000-0000-0000-000000000002')
    await expect(page.getByTestId('item-text')).toContainText('|x²-1|')

    // 2) 펜슬 모드 진입
    await page.getByTestId('mode-pencil-btn').click()
    await expect(page.getByTestId('pencil-canvas')).toBeVisible()

    // 3) 캔버스에 strokes 그리기 (헬퍼) — 실제로는 빈 strokes도 OK, OCR 모킹이라
    await drawSampleStrokes(page, 'pencil-canvas')

    // 4) 미리 준비된 풀이 PNG 사용 (테스트 자산) — 또는 캔버스 export
    const fixturePngPath = path.join(__dirname, '_helpers', 'fixtures', 'pencil-d2.png')
    const pngBytes = fs.readFileSync(fixturePngPath)
    await page.getByTestId('pencil-import-btn').click()
    await page.getByTestId('pencil-import-input').setInputFiles({ name: 'd2.png', mimeType: 'image/png', buffer: pngBytes })

    // 5) OCR 제출 → /api/ocr 응답 검증
    const ocrResp = page.waitForResponse(r => r.url().includes('/api/ocr'))
    await page.getByTestId('ocr-submit-btn').click()
    const r = await ocrResp
    const body = await r.json()
    expect(body.ok).toBe(true)
    expect(body.data.steps).toHaveLength(5)
    expect(body.data.overallConfidence).toBeGreaterThan(0.9)

    // 6) 풀이 단계 패널에 LCS 결과 표시 (매칭/미매칭)
    await expect(page.getByTestId('ocr-step-row-0')).toHaveAttribute('data-aligned', 'true')
    await expect(page.getByTestId('ocr-step-row-4')).toHaveAttribute('data-aligned', 'true')

    // 7) 학생이 답 제출 (정답 = 2, OCR 결론과 동일)
    await page.getByTestId('answer-input').fill('2')
    await page.getByTestId('confidence-slider').fill('30')  // 살짝 unsure
    const attemptResp = page.waitForResponse(r => r.url().includes('/api/attempts'))
    await page.getByTestId('submit-attempt-btn').click()
    const attemptBody = await (await attemptResp).json()

    // 8) recap 발동
    expect(attemptBody.data.diagnosis.recapNeeded).toBe(true)
    expect(attemptBody.data.diagnosis.candidatePrereq.length).toBeGreaterThanOrEqual(2)

    // 9) 시퀀스 카드 1장 통과
    await expect(page.getByTestId('recap-card-0')).toBeVisible()
    await expect(page.getByTestId('recap-card-name')).toContainText('절댓값 분기')
    await page.getByTestId('recap-quiz-input').fill('1-x²')
    await page.getByTestId('recap-quiz-submit').click()
    await expect(page.getByTestId('recap-quiz-result')).toHaveAttribute('data-state', 'pass')

    // 10) 다음 카드 진행
    await page.getByTestId('next-recap-card-btn').click()
    await expect(page.getByTestId('recap-card-1')).toBeVisible()
    await expect(page.getByTestId('recap-card-name')).toContainText('정적분 계산')
    await page.getByTestId('recap-quiz-input').fill('1/3')
    await page.getByTestId('recap-quiz-submit').click()
    await expect(page.getByTestId('recap-quiz-result')).toHaveAttribute('data-state', 'pass')

    // 11) 시퀀스 종료 → 재도전 prompt
    await expect(page.getByTestId('retry-prompt-confirm')).toBeVisible()
    await page.getByTestId('retry-prompt-confirm').click()

    // 12) 같은 Item 재진입
    await expect(page).toHaveURL(/\/v2\/solve\/33333333-0000-0000-0000-000000000002/)
  })

  test('OCR 실패 → fallback 안내', async ({ page, request }) => {
    await setLlmScenario(request, 'd2-ocr-fail', [
      { text: '', toolCalls: [{ name: 'emit_steps', input: { steps: [], overallConfidence: 0.2 } }], usage: { in: 1000, out: 50 } },
    ])
    await page.goto('/v2/solve/33333333-0000-0000-0000-000000000002')
    await page.getByTestId('mode-pencil-btn').click()
    // ... import 동일
    await page.getByTestId('ocr-submit-btn').click()
    await expect(page.getByTestId('ocr-low-confidence-banner')).toBeVisible()
    await expect(page.getByTestId('ocr-low-confidence-banner')).toContainText('다시 찍어')
  })
})
```

### 6.5 Pencil helper

```typescript
// tests/e2e/_helpers/pencil.ts
import type { Page } from '@playwright/test'

export async function drawSampleStrokes(page: Page, testid: string) {
  const canvas = page.getByTestId(testid)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas not visible')
  await page.mouse.move(box.x + 50, box.y + 50)
  await page.mouse.down()
  for (let i = 0; i < 10; i++) {
    await page.mouse.move(box.x + 50 + i * 10, box.y + 50 + i * 5)
  }
  await page.mouse.up()
}
```

## 7. D3 시나리오 — Q3 (M3.5 말)

### 7.1 의도

학생 가입 → Free 5회 소진 → Pro 결제 (Toss sandbox) → tier 'pro' 승격 → 챌린지 모드 5연속 정답 → Pattern theta 상승 → 보호자 리포트 발송 트리거.

### 7.2 Playwright 코드

```typescript
// tests/e2e/d3.spec.ts
import { test, expect } from '@playwright/test'
import { signupNew, simulateTossWebhook } from './_helpers'
import { setLlmScenario, D3_SCENARIO } from './_helpers/llm-scenarios'

test.describe('D3 — 가입 → Pro 결제 → 챌린지 → 보호자 리포트', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/test/db-reset', { data: { fixture: 'math2' } })
    await setLlmScenario(request, 'd3', D3_SCENARIO)
  })

  test('Free → Pro → 챌린지 LEVEL_UP → 리포트 발송', async ({ page, request }) => {
    // 1) 신규 가입
    const email = `e2e-d3-${Date.now()}@test.deepen.kr`
    await signupNew(page, { email, password: 'Test1234!', name: 'D3유저' })
    await expect(page).toHaveURL(/\/v2\/home/)

    // 2) Free tier 확인
    const meResp = await request.get('/api/me', { headers: { Cookie: await page.context().cookies().then(c => c.map(x => `${x.name}=${x.value}`).join(';')) } })
    expect((await meResp.json()).data.subscription?.tier ?? 'free').toBe('free')

    // 3) AI 코치 5회 호출 (free 한도)
    await page.goto('/v2/solve/33333333-0000-0000-0000-000000000010')
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('chip-hint').click()
      await expect(page.getByTestId('ai-coach-token-stream')).toHaveAttribute('data-state', 'done', { timeout: 10000 })
    }

    // 4) 6번째 호출 → quota 초과
    const quotaResp = page.waitForResponse(r => r.url().includes('/api/ai-coach/chat'))
    await page.getByTestId('chip-hint').click()
    const q = await quotaResp
    expect(q.status()).toBe(429)
    await expect(page.getByTestId('quota-exceeded-modal')).toBeVisible()

    // 5) 결제로 이동
    await page.getByTestId('upgrade-pro-btn').click()
    await expect(page).toHaveURL(/\/billing/)
    await page.getByTestId('tier-pro-btn').click()

    // 6) Toss sandbox 결제창 — sandbox 자동 승인 버튼
    const tossFrame = page.frameLocator('[data-testid="toss-checkout-frame"]')
    await tossFrame.getByRole('button', { name: /결제하기|승인/ }).click()

    // 7) Webhook 시뮬 (orderId 페이지에서 추출)
    const orderId = await page.evaluate(() => sessionStorage.getItem('lastOrderId'))!
    await simulateTossWebhook(request, { orderId, paymentKey: 'mock-payment-key' })

    // 8) tier=pro 확인
    await page.goto('/v2/home')
    const meResp2 = await request.get('/api/me')
    expect((await meResp2.json()).data.subscription.tier).toBe('pro')

    // 9) 챌린지 모드 진입
    await page.goto('/v2/study/math2-calc')
    await page.getByTestId('graph-node-pattern-11111111-0001-0000-0000-000000000002').click()
    await page.getByTestId('mode-challenge-btn').click()

    // 10) 5연속 정답 — fixture에 동일 Pattern 다양한 난이도 5개 미리 시드
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('answer-input').fill('correct-answer')  // 또는 객관식 선택
      await page.getByTestId('submit-attempt-btn').click()
      await page.waitForResponse(r => r.url().includes('/api/attempts'))
      await expect(page.getByTestId('challenge-streak')).toContainText(String(i + 1))
    }

    // 11) LEVEL_UP 배너
    await expect(page.getByTestId('challenge-levelup-banner')).toBeVisible()

    // 12) Pattern theta 상승 확인
    const stateResp = await request.get('/api/me/pattern-state?patternId=11111111-0001-0000-0000-000000000002')
    const state = (await stateResp.json()).data
    expect(state.theta).toBeGreaterThan(0.7)

    // 13) 주간 리포트 cron 트리거
    await request.post('/api/cron/parent-report', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })

    // 14) Resend 메모리 큐 검증
    const sentResp = await request.get('/api/test/sent-emails')
    const sent = (await sentResp.json()).data.emails
    const reportEmail = sent.find((e: any) => e.subject.includes('주간 리포트'))
    expect(reportEmail).toBeDefined()
    expect(reportEmail.html).toContain('D3유저')
    expect(reportEmail.html).toContain('이번 주')
  })

  test('결제 실패 → tier 변동 없음', async ({ page, request }) => {
    // 결제 webhook을 'FAILED'로 시뮬 → tier=free 유지
    // ... 생략, 동일 패턴
  })
})
```

## 8. D4 시나리오 — Q4 (M4.5 말)

### 8.1 의도

학원 owner 가입 → 학원 생성 → 교사 1명 초대 → 강의안 PDF 업로드 → 어드민 검수 → 학원 학생 1명이 그 강의안의 Item 풀이 → 교사 대시보드 히트맵에 그 학생 표시 + 다른 학원 학생은 안 보임.

### 8.2 Playwright 코드

```typescript
// tests/e2e/d4.spec.ts
import { test, expect } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

test.describe('D4 — 학원 SaaS 풀 사이클', () => {
  test.beforeEach(async ({ request }) => {
    await request.post('/api/test/db-reset', { data: { fixture: 'multi-org' } })
  })

  test('owner 가입 → 교사 초대 → 강의안 → 학생 풀이 → 교사 히트맵', async ({ page, request, browser }) => {
    // 1) Owner 가입 + 학원 생성
    await page.goto('/signup?role=org_owner')
    await page.getByTestId('signup-email').fill('owner.d4@test.deepen.kr')
    await page.getByTestId('signup-password').fill('Test1234!')
    await page.getByTestId('signup-org-name').fill('D4학원')
    await page.getByTestId('signup-submit').click()
    await expect(page).toHaveURL(/\/admin\/studio/)

    // 2) 교사 초대
    await page.getByTestId('invite-member-btn').click()
    await page.getByTestId('invite-email').fill('teacher.d4@test.deepen.kr')
    await page.getByTestId('invite-role').selectOption('teacher')
    await page.getByTestId('invite-submit').click()
    await expect(page.getByTestId('invite-status')).toContainText('전송됨')

    // 3) 클래스 생성
    await page.goto('/admin/studio/classes')
    await page.getByTestId('new-class-btn').click()
    await page.getByTestId('class-name').fill('수Ⅱ A반')
    await page.getByTestId('class-teacher').selectOption({ label: 'D4교사' })
    await page.getByTestId('class-submit').click()

    // 4) 학생 1명 추가
    await page.getByTestId('class-add-student-btn').click()
    await page.getByTestId('student-email').fill('student.d4@test.deepen.kr')
    await page.getByTestId('student-add-submit').click()

    // 5) 강의안 PDF 업로드
    await page.goto('/admin/studio/documents')
    const pdfPath = path.join(__dirname, '_helpers', 'fixtures', 'lecture-d4.pdf')
    await page.getByTestId('upload-pdf-input').setInputFiles(pdfPath)
    const uploadResp = page.waitForResponse(r => r.url().includes('/api/documents/upload'))
    await page.getByTestId('upload-submit-btn').click()
    const upBody = await (await uploadResp).json()
    const docId = upBody.data.documentId

    // 6) Job 완료 대기 (worker가 처리) — test endpoint로 강제 처리
    await request.post('/api/test/process-document-job', { data: { documentId: docId } })
    await page.reload()
    await expect(page.getByTestId(`doc-status-${docId}`)).toContainText('검수 대기')

    // 7) 어드민 검수 큐
    await page.goto('/admin/review')
    const reviewRow = page.getByTestId('review-queue-row-0')
    await expect(reviewRow).toBeVisible()
    await reviewRow.getByTestId('publish-btn').click()
    await expect(reviewRow).toHaveAttribute('data-state', 'published')

    // 8) Owner 로그아웃, 학생 D4 로그인
    await page.context().clearCookies()
    await loginAs(page, 'student.d4@test.deepen.kr')

    // 9) 학생이 학원 콘텐츠 단원 풀이
    await page.goto('/v2/home')
    await page.getByTestId('unit-card-d4-lecture').click()
    await page.getByTestId('graph-node-item-0').click()
    await page.getByTestId('choice-btn-2').click()
    await page.getByTestId('confidence-slider').fill('80')
    await page.getByTestId('submit-attempt-btn').click()
    await page.waitForResponse(r => r.url().includes('/api/attempts'))

    // 10) 다른 학원 학생 (oot-of-scope) 분리 검증
    await page.context().clearCookies()
    await loginAs(page, 'student.other-org@test.deepen.kr')
    await page.goto('/v2/home')
    await expect(page.getByTestId('unit-card-d4-lecture')).not.toBeVisible()

    // 11) 교사 로그인 → 히트맵
    await page.context().clearCookies()
    await loginAs(page, 'teacher.d4@test.deepen.kr')
    await page.goto('/teacher/classes')
    await page.getByTestId('class-card-0').click()
    await expect(page.getByTestId('class-heatmap')).toBeVisible()
    // D4학원생만 보임, 다른 학원 학생 안 보임
    await expect(page.getByTestId('student-row-aaaaaaaa-0000-0000-0000-000000000012')).toBeVisible()
    await expect(page.getByTestId('student-row-other')).not.toBeVisible()

    // 12) teacher_views 기록 확인
    await page.getByTestId('student-row-aaaaaaaa-0000-0000-0000-000000000012').click()
    await expect(page.getByTestId('student-detail-name')).toContainText('D4학원생')
    const tvCount = await request.get('/api/test/teacher-views?studentId=aaaaaaaa-0000-0000-0000-000000000012')
    expect((await tvCount.json()).data.count).toBeGreaterThanOrEqual(1)
  })

  test('RLS — 다른 학원 owner는 D4 콘텐츠·학생 불가시', async ({ page }) => {
    await loginAs(page, 'owner.other-org@test.deepen.kr')
    const directDoc = await page.goto('/admin/studio/documents/d4-doc-id')
    expect(directDoc?.status()).toBe(404)
  })
})
```

## 9. 단위 테스트 lock — Vitest

위치 `tests/unit/`. 각 테스트는 50ms 이내 완료. 외부 IO 모킹.

### 9.1 `lib/grading/score.ts` — 8케이스

```typescript
// tests/unit/grading/score.test.ts
import { describe, expect, it } from 'vitest'
import { classifyAttempt, confidenceScore } from '@/lib/grading/score'

describe('classifyAttempt', () => {
  const baseSignals = { correct: true, timeMs: 60000, timeZ: 0, hintsUsed: 0, aiQuestions: 0, selfConfidence: 'sure' as const }

  it('1. 정답 + 빠름 + 자신감 sure → correct', () => {
    const cs = confidenceScore(baseSignals)
    expect(cs).toBeGreaterThanOrEqual(0.6)
    expect(classifyAttempt(baseSignals, cs)).toBe('correct')
  })

  it('2. 오답 → 항상 wrong (cs 무관)', () => {
    const s = { ...baseSignals, correct: false }
    expect(classifyAttempt(s, confidenceScore(s))).toBe('wrong')
  })

  it('3. 정답 + selfConfidence=unsure → unsure', () => {
    const s = { ...baseSignals, selfConfidence: 'unsure' as const }
    const cs = confidenceScore(s)
    expect(cs).toBeLessThan(0.6)
    expect(classifyAttempt(s, cs)).toBe('unsure')
  })

  it('4. 정답 + 힌트 1회 → cs=0.6 경계, sure 시 correct', () => {
    const s = { ...baseSignals, hintsUsed: 1, selfConfidence: 'sure' as const }
    const cs = confidenceScore(s)
    expect(cs).toBeCloseTo(1.0 - 0.4, 2) // 0.6
    expect(classifyAttempt(s, cs)).toBe('correct') // 정확히 임계
  })

  it('5. 정답 + 힌트 2회 → unsure', () => {
    const s = { ...baseSignals, hintsUsed: 2 }
    const cs = confidenceScore(s)
    expect(cs).toBeLessThan(0.6)
    expect(classifyAttempt(s, cs)).toBe('unsure')
  })

  it('6. 정답 + 시간 z=3 (매우 느림) → unsure', () => {
    const s = { ...baseSignals, timeZ: 3 }
    const cs = confidenceScore(s)
    expect(cs).toBeCloseTo(1.0 - 0.3 * 3, 2) // 0.1
    expect(classifyAttempt(s, cs)).toBe('unsure')
  })

  it('7. 정답 + AI 질문 3회 → unsure (헷갈림)', () => {
    const s = { ...baseSignals, aiQuestions: 3 }
    const cs = confidenceScore(s)
    expect(cs).toBeCloseTo(1.0 - 0.2 * 3, 2)
    expect(classifyAttempt(s, cs)).toBe('unsure')
  })

  it('8. timeZ 음수 (예상보다 빠름) → 패널티 없음', () => {
    const s = { ...baseSignals, timeZ: -2 }
    expect(confidenceScore(s)).toBe(1.0) // max(0, -2) = 0
  })
})
```

### 9.2 `lib/grading/elo.ts` — 갱신 수식

```typescript
// tests/unit/grading/elo.test.ts
import { describe, expect, it } from 'vitest'
import { updateElo } from '@/lib/grading/elo'

describe('updateElo', () => {
  it('동등 능력 + correct → 사용자 상승, Pattern 하락', () => {
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: 'correct' })
    expect(r.thetaUser).toBeGreaterThan(0.5)
    expect(r.betaPattern).toBeLessThan(0.5)
  })

  it('동등 능력 + wrong → 사용자 하락, Pattern 상승', () => {
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: 'wrong' })
    expect(r.thetaUser).toBeLessThan(0.5)
    expect(r.betaPattern).toBeGreaterThan(0.5)
  })

  it('동등 능력 + unsure → 사용자 상승 (labelScore=0.6)', () => {
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: 'unsure' })
    expect(r.thetaUser).toBeGreaterThan(0.5)
    expect(r.thetaUser).toBeLessThan(updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: 'correct' }).thetaUser)
  })

  it('낮은 사용자 + 어려운 Pattern + correct → 큰 상승', () => {
    const easy = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: 'correct' })
    const upset = updateElo({ thetaUser: 0.3, betaPattern: 0.7, label: 'correct' })
    expect(upset.thetaUser - 0.3).toBeGreaterThan(easy.thetaUser - 0.5)
  })

  it('극단값 안정 — theta=0.99 + correct → 0~1 범위 유지', () => {
    const r = updateElo({ thetaUser: 0.99, betaPattern: 0.50, label: 'correct' })
    expect(r.thetaUser).toBeLessThanOrEqual(1)
    expect(r.thetaUser).toBeGreaterThan(0)
  })

  it('K=32 lock — 이론적 최대 변화', () => {
    // expected=0.5, label=1 → delta=K*0.5=16 (Elo 점수)
    // theta 변환 후 약 0.04 상승 (sigmoid 형태)
    const r = updateElo({ thetaUser: 0.5, betaPattern: 0.5, label: 'correct' })
    expect(r.thetaUser - 0.5).toBeCloseTo(0.04, 2)
  })
})
```

### 9.3 `lib/recap/diagnose.ts` — 5케이스

```typescript
// tests/unit/recap/diagnose.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { diagnoseQ1 } from '@/lib/recap/diagnose'
import * as db from '@/lib/db/client'

vi.mock('@/lib/db/client')

describe('diagnoseQ1 — recapNeeded 트리거', () => {
  beforeEach(() => vi.clearAllMocks())

  it('1. prereq theta 0.3 + 최근 7d 오답 2회 → recap needed', async () => {
    mockDb({ prereqs: [{ id: 'p1' }], state: { p1: { theta: 0.3 } }, recentWrong: { p1: 2 } })
    const r = await diagnoseQ1('u1', 'item-1')
    expect(r.recapNeeded).toBe(true)
    expect(r.candidates[0].patternId).toBe('p1')
  })

  it('2. prereq theta 0.7 + 오답 0 → recap not needed', async () => {
    mockDb({ prereqs: [{ id: 'p1' }], state: { p1: { theta: 0.7 } }, recentWrong: { p1: 0 } })
    const r = await diagnoseQ1('u1', 'item-1')
    expect(r.recapNeeded).toBe(false)
  })

  it('3. 여러 prereq 중 가장 약한 것 1개만 반환', async () => {
    mockDb({ prereqs: [{ id: 'p1' }, { id: 'p2' }], state: { p1: { theta: 0.5 }, p2: { theta: 0.2 } }, recentWrong: { p1: 0, p2: 1 } })
    const r = await diagnoseQ1('u1', 'item-1')
    expect(r.candidates).toHaveLength(1)
    expect(r.candidates[0].patternId).toBe('p2')
  })

  it('4. 임계 경계 — score 0.6 정확히 → recap needed', async () => {
    // (1 - 0.4) * 0.7 + 0 * 0.3 = 0.42, theta=0.4면 score=0.42 < 0.6
    // (1 - 0.4) * 0.7 + (3/3) * 0.3 = 0.72 → needed
    mockDb({ prereqs: [{ id: 'p1' }], state: { p1: { theta: 0.4 } }, recentWrong: { p1: 3 } })
    const r = await diagnoseQ1('u1', 'item-1')
    expect(r.recapNeeded).toBe(true)
  })

  it('5. cold-start — prereq 없음 → recap not needed', async () => {
    mockDb({ prereqs: [], state: {}, recentWrong: {} })
    const r = await diagnoseQ1('u1', 'item-1')
    expect(r.recapNeeded).toBe(false)
    expect(r.candidates).toHaveLength(0)
  })
})

function mockDb(args: any) { /* vi.spyOn(...) 채움 */ }
```

### 9.4 `lib/session/*-machine.ts`

06-state-machines.md §9 표를 그대로 lock. 각 모드 파일별 8 시나리오 (위 §6 06 문서의 9개 시나리오).

```typescript
// tests/unit/session/practice-machine.test.ts
import { describe, expect, it } from 'vitest'
import { createActor } from 'xstate'
import { practiceMachine } from '@/lib/session/practice-machine'

describe('practiceMachine', () => {
  it('정답 → next', () => {
    const a = createActor(practiceMachine).start()
    a.send({ type: 'START', mode: 'practice', unitId: 'u1' })
    a.send({ type: 'SELECT_ITEM', itemId: 'i1' })
    a.send({ type: 'SUBMIT_ATTEMPT', payload: { result: { label: 'correct' }, diagnosis: { recapNeeded: false } } })
    expect(a.getSnapshot().value).toEqual({ READY: 'NEXT_PROMPT' })
  })

  it('오답 + recap needed → FOLLOWUP_RECAP', () => {
    const a = createActor(practiceMachine).start()
    a.send({ type: 'START', mode: 'practice', unitId: 'u1' })
    a.send({ type: 'SELECT_ITEM', itemId: 'i1' })
    a.send({
      type: 'SUBMIT_ATTEMPT',
      payload: {
        result: { label: 'unsure' },
        diagnosis: { recapNeeded: true, candidates: [{ patternId: 'p1', deficitProb: 0.7 }] },
      },
    })
    expect(a.getSnapshot().value).toEqual({ READY: 'FOLLOWUP_RECAP' })
    expect(a.getSnapshot().context.scheduledRecap).toHaveLength(1)
  })

  it('recap 통과 → 재도전 itemId == storedRetryItemId', () => {
    const a = createActor(practiceMachine).start()
    a.send({ type: 'START', mode: 'practice', unitId: 'u1' })
    a.send({ type: 'SELECT_ITEM', itemId: 'i1' })
    a.send({ type: 'SUBMIT_ATTEMPT', payload: { result: { label: 'wrong' }, diagnosis: { recapNeeded: true, candidates: [{ patternId: 'p1', deficitProb: 0.8 }] } } })
    a.send({ type: 'ENTER_RECAP', cards: [{ patternId: 'p1', name: 'p1', durationMin: 1, whyNeeded: '', coreBullets: ['','',''], checkQuiz: { question:'',answer:'',hint:'' } } as any] })
    a.send({ type: 'RECAP_QUIZ_PASS' })
    a.send({ type: 'RETURN_TO_RETRY' })
    expect(a.getSnapshot().context.currentItemId).toBe('i1')
  })
})

// tests/unit/session/exam-machine.test.ts
describe('examMachine', () => {
  it('recap needed라도 NEXT 직행', () => { /* ... */ })
  it('시간 초과 → 자동 SUBMIT', () => { /* ... */ })
})

// 동일 패턴으로 challenge, recovery, retry 머신
```

### 9.5 `lib/recommend/policy.ts` — 모드별 분기

```typescript
// tests/unit/recommend/policy.test.ts
import { describe, expect, it } from 'vitest'
import { nextAction } from '@/lib/recommend/policy'

describe('nextAction', () => {
  const base = {
    attemptResult: { label: 'correct' as const },
    diagnosis: { recapNeeded: false },
    userState: { consecutiveCorrect: 0 } as any,
  }

  it('practice + recap needed → recap', () => {
    const r = nextAction({ mode: 'practice', ...base, diagnosis: { recapNeeded: true, candidates: [{ patternId: 'p1', deficitProb: 0.8 }] } } as any)
    expect(r.type).toBe('recap')
  })

  it('exam → 항상 next_item (recap 차단)', () => {
    const r = nextAction({ mode: 'exam', ...base, diagnosis: { recapNeeded: true } } as any)
    expect(r.type).toBe('next_item')
  })

  it('challenge + 5 연속 정답 → level_up', () => {
    const r = nextAction({ mode: 'challenge', ...base, userState: { consecutiveCorrect: 5 } } as any)
    expect(r.type).toBe('level_up')
  })

  it('recovery + 3 연속 정답 → session_end', () => {
    const r = nextAction({ mode: 'recovery', ...base, userState: { consecutiveCorrect: 3 } } as any)
    expect(r.type).toBe('session_end')
  })

  it('retry → storedRetryItemId 강제', () => {
    const r = nextAction({ mode: 'retry', ...base, userState: { storedRetryItemId: 'i-stored' } } as any)
    expect(r.type).toBe('next_item')
    expect(r.payload.itemId).toBe('i-stored')
  })

  it('practice + theta < 0.4 → easy 우선', () => {
    const r = nextAction({ mode: 'practice', ...base, userState: { currentPatternTheta: 0.3 } } as any)
    expect(r.payload.samePattern).toBe(true)
    expect(r.payload.easy).toBe(2)
  })

  it('practice + theta >= 0.7 → killer + advanced', () => {
    const r = nextAction({ mode: 'practice', ...base, userState: { currentPatternTheta: 0.8 } } as any)
    expect(r.payload.advanced).toBe(1)
    expect(r.payload.killer).toBe(1)
  })
})
```

## 10. 통합 테스트 — DB up

`tests/integration/`. Postgres 컨테이너 띄우고 마이그레이션 실행, 시드 후 실제 DB 호출. LLM/Stripe만 모킹.

### 10.1 attempt-flow.test.ts — 어태치 → 마스터리 → 그래프 색

```typescript
// tests/integration/attempt-flow.test.ts
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { setupTestDb, teardownTestDb, resetDb, seedMath2 } from '../helpers/db'
import { POST as postAttempt } from '@/app/api/attempts/route'
import { GET as getGraph } from '@/app/api/graph/unit/[unitKey]/route'

describe('attempt → mastery → graph color (integration)', () => {
  beforeAll(setupTestDb)
  afterAll(teardownTestDb)
  beforeEach(async () => {
    await resetDb()
    await seedMath2()
  })

  it('정답 제출 → pattern_state 갱신 → graph fillColor 변화', async () => {
    const userId = 'aaaaaaaa-0000-0000-0000-000000000001'
    const itemId = '33333333-0000-0000-0000-000000000001'

    // 0) 풀이 전 그래프 색
    const before = await getGraph(makeReq({ userId }), { params: { unitKey: 'math2-calc' } })
    const beforeBody = await before.json()
    const targetNodeBefore = beforeBody.data.nodes.find((n: any) => n.id === '11111111-0001-0000-0000-000000000003')
    expect(targetNodeBefore.visualAttrs.fillColor).toBe('#E5E5E5') // 미학습

    // 1) 정답 제출
    const resp = await postAttempt(makeReq({
      userId,
      body: {
        itemId,
        selectedAnswer: '3',
        timeMs: 60000,
        hintsUsed: 0,
        aiQuestions: 0,
        selfConfidence: 'sure',
        mode: 'practice',
      },
    }))
    const body = await resp.json()
    expect(body.ok).toBe(true)
    expect(body.data.attemptResult.label).toBe('correct')

    // 2) pattern_state row 확인
    const stateRow = await queryDb<any>(`SELECT * FROM pattern_state WHERE user_id=$1 AND pattern_id=$2`, [userId, '11111111-0001-0000-0000-000000000003'])
    expect(stateRow.attempt_count).toBe(1)
    expect(stateRow.theta).toBeGreaterThan(0.5)

    // 3) user_item_history row 확인
    const hist = await queryDb<any>(`SELECT * FROM user_item_history WHERE user_id=$1 AND item_id=$2`, [userId, itemId])
    expect(hist.seen_count).toBe(1)
    expect(hist.result_history).toHaveLength(1)
    expect(hist.result_history[0].label).toBe('correct')

    // 4) 그래프 색 변화 확인
    const after = await getGraph(makeReq({ userId }), { params: { unitKey: 'math2-calc' } })
    const afterBody = await after.json()
    const targetAfter = afterBody.data.nodes.find((n: any) => n.id === '11111111-0001-0000-0000-000000000003')
    expect(targetAfter.visualAttrs.fillColor).not.toBe('#E5E5E5')
  })

  it('헷갈림 → diagnoseQ1 → recap candidate 응답', async () => {
    const userId = 'aaaaaaaa-0000-0000-0000-000000000001' // theta_p10=0.30 사전 시드됨
    const itemId = '33333333-0000-0000-0000-000000000001'
    const resp = await postAttempt(makeReq({
      userId,
      body: { itemId, selectedAnswer: '3', timeMs: 240000, hintsUsed: 1, aiQuestions: 0, selfConfidence: 'unsure', mode: 'practice' },
    }))
    const body = await resp.json()
    expect(body.data.attemptResult.label).toBe('unsure')
    expect(body.data.diagnosis.recapNeeded).toBe(true)
    expect(body.data.diagnosis.candidatePrereq[0].patternId).toBe('11111111-0001-0000-0000-000000000010')
  })

  it('exam 모드 — recap candidate strip', async () => {
    const userId = 'aaaaaaaa-0000-0000-0000-000000000001'
    const itemId = '33333333-0000-0000-0000-000000000001'
    const resp = await postAttempt(makeReq({
      userId,
      body: { itemId, selectedAnswer: '3', timeMs: 240000, hintsUsed: 0, aiQuestions: 0, selfConfidence: 'unsure', mode: 'exam' },
    }))
    const body = await resp.json()
    expect(body.data.diagnosis.recapNeeded).toBe(false)
    expect(body.data.diagnosis.candidatePrereq).toEqual([])
  })

  it('AI 코치 사용량 — Free 5회 후 quota_exceeded', async () => {
    // ai_coach_calls에 5회 INSERT 후 6번째 시도 → 429
    // 생략
  })

  it('RLS — 다른 사용자 history 조회 불가', async () => {
    // userA로 attempt 후 userB 인증으로 같은 row SELECT → 0건
  })
})
```

### 10.2 헬퍼

```typescript
// tests/helpers/db.ts
import { execSync } from 'node:child_process'

export async function setupTestDb() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  execSync('pnpm db:push', { stdio: 'inherit' })
}
export async function teardownTestDb() { /* drop all */ }
export async function resetDb() { /* TRUNCATE all tables */ }
export async function seedMath2() { /* psql -f tests/fixtures/seed-math2.sql */ }

export function makeReq(args: { userId: string; body?: any }): Request { /* mock Request with auth header */ }
export async function queryDb<T>(sql: string, params: any[]): Promise<T> { /* pg client */ }
```

## 11. 부하 테스트 — k6

`tests/load/`. CI main 머지 시 실행, 결과 대시보드 (Grafana k6).

### 11.1 `api.js` — 일반 API 100 RPS

```javascript
// tests/load/api.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend } from 'k6/metrics'

const attemptLatency = new Trend('attempt_latency_ms')

export const options = {
  scenarios: {
    attempts: {
      executor: 'constant-arrival-rate',
      rate: 100, timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50, maxVUs: 200,
    },
  },
  thresholds: {
    'http_req_duration{name:attempt}': ['p(95)<800'],
    'http_req_failed': ['rate<0.005'],
    'attempt_latency_ms': ['p(95)<800'],
  },
}

const BASE = __ENV.BASE_URL
const TOKENS = JSON.parse(open('./tokens.json'))

export default function () {
  const token = TOKENS[Math.floor(Math.random() * TOKENS.length)]
  const itemId = '33333333-0000-0000-0000-000000000001'
  const t0 = Date.now()
  const r = http.post(`${BASE}/api/attempts`, JSON.stringify({
    itemId,
    selectedAnswer: String(Math.floor(Math.random() * 5) + 1),
    timeMs: 60000 + Math.random() * 60000,
    hintsUsed: 0, aiQuestions: 0,
    selfConfidence: 'mid', mode: 'practice',
  }), {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    tags: { name: 'attempt' },
  })
  attemptLatency.add(Date.now() - t0)
  check(r, { '200': res => res.status === 200, 'ok=true': res => JSON.parse(res.body).ok })
  sleep(0.3 + Math.random() * 0.7)
}
```

### 11.2 `ai-coach-stream.js` — 20 동시 SSE

```javascript
// tests/load/ai-coach-stream.js
import http from 'k6/http'
import { Trend } from 'k6/metrics'

const ttft = new Trend('first_token_latency_ms')

export const options = {
  scenarios: {
    chat: {
      executor: 'constant-vus',
      vus: 20, duration: '3m',
    },
  },
  thresholds: {
    'first_token_latency_ms': ['p(95)<1500'],
  },
}

export default function () {
  const t0 = Date.now()
  const r = http.post(`${BASE}/api/ai-coach/chat`, JSON.stringify({
    itemId: '33333333-0000-0000-0000-000000000001',
    message: '이 문제 어떻게 시작해?',
    chipKey: 'hint',
  }), { headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', Authorization: `Bearer ${TOKEN}` } })
  // k6는 SSE 직접 파싱 어려움 — 응답 본문에서 첫 'event: token' 라인까지의 시간 계측
  const firstTokenIdx = r.body.indexOf('event: token')
  if (firstTokenIdx > -1) {
    // 정확한 측정은 별도 nodejs 스크립트로 (k6/ws) 또는 puppeteer
    ttft.add(Date.now() - t0)
  }
}
```

### 11.3 통과 임계

| 메트릭 | 임계 |
|---|---|
| `http_req_duration{name:attempt} p95` | < 800ms |
| `first_token_latency_ms p95` | < 1500ms |
| `http_req_failed` | < 0.5% |
| 5분 sustained 후 메모리 leak | < 100MB 증가 |

## 12. 수동 QA 체크리스트

CI로 못 잡는 UX 회귀 + 디바이스 변동을 매 분기 말 30분 sanity check.

### 12.1 분기별 공통 (30분)

- [ ] 메인 단원 진입 → 그래프 첫 페인트 ≤ 2s 체감
- [ ] Pattern 노드 클릭 → Item 패널 ≤ 500ms 노출
- [ ] 풀이 화면 진입 → 문제 본문 즉시 노출, 보기 흐트러짐 없음
- [ ] 객관식 답 선택 → 시각 피드백 즉시
- [ ] 자신감 슬라이더 — 손가락 터치 OK, 키보드 ←→ OK
- [ ] 제출 버튼 — 더블클릭에도 1번만 호출 (idempotency)
- [ ] 채점 응답 ≤ 1.5s 체감
- [ ] 리캡카드 — bullet 줄바꿈/수식 깨짐 없음
- [ ] 5칩 카피 — 12자 초과 시 줄임
- [ ] AI 코치 스트리밍 — 첫 토큰 ≤ 1.5s, 끊김 없음
- [ ] AI 코치 카드 인서트 — 흐름 자연스러움
- [ ] 그래프 노드 색 — 의미 직관 (회색 미학습 / 초록 안정 / 노란 약한 빈출 등)
- [ ] 페이지 새로고침 시 세션 복구
- [ ] 탭 백그라운드 → 5분 후 복귀 시 정상

### 12.2 Q1 말 (M1.6)

- [ ] D1 시나리오 수동 1회
- [ ] 단원 미선택 → 추천 단원 노출
- [ ] 풀이 후 그래프 복귀 시 색 갱신 ≤ 2s
- [ ] 한국어 입력 한글 조합 시 IME 깜빡임 없음

### 12.3 Q2 말 (M2.5)

- [ ] D2 시나리오 수동 1회
- [ ] iPad Safari에서 tldraw 펜슬 — 굵기/색 변경, undo, 지우개
- [ ] OCR 결과 패널 — 매칭 행/미매칭 행 시각 분리
- [ ] 모드 선택 — practice/exam/recovery/challenge 4종 노출
- [ ] exam 모드 진입 시 5칩·AI 코치 영역 disable 표시
- [ ] 어드민 검수 — 카드 publish/discard, 시그니처 수정 인라인

### 12.4 Q3 말 (M3.5)

- [ ] D3 시나리오 수동 1회
- [ ] Pro 결제 직후 캡 30/일로 즉시 갱신
- [ ] 자정(KST) 후 카운터 리셋 (테스트는 시계 조작)
- [ ] 통계 대시보드 — 주간 마스터리, 약점 노드 표시
- [ ] 보호자 리포트 이메일 렌더 — 다크모드 클라이언트에서도 가독

### 12.5 Q4 말 (M4.5)

- [ ] D4 시나리오 수동 1회
- [ ] 학원 owner 가입 → 클래스 → 학생 등록 흐름 막힘 없음
- [ ] 강의안 업로드 후 검수 큐에 즉시 노출
- [ ] 다른 학원 owner로 로그인 시 D4 콘텐츠 unicode/ID 검색 모두 차단 (RLS)
- [ ] 교사 히트맵 — 학생 30명 이상에서 가로 스크롤 동작
- [ ] 교사 학생 상세 — teacher_views 자동 기록

### 12.6 디바이스 매트릭스

매 릴리스 전 다음 기기에서 위 §12.1을 1회씩:

| 기기 | 브라우저 | 우선 |
|---|---|---|
| iPad Pro 11" (iPadOS 17+) | Safari | P0 (Q2 이후 필수) |
| MacBook (1440×900) | Chrome 최신 | P0 |
| MacBook | Firefox 최신 | P1 |
| Windows 데스크탑 (1920×1080) | Chrome | P0 |
| Galaxy Tab S9 | Chrome Android | P1 |
| iPhone 15 (모바일 보조) | Safari | P2 (제한 사용 가능 정도) |

P0 실패 시 release 게이트. P1 실패는 다음 분기 backlog. P2는 known issue.

## 13. A11y / 성능 budget

### 13.1 자동화 a11y — axe-core

```typescript
// tests/e2e/a11y.spec.ts
import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

const ROUTES = ['/v2/home', '/v2/study/math2-calc', '/v2/solve/33333333-0000-0000-0000-000000000001', '/billing', '/teacher/classes']

for (const route of ROUTES) {
  test(`a11y - ${route}`, async ({ page }) => {
    await loginAs(page, 'student.d1@test.deepen.kr')
    await page.goto(route)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations).toEqual([])
  })
}
```

위반 0건 lock. 위반 등장 시 즉시 fix 또는 ignore 사유 PR description.

### 13.2 키보드 only

- `tab` 만으로 풀이 시작 → 답 선택 → 제출 가능
- focus ring 명확
- skip-to-content 링크

### 13.3 스크린리더

- VoiceOver(Mac), NVDA(Windows)에서 다음 안내가 자연스럽게 읽힘:
  - "1번 보기, 5개 중 1번"
  - "자신감 슬라이더, 0에서 100, 현재 50"
  - "제출 버튼"
  - "리캡카드: 판별식, 1분"

### 13.4 Web Vitals budget

`next.config` 또는 `app/layout.tsx`에서 측정:

| 메트릭 | budget | route 별 측정 |
|---|---|---|
| LCP | ≤ 2.5s p75 | /v2/study/*, /v2/solve/* |
| INP | ≤ 200ms p75 | 모든 인터랙션 라우트 |
| CLS | ≤ 0.1 p75 | 모든 라우트 |
| FCP | ≤ 1.8s p75 | / (랜딩) |
| TTFB | ≤ 600ms p75 | API 라우트 |

릴리스 전 Lighthouse CI(`@lhci/cli`) 자동 실행. 위 매트릭 위반 시 release 차단.

## 14. 회귀 방지 매트릭스

기능 추가/변경 시 깨지면 안 되는 핵심 테스트.

| 변경 영역 | 깨지면 안 되는 테스트 |
|---|---|
| `lib/grading/score.ts` 임계값 | 단위 §9.1 8케이스 + D1 E2E |
| `lib/grading/elo.ts` K값 | 단위 §9.2 + 통합 §10.1 mastery 갱신 |
| `lib/recap/diagnose.ts` 임계 | 단위 §9.3 + D1 E2E |
| `app/api/attempts` 핸들러 | 통합 §10.1 + D1·D2·D3 E2E |
| `lib/session/practice-machine.ts` | 단위 §9.4 + D1 E2E |
| 5칩 카피 | E2E `chip-*` selector 유지 + a11y 라벨 |
| 그래프 visual encoding | D1 E2E §5.4 step 11 + visual regression (Percy 또는 Playwright snapshot) |
| 결제 webhook | D3 E2E + 단위 webhook signature 검증 |
| RLS 정책 변경 | 통합 §10.1 RLS 케이스 + D4 RLS 케이스 |
| LLM prompt 수정 | 평가 셋 20쌍 회귀 ≤ 5% 변화 (05-llm-prompts §10) |
| 스키마 마이그레이션 | 마이그레이션 dry-run + 통합 전체 + 백업 복원 1회 |

### 시각 회귀 (Playwright snapshot)

핵심 화면 4개에 대해 PNG 스냅샷 lock. 변경 시 PR description에 의도된 시각 변화 명시.

```typescript
// tests/e2e/visual.spec.ts
test('visual - solve page', async ({ page }) => {
  await loginAs(page, 'student.d1@test.deepen.kr')
  await page.goto('/v2/solve/33333333-0000-0000-0000-000000000001')
  await expect(page).toHaveScreenshot('solve-page.png', { maxDiffPixelRatio: 0.02 })
})
test('visual - graph', async ({ page }) => { /* ... */ })
test('visual - recap card', async ({ page }) => { /* ... */ })
test('visual - teacher heatmap', async ({ page }) => { /* ... */ })
```

## 15. CI 통합 (lock)

GitHub Actions. 워크플로 4개:

### 15.1 PR (`.github/workflows/pr.yml`)

```yaml
name: PR
on: [pull_request]
jobs:
  unit-lint-type:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:unit
      - run: pnpm test:integration
        env:
          TEST_DATABASE_URL: ${{ secrets.CI_TEST_DATABASE_URL }}
```

소요: ≤ 6분 목표. 실패 시 머지 차단.

### 15.2 main 머지 (`.github/workflows/main.yml`)

```yaml
name: main
on:
  push:
    branches: [main]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium firefox webkit
      - run: pnpm build
      - run: pnpm start &
      - run: pnpm test:e2e
        env:
          MOCK_LLM: '1'
          BASE_URL: 'http://localhost:3000'
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
  load:
    runs-on: ubuntu-latest
    needs: e2e
    steps:
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/api.js
        env:
          BASE_URL: ${{ secrets.STAGING_URL }}
      - uses: grafana/k6-action@v0.3.1
        with:
          filename: tests/load/ai-coach-stream.js
  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:visual
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: visual-diff, path: tests/__snapshots__/ }
```

소요: ≤ 25분 목표. 실패 시 자동 알림 (Slack #deepen-ci).

### 15.3 릴리스 태그 (`.github/workflows/release.yml`)

```yaml
name: release
on:
  push:
    tags: ['v*']
jobs:
  smoke-prod:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:smoke
        env:
          BASE_URL: 'https://deepen.kr'
          # smoke = 인증 후 home 진입 + 1 attempt 라운드트립만
      - run: pnpm test:a11y
        env: { BASE_URL: 'https://deepen.kr' }
```

소요: ≤ 5분. 실패 시 즉시 롤백 (13-deployment.md 런북 참조).

### 15.4 야간 (`.github/workflows/nightly.yml`)

```yaml
name: nightly
on:
  schedule: [{ cron: '0 18 * * *' }]   # 03:00 KST 매일
jobs:
  full-suite:
    steps:
      - run: pnpm test:e2e:all-browsers   # chromium + firefox + webkit
      - run: pnpm test:load:soak           # 30분 sustained
      - run: pnpm test:llm-eval            # 평가 셋 20쌍, drift 검출
```

drift > 5% 시 알림.

## 16. 실행 명령 lock (`package.json`)

```json
{
  "scripts": {
    "test:unit": "vitest run --dir tests/unit",
    "test:unit:watch": "vitest --dir tests/unit",
    "test:integration": "vitest run --dir tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:all-browsers": "playwright test --project=chromium --project=firefox --project=webkit",
    "test:smoke": "playwright test tests/e2e/smoke.spec.ts",
    "test:a11y": "playwright test tests/e2e/a11y.spec.ts",
    "test:visual": "playwright test tests/e2e/visual.spec.ts",
    "test:load:api": "k6 run tests/load/api.js",
    "test:load:stream": "k6 run tests/load/ai-coach-stream.js",
    "test:load:soak": "k6 run tests/load/api.js --duration 30m",
    "test:llm-eval": "tsx tests/llm-eval/run.ts",
    "test:db:reset": "tsx tests/helpers/reset-test-db.ts"
  }
}
```

## 17. Playwright 설정 lock

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list'], process.env.CI ? ['github'] : null].filter(Boolean) as any,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    storageState: undefined,
    actionTimeout: 10_000,
  },
  projects: [
    { name: 'setup', testMatch: /global-setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    { name: 'ipad', use: { ...devices['iPad Pro 11'] }, dependencies: ['setup'] },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'MOCK_LLM=1 pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

### Global setup — auth state 캐시

```typescript
// tests/e2e/_helpers/global-setup.ts
import { chromium, type FullConfig } from '@playwright/test'

const USERS = [
  { email: 'student.d1@test.deepen.kr', file: 'auth-d1.json' },
  { email: 'student.d2@test.deepen.kr', file: 'auth-d2.json' },
  { email: 'student.d3@test.deepen.kr', file: 'auth-d3.json' },
  { email: 'owner.d4@test.deepen.kr', file: 'auth-d4-owner.json' },
  { email: 'teacher.d4@test.deepen.kr', file: 'auth-d4-teacher.json' },
  { email: 'student.d4@test.deepen.kr', file: 'auth-d4-student.json' },
]

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  for (const u of USERS) {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`${config.use!.baseURL}/login`)
    await page.getByTestId('login-email').fill(u.email)
    await page.getByTestId('login-password').fill('Test1234!')
    await page.getByTestId('login-submit').click()
    await page.waitForURL(/\/v2|\/admin|\/teacher/)
    await ctx.storageState({ path: `tests/e2e/.auth/${u.file}` })
    await ctx.close()
  }
  await browser.close()
}
```

### loginAs 헬퍼

```typescript
// tests/e2e/_helpers/auth.ts
import type { Page } from '@playwright/test'

const FILE_BY_EMAIL: Record<string, string> = {
  'student.d1@test.deepen.kr': 'auth-d1.json',
  'student.d2@test.deepen.kr': 'auth-d2.json',
  'student.d3@test.deepen.kr': 'auth-d3.json',
  'owner.d4@test.deepen.kr': 'auth-d4-owner.json',
  'teacher.d4@test.deepen.kr': 'auth-d4-teacher.json',
  'student.d4@test.deepen.kr': 'auth-d4-student.json',
}

export async function loginAs(page: Page, email: string) {
  const file = FILE_BY_EMAIL[email]
  if (!file) throw new Error(`Unknown test user: ${email}`)
  await page.context().addCookies(JSON.parse(require('node:fs').readFileSync(`tests/e2e/.auth/${file}`, 'utf8')).cookies)
}
```

## 18. Vitest 설정 lock

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      thresholds: {
        lines: 70,
        functions: 70,
        statements: 70,
        branches: 65,
      },
      include: ['lib/grading/**', 'lib/recap/**', 'lib/recommend/**', 'lib/session/**'],
    },
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

## 19. Test-only API endpoint 정책

`app/api/test/*` 라우트는 다음 가드 필수:

```typescript
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('not found', { status: 404 })
  }
  if (process.env.ALLOW_TEST_ENDPOINTS !== '1') {
    return new Response('forbidden', { status: 403 })
  }
  // ... 실제 처리
}
```

CI / staging에서만 `ALLOW_TEST_ENDPOINTS=1` 부여. production 빌드 시 webpack에서 dead-code elimination 또는 `next.config.ts` 라우트 제외.

```typescript
// next.config.ts
const config: NextConfig = {
  // ...
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return { beforeFiles: [{ source: '/api/test/:path*', destination: '/404' }] }
    }
    return []
  },
}
```

## 20. release 게이트 체크리스트 (단일)

릴리스 전 다음을 모두 표기:

- [ ] D1·D2·D3·D4 E2E green (chromium + ipad project 모두)
- [ ] 단위 + 통합 green (커버리지 ≥ 70%)
- [ ] axe-core 위반 0
- [ ] visual regression 변경 의도 PR description 명시 + 승인
- [ ] k6 부하 (5분 sustained 100 RPS) p95 ≤ 800ms
- [ ] LLM 평가 셋 20쌍 drift ≤ 5%
- [ ] 수동 QA §12 분기별 체크 완료 (담당자 sign-off)
- [ ] 디바이스 매트릭스 P0 실패 0
- [ ] DB 마이그레이션 dry-run + 백업 복원 검증
- [ ] Sentry release 등록 + 소스맵 업로드
- [ ] 13-deployment.md §롤백 런북 검토

본 체크리스트가 모두 충족된 PR/태그만 main → production 승격.

## 21. 변경 관리

- 본 spec 변경 PR 제목: `[spec/12-acceptance] <summary>`
- 임계값(SLO·budget·임계 P*) 변경 시 cohort 데이터 또는 이론적 근거 첨부
- 새 D5+ 시나리오 추가 시: D 매트릭스 + Playwright 코드 + LLM mock 시나리오 한 PR에
- testid 추가는 자유, 삭제·이름 변경은 회귀 매트릭스 §14 영향 평가 필수
