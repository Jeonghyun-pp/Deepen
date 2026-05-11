# 07 · Q1 빌드 (M1.1 ~ M1.6)

> 분기 목표: **연습 모드 단일 critical path를 데모 가능한 수준까지** 끌어올린다. 풀이 → 헷갈림 채점 → 단일 리캡카드 → 재도전 → 동적 학습 지도 갱신까지 한 시나리오로 흐른다. 결제·실전·챌린지·OCR·임베딩은 다음 분기.
>
> 본 문서는 계약(02~06)을 참조 only. 구체 수식·스키마·프롬프트는 계약 문서에서 인용한다. **계약 내용을 본 문서에 복붙 금지.** 구현 상세 파일이 어디에 들어가는지, 어떻게 묶이는지를 lock한다.

## Q1 결정사항 (locked, 00-INDEX §의사결정 인용)

| ID | 결정 | Q1 영향 |
|---|---|---|
| A-1 | 백엔드 Pattern only + 프론트 'Concept' alias | M1.1 마이그레이션이 type/displayLayer를 분리. UI 카피는 보일러플레이트 라이브러리에서 'Concept'으로 노출 |
| A-2 | PDF 파이프라인 = Phase 1-B 보조 도구 (draft → 어드민 검수) | Q1엔 PDF 파이프라인 신규 작업 없음. 현행 코드 동결, 어드민 검수는 Q2(M2.6) |
| A-3 | Q1 = 연습 모드만 | 모드 셀렉터 미노출. `practice-machine.ts` 단일 머신만 빌드 |
| B-4 | 5칩 카피: 힌트/정의/오답근거/단계펼치기/유형변형 | M1.5에서 5칩 정적 lock 카피 + chipKey enum 적용 (`hint`,`definition`,`wrong_reason`,`unfold`,`variant`) |
| B-5 | 헷갈림 = 5신호 가중 합산 + 자신감 슬라이더 (w=1.0,0.3,0.4,0.2,0.5, τ=0.6) | M1.2 채점 엔진. 슬라이더 UI는 M1.3 |
| B-6 | "리캡카드" 명명 | M1.4. UI 컴포넌트 이름 `RecapCard.tsx` 강제 |
| C-9 (일부) | 가격: Free 5회 평생 / Pro 일 30회 / Pro+ 무제한 | Q1엔 결제 미연결. `ai_coach_calls` 테이블 + `check_ai_quota` SQL 함수만 M1.1에 미리 lay-down. 클라엔 quota 초과 메시지만 노출 (실제 차단은 M3.1). |

이 외 결정(C-7 streak 미도입 등)은 Q1엔 별도 영향 없음.

## Q1 마일스톤 한눈

| 마일스톤 | 기간 | 시연 가능 산출물 |
|---|---|---|
| M1.1 | 1주 | 마이그레이션 + 타입 + RLS 통과한 빈 DB. 기존 `app/v2`가 죽지 않음. |
| M1.2 | 1주 | `POST /api/attempts` 호출하면 reasonTags + masteryUpdate가 옳게 돌아옴 (Postman/Vitest 데모). |
| M1.3 | 2주 | `app/v2/solve/[itemId]` 화면이 객관식 + 자신감 슬라이더 + 5칩 자리 + 결과 풀스크린까지 흐름 완성 (recap·코치 mock). |
| M1.4 | 2주 | DAG 역추적 진단 + 단일 리캡카드 + 재도전 흐름. 시연: 풀이 오답 → 카드 → 통과 → 원래 문제 정답 → 다음. |
| M1.5 | 2주 | AI 코치 사이드 패널 + 5칩 + 그래프 노드 하이라이트 streaming. 시연: 막힌 문제에 코치 호출, 토큰 스트리밍, 카드 인서트. |
| M1.6 | 2주 (통합 + 데모 포함) | 동적 학습 지도(visual encoding) + practice 머신 통합 + D1 인수 시나리오 패스. |

총 12주 (정확히는 1+1+2+2+2+2+@통합 2주). M1.6 마지막 주는 D1 인수 통합·버그·데모 리허설로만 사용.

## 의존성 그래프

```
M1.1 (DB)
  ├─ M1.2 (Elo 갱신은 pattern_state 필요)
  │   └─ M1.3 (풀이 화면이 /api/attempts 의존)
  │       └─ M1.4 (recap 진단이 attempt 결과 의존)
  │           └─ M1.5 (코치가 attempt 컨텍스트 + recap 도구 의존)
  │               └─ M1.6 (visual encoding이 patternState theta 의존)
```

병렬화 가능 지점:
- M1.2와 M1.3 동시 (M1.3는 mock attemptResult로 시작 → M1.2 머지 후 실연결)
- M1.4의 LLM 프롬프트 작성과 M1.3 UI 가능
- M1.5 코치 백엔드와 M1.4 카드 UI는 독립

---

# M1.1 — DB 스키마 + 마이그레이션 (1주)

## Goals

- 02-schema.md `0004_pattern_only` + `0005_learner_state` 마이그레이션을 production-ready로 lay-down
- `lib/db/schema.ts`가 Pattern/Item alias·신규 테이블 4종을 반영
- 기존 `app/v2` 페이지가 SSR 단계에서 죽지 않음 (백필 후 nodes.type='pattern' 호환)
- `check_ai_quota` SQL 함수 + `user_wrong_note` view 둘 다 production DB에 적용
- Drizzle 타입이 v2 페이지에서 import 가능

## 파일 경로

신규:
- `drizzle/0004_pattern_only.sql` — 02-schema §1 SQL 그대로
- `drizzle/0005_learner_state.sql` — userItemHistory + patternState + aiCoachCalls + RLS
- `drizzle/views/0001_user_wrong_note.sql` — 02-schema §2 view 정의 (드라이즐 마이그레이션 외 별도 디렉터리, supabase migration runner가 같이 적용)
- `drizzle/functions/0001_check_ai_quota.sql` — 02-schema §4 함수
- `scripts/migrate-to-pattern-only.ts` — 02-schema §12. 기존 노드 백필 + 사이클 검증
- `lib/db/types.ts` — 02-schema §11 타입 + JSONB 타입 (AttemptResult, ReasonTag 등)

수정:
- `lib/db/schema.ts` — 02-schema §1·2·3·4 Drizzle 정의 그대로 반영. 기존 `nodeTypeEnum`은 02-schema §1 SQL에서 drop+recreate되므로 코드도 ['pattern','item']만 남김
- `drizzle/meta/_journal.json` — drizzle-kit 자동 갱신 (수동 수정 금지)
- `lib/db/client.ts` — 변경 없음 (기존 supabase 연결 재사용)

## API 엔드포인트

- 신규 없음. 다음 마일스톤이 사용할 테이블/함수만 lay-down.
- 단, 03-api-contracts §15 `GET /api/health`에 `db.migrationsApplied: ['0004','0005']` 응답 필드 추가 (운영 점검용).

## DB 스키마 변경

02-schema 그대로:
- §1 nodes 컬럼 추가 + enum 재정의 + RLS
- §2 user_item_history 테이블 + view
- §3 pattern_state 테이블
- §4 ai_coach_calls 테이블 + check_ai_quota 함수
- 0006_confidence_log은 M1.2에서 결정 (B-5에서 `selfConfidence`를 result_history JSONB 안에 둘지, 별도 컬럼으로 뺄지). 본 마일스톤에선 lay-down 안 함.

## 컴포넌트 spec

해당 없음 (DB 마일스톤).

## 알고리즘 의존

해당 없음. 04-algorithms 정수상수만 코드 상수로 import 준비:

```typescript
// lib/grading/constants.ts (M1.2 도입 예정 — M1.1엔 빈 stub)
export const TAU_HIGH = 0.6
export const W = { correct: 1.0, time: 0.3, hints: 0.4, ai: 0.2, conf: 0.5 } as const
export const K = 32
```

## LLM 프롬프트 의존

없음.

## 의존 마일스톤

없음 (분기 첫 마일스톤).

## 작업량 추정

- 마이그레이션 SQL 작성·검증: 2 인일
- 백필 스크립트 + 사이클 검증: 1 인일
- Drizzle 타입 + types.ts: 0.5 인일
- RLS 정책 회귀 테스트: 1 인일
- 헬스체크 + 마이그레이션 idempotency 확인: 0.5 인일

**합계: 5 인일 (1주, 1인 풀타임)**

## Acceptance criteria

1. `pnpm drizzle-kit migrate` 신규 환경에서 0001~0005 모두 무오류 적용
2. 기존 dev DB에서도 무오류 (백필 후 기존 nodes 모두 type='pattern' or 'item', null 없음)
3. RLS 회귀: 다른 user_id로 로그인한 client가 본인 외 nodes·user_item_history·pattern_state·ai_coach_calls를 SELECT 시 0 row 반환
4. `SELECT check_ai_quota('<free user uuid>')` 가 (free 5회 미만이면) `true`, (5회 채우면) `false`. 더미 데이터로 두 케이스 검증
5. `app/v2/home`, `app/v2/graph` 페이지가 마이그레이션 후에도 기존 노드 표시. 콘솔 에러 0
6. `lib/db/schema.ts`에서 `import type { AttemptResult, ReasonTag, PatternStateRow } from "@/lib/db/types"` 가능
7. `GET /api/health` 응답에 `migrationsApplied: ["0001","0002","0003","0004","0005"]` 포함

## 주의 사항

- 02-schema §1 SQL의 type 컬럼 재매핑은 트랜잭션 안에서 수행. 실패 시 롤백 보장
- 백필 시 기존 `concept`/`technique`/`application` 노드를 모두 `pattern + display_layer='concept'`로 변환. 이게 A-1 alias의 출발점
- chunkNodeMappings은 그대로 두되, mapping 대상 nodeId가 백필로 살아남는지 확인

---

# M1.2 — Pattern Elo 채점 엔진 (1주)

## Goals

- `POST /api/attempts` 호출 1회로 다음 모두 일어나야 함:
  - AttemptResult 분류 (correct/wrong/unsure)
  - 룰 기반 reasonTags 즉시 부여
  - 모든 매핑 Pattern의 theta/beta 갱신 + pattern_state upsert
  - user_item_history.result_history append
- Vitest로 4개 골든 시나리오 (정답/헷갈림/오답+힌트/오답+시간초과) 통과
- AI 비동기 분류는 큐 enqueue까지만 (수신은 다음 마일스톤). Q1에선 동기 처리 X.

## 파일 경로

신규:
- `lib/grading/score.ts` — `classifyAttempt`, `confidenceScore`, `ruleBaseTags` (04-algorithms §1)
- `lib/grading/elo.ts` — `updateElo`, `ELO_TO_THETA`, `THETA_TO_ELO` (04-algorithms §2)
- `lib/grading/constants.ts` — TAU_HIGH, W, K
- `lib/grading/avg-time.ts` — `getItemAvgTime` + 7일 캐시 (Postgres MV 또는 in-memory LRU)
- `lib/grading/persist.ts` — user_item_history append + pattern_state upsert (Drizzle 트랜잭션)
- `lib/grading/index.ts` — `processAttempt(input): AttemptResult & MasteryUpdate` 통합 함수
- `app/api/attempts/route.ts` — 03-api-contracts §2 핸들러 (zod parse + processAttempt + nextAction stub)
- `lib/api/schemas/attempts.ts` — zod
- `tests/unit/grading/score.test.ts`, `elo.test.ts`, `process-attempt.test.ts`

수정:
- `lib/api/handler.ts` — `withAuth` + `parseRequest` 헬퍼 (없으면 신규)
- `lib/api/errors.ts` — ErrorCode enum (03-api-contracts §공통)

## API 엔드포인트

- `POST /api/attempts` (03-api-contracts §2) — request/response 그대로. 단 본 마일스톤에선 `diagnosis` 필드는 stub (`recapNeeded: false, candidates: []`), `nextAction.type='next_item'` 고정. M1.4에서 채움.

## DB 스키마 변경

해당 없음 (M1.1에서 lay-down 끝). 단 결정 필요:
- B-5 `selfConfidence` 저장 위치 lock — `user_item_history.result_history[].signals.selfConfidence`로만 저장. 별도 `confidenceLog` 테이블 안 만든다 (작은 분석용 SQL view로 충분).

## 컴포넌트 spec

해당 없음 (서버 로직).

## 알고리즘 의존

- 04-algorithms §1 (채점 분기) — 그대로 구현
- 04-algorithms §2 (Pattern Elo) — 그대로 구현
- 04-algorithms §1.2 timeZ — `getItemAvgTime` fallback (cohort < 30 attempts일 때 difficulty 기반 추정)

## LLM 프롬프트 의존

- 비동기 분류 큐만 enqueue. 실제 호출은 M1.5에서.
- queue 페이로드: `{ attemptId, itemId, userId, userAnswer, ocrSteps?: undefined }`. queue 백엔드는 일단 Postgres 테이블 `attempt_classify_queue` 또는 in-process queue 한 줄로 stub.

## 의존 마일스톤

- M1.1 (모든 신규 테이블 + 타입)

## 작업량 추정

- score.ts + 단위 테스트: 1 인일
- elo.ts + 다중 Pattern 갱신: 1 인일
- persist.ts (트랜잭션·upsert): 1 인일
- /api/attempts 핸들러 + zod: 1 인일
- avg-time 캐시 + fallback: 0.5 인일
- 골든 시나리오 4종 테스트: 0.5 인일

**합계: 5 인일 (1주)**

## Acceptance criteria

1. **시나리오 A 정답**: `correct=1, timeMs=60000, hintsUsed=0, aiQuestions=0, selfConfidence='sure'`
   - confidenceScore ≥ 0.6 → label='correct'
   - 매핑 Pattern 모두 theta 증가 (delta > 0)
2. **시나리오 B 헷갈림**: `correct=1, timeMs=180000 (z>2), hintsUsed=2, aiQuestions=1, selfConfidence='unsure'`
   - confidenceScore < 0.6 → label='unsure'
   - reasonTags ⊇ ['time_overrun', 'hint_dependent']
3. **시나리오 C 오답**: `correct=0, ...`
   - label='wrong'
   - theta는 감소, beta는 약간 감소
4. **시나리오 D 오답+힌트만**: `correct=0, hintsUsed=3`
   - reasonTags ⊇ ['hint_dependent']
   - prereq_deficit는 부여 X (M1.4에서 BN 통과 후에만)
5. **DB 검증**: 위 4 시나리오 후 `user_item_history.result_history`가 4 entry, `pattern_state.attempt_count`가 합 4
6. **트랜잭션 안전성**: 인위적 오류 주입 시 user_item_history와 pattern_state 둘 다 롤백
7. **API 응답 시간**: P95 < 400ms (LLM 호출 X 상태에서)

## 주의 사항

- 다중 Pattern 매핑 시 Item 1개당 N개 pattern_state row 갱신 발생. 트랜잭션 + `ON CONFLICT (user_id, pattern_id) DO UPDATE` 패턴 강제
- selfConfidence 슬라이더 입력은 M1.3에서 들어옴. M1.2 테스트에선 mock으로 'sure'/'mid'/'unsure' 직접 보냄
- AI 비동기 큐는 stub (큐에 enqueue까지만). M1.5에서 워커 합류

---

# M1.3 — 풀이 화면 객관식 + 자신감 슬라이더 (2주)

## Goals

- `app/v2/solve/[itemId]/page.tsx`를 production-ready로 만든다
- 풀이 → 객관식 5지선다 선택 → 타이머 자동 기록 → 자신감 슬라이더 → "제출" → ResultPanel
- 제출 시 `POST /api/attempts` 실호출 (M1.2 머지 후), 응답 그대로 ResultPanel에 반영
- 5칩은 자리만 깔아 두고 클릭 시 placeholder modal (실제 호출은 M1.5)
- 결과 화면에서 "다음 문제" 또는 "코치 열기" 두 액션
- 모바일/데스크탑 둘 다 작동 (반응형 — 풀이 영역과 액션 패널)

## 파일 경로

신규:
- `app/v2/solve/[itemId]/page.tsx` — Server Component, item 데이터 prefetch
- `app/v2/solve/[itemId]/SolveClient.tsx` — 클라 상태 (선택 답·타이머·자신감)
- `app/v2/solve/_components/ItemBody.tsx` — 문제 본문 + 보기 5개 (LaTeX 렌더는 KaTeX 또는 react-katex)
- `app/v2/solve/_components/ConfidenceSlider.tsx` — 3단계 슬라이더 (sure/mid/unsure)
- `app/v2/solve/_components/HintButton.tsx` — 힌트 카운터 (M1.5에서 코치 패널 트리거로 발전)
- `app/v2/solve/_components/ChipBar.tsx` — 5칩 정적 카피 (B-4) + 클릭 placeholder
- `app/v2/solve/_components/Timer.tsx` — `setInterval` + cleanup, mode='practice'에선 표시만
- `app/v2/solve/_components/ResultPanel.tsx` — 정답/헷갈림/오답 3분기 시각 (deck slide 10 기준)
- `lib/clients/api.ts` — `submitAttempt(payload)` fetch wrapper
- `app/v2/_components/store/solve-store.ts` — Zustand: `selectedAnswer`, `hintsUsed`, `aiQuestions`, `selfConfidence`, `startedAt`
- `tests/e2e/solve-practice.spec.ts` — Playwright 시나리오 1개

수정:
- `app/v2/solve/page.tsx` (기존) — index에서 itemId 라우팅으로 redirect
- `app/v2/layout.tsx` — KaTeX CSS import (전역 1회)

## API 엔드포인트

- `POST /api/attempts` (M1.2 결과 사용)
- `GET /api/graph/unit/[unitKey]` — 컨텍스트 fetch가 필요할 수 있으나 M1.3에선 itemId 단일. unitKey는 M1.4부터.
- `GET /api/items/[id]` (신규 추가) — item 단건 조회. `lib/api/schemas/items.ts` zod. response: `{ item: GraphNode }` (03-api-contracts §7 GraphNode 타입 재사용)

## DB 스키마 변경

없음.

## 컴포넌트 spec

### `<SolveClient>` (props)

```typescript
type SolveClientProps = {
  item: GraphNode  // type='item'
  unitKey: string  // 'math2-calc' 등 (M1.4 그래프 컨텍스트용. M1.3엔 표시만)
}
```

핵심 동작:
- 마운트 시 `solveStore.startedAt = Date.now()`
- 5지선다 클릭 → `selectedAnswer` 갱신
- 자신감 슬라이더 변경 → `selfConfidence` 갱신 (default 'mid')
- 힌트 버튼 → `hintsUsed += 1` + Toast "힌트는 코치 패널에서 (M1.5)"
- 5칩 클릭 → placeholder modal "곧 추가됩니다"
- 제출 → `submitAttempt({ itemId, selectedAnswer, timeMs, hintsUsed, aiQuestions: 0, selfConfidence, mode: 'practice' })`
- 응답 받으면 `<ResultPanel>` 마운트 (overlay)
- `nextAction.type === 'next_item'` 이면 "다음 문제" CTA 활성

### `<ConfidenceSlider>`

```typescript
type Props = {
  value: 'sure' | 'mid' | 'unsure'
  onChange: (v: SelfConfidence) => void
}
```

- 3개 라디오 또는 슬라이더(track 3 stop). 라벨: "확실해요 / 모르겠어요 / 자신없음"
- 키보드 접근: 좌우 화살표
- B-5 lock — UI에서 숫자 노출 X (내부적으로 score 계산만)

### `<ChipBar>`

```typescript
type ChipKey = 'hint' | 'definition' | 'wrong_reason' | 'unfold' | 'variant'
type Props = {
  onChipClick: (key: ChipKey) => void  // M1.3엔 placeholder
}
```

정적 카피 (B-4 lock):
- hint → "첫 한 줄 힌트"
- definition → "이 용어 정의"
- wrong_reason → "오답 풀이 근거"
- unfold → "한 단계 더 펼치기"
- variant → "같은 유형 다른 문제"

### `<ResultPanel>`

```typescript
type Props = {
  result: AttemptResult              // 03 §2 응답 attemptResult
  masteryUpdate: MasteryUpdate[]
  onNextAction: (action: NextAction) => void
}
```

deck slide 10 시각 톤 (3분기):
- correct → 초록 emerald + "다음 문제" CTA
- unsure → 주황 accent + "약점 후보로 저장됨" 라벨 + "다음 문제" CTA
- wrong → 적색 + reasonTags 칩 표시 + "리캡 보기" CTA (M1.4부터 활성)

내부 분류 enum 노출 금지 (feedback 메모리 — `concept_lack` 같은 raw key 노출 X). reasonTags는 한국어 라벨로 매핑:

```typescript
// app/v2/solve/_components/reason-tag-labels.ts
export const REASON_TAG_LABEL: Record<ReasonTag, string> = {
  time_overrun: '시간 초과',
  hint_dependent: '힌트 의존',
  prereq_deficit: '이전 학년 결손 의심',
  concept_lack: '현재 개념 부족',
  pattern_misrecognition: '유형 인식 실패',
  approach_error: '접근 방향 오류',
  calculation_error: '계산 실수',
  condition_misread: '조건 해석 오류',
  graph_misread: '그래프 해석 오류',
  logic_leap: '논리 비약',
}
```

## 알고리즘 의존

- 클라엔 알고리즘 호출 없음. 모두 서버 `/api/attempts` 위임.

## LLM 프롬프트 의존

- 없음 (5칩 클릭은 placeholder).

## 의존 마일스톤

- M1.1 (item 노드 + display_layer)
- M1.2 (`/api/attempts` 응답 그대로 받기)

## 작업량 추정

- 라우팅 + Server Component + item fetch: 1 인일
- ItemBody (KaTeX 렌더 포함): 1.5 인일
- ConfidenceSlider + Timer + ChipBar: 1 인일
- ResultPanel (3분기 시각 + reasonTag 라벨): 1.5 인일
- Zustand store + `submitAttempt` 클라: 1 인일
- 반응형 + 키보드 접근: 1 인일
- E2E 시나리오: 1 인일
- 디자인 finetune (deck slide 10 톤 매칭): 1 인일

**합계: 9 인일 (2주, 1인)**

## Acceptance criteria

1. `/v2/solve/[seed_item_id]` 접속 → 문제 본문 + 5지선다 + 자신감 슬라이더 + 5칩 + 제출 버튼 모두 표시
2. 보기 클릭 → 시각적 selected 표시 (라디오 또는 카드 강조)
3. 슬라이더 default 'mid', 키보드 좌우 작동
4. 힌트 버튼 클릭 시 hintsUsed 카운터 증가 (제출 payload에 반영)
5. 제출 → 1초 이내 ResultPanel 표시 (네트워크 정상 시)
6. 정답 + 자신감 'sure' → 초록 ResultPanel + "다음 문제" CTA
7. 정답 + 자신감 'unsure' → 주황 ResultPanel + "약점 후보 저장됨" 표시
8. 오답 → 적색 ResultPanel + reasonTags 한국어 라벨로 표시 (raw enum 노출 X)
9. ResultPanel "다음 문제" 클릭 → 같은 unit의 next item으로 이동 (M1.4 추천 결과 사용 전엔 단순 next-by-id)
10. Playwright E2E 패스: 풀이 → 제출 → 결과 → 다음 문제

## 주의 사항

- 5지선다 itemChoices가 비어 있으면 폴백: "주관식" 텍스트 input. M1.3엔 객관식만 데모.
- mode는 항상 'practice'로 hard-code (A-3). 셀렉터 노출 X.
- aiQuestions는 항상 0으로 보냄. M1.5에서 코치 호출 시 카운트.

---

# M1.4 — DAG 역추적 + 단일 리캡카드 (2주)

## Goals

- 오답 또는 헷갈림 시 자동 진단 → 결손 후보 1개 도출 → LLM이 리캡카드 1장 생성 → 카드 표시 → 확인 퀴즈 통과 → 원래 문제 재도전
- deck slide 9의 4단계 사이클이 실제로 작동
- "단일 리캡카드"만 (시퀀스 카드 ≤ 3은 Q2). MAX_RECAP_CARDS = 1 in Q1.
- 재도전 결과는 attempt 메타에 `recap_followup`로 저장 (Q2 BN 효과 측정의 데이터 기반)

## 파일 경로

신규:
- `lib/recap/diagnose.ts` — 04-algorithms §3.1 Q1 단순화 진단
- `lib/recap/build-card.ts` — 04-algorithms §5 + 05-llm-prompts §3 LLM 호출
- `lib/recap/fallback.ts` — 05-llm-prompts §3 fallback 카드
- `lib/recap/types.ts` — `RecapCard` 타입 (04-algorithms §5.2 그대로)
- `app/api/recap/diagnose/route.ts` — 03-api-contracts §4 핸들러
- `app/api/recap/build-card/route.ts` — 03-api-contracts §4
- `app/api/recap/quiz/submit/route.ts` — 03-api-contracts §4
- `lib/api/schemas/recap.ts` — zod
- `app/v2/_components/RecapCard.tsx` (B-6 명명 lock — Card 단수, "리캡카드")
- `app/v2/_components/RecapOverlay.tsx` — 기존 파일 있음, redesign (deck slide 9 디자인 일치)
- `app/v2/_components/RecapQuizInput.tsx` — 단답/OX 입력
- `lib/clients/claude.ts` — Anthropic SDK wrapper (token_usage 자동 기록 + prompt cache)
- `lib/clients/openai.ts` — OpenAI wrapper (M1.5에서 임베딩용은 Q3+, M1.4엔 stub)
- `tests/unit/recap/diagnose.test.ts`
- `tests/e2e/recap-flow.spec.ts`

수정:
- `app/v2/solve/[itemId]/SolveClient.tsx` — ResultPanel "리캡 보기" CTA 활성, RecapOverlay 마운트
- `app/api/attempts/route.ts` — M1.2 stub `diagnosis` 자리에 `diagnoseQ1()` 호출 + `nextAction` 결정 (mode='practice' + recapNeeded → `{type:'recap', payload:{candidates}}`)
- `lib/grading/index.ts` — processAttempt 시그니처에 diagnosis 추가
- `lib/db/schema.ts` — 변경 없음 (recap 자체는 별도 테이블 X. 카드는 stateless, recap 효과는 attempt meta로)

## API 엔드포인트

- `POST /api/recap/diagnose` (03 §4) — 본 마일스톤 신규
- `POST /api/recap/build-card` (03 §4) — 본 마일스톤 신규
- `POST /api/recap/quiz/submit` (03 §4) — 본 마일스톤 신규
- `POST /api/attempts` — diagnosis·nextAction 채움

흐름:
1. 클라가 `POST /api/attempts` → 응답에 `diagnosis.recapNeeded=true, candidates=[{patternId, deficitProb}]`
2. 클라가 `POST /api/recap/build-card` (patternId, currentItemId) → `card`
3. 클라가 카드 표시. 사용자가 확인퀴즈 답 입력
4. `POST /api/recap/quiz/submit` → `correct: true` 시 클라가 SolveClient에 `RETURN_TO_RETRY` (mode='retry'로 같은 itemId 재진입)

## DB 스키마 변경

없음. attempt meta에 `recap_followup` 추가는 application-level (`user_item_history.result_history[].signals.meta` 안에 stuff).

## 컴포넌트 spec

### `<RecapOverlay>` (재설계)

```typescript
type Props = {
  open: boolean
  card: RecapCard | null
  loading: boolean
  onQuizSubmit: (answer: string) => Promise<{ correct: boolean; hint?: string }>
  onPass: () => void          // 통과 → SolveClient가 RETURN_TO_RETRY로 진입
  onSkip: () => void           // 카드 무시하고 다음 문제 (퀘스트 ROI 비교용)
  onClose: () => void
}
```

deck slide 9 디자인 그대로:
- 학년 뱃지 + Pattern 이름 + 소요시간 (1~3분)
- "왜 필요한가" 1줄 (whyNeeded)
- "3줄 핵심" (coreBullets, KaTeX 렌더)
- "확인 퀴즈" — 학생 입력
- "원래 문제로 돌아가기" CTA (퀴즈 정답 후 활성)
- 스킵 링크 작게 ("이번엔 건너뛰기")

### `<RecapCard>`

순수 view 컴포넌트. RecapOverlay 안에 wrap. props: `card: RecapCard`.

### `<RecapQuizInput>`

```typescript
type Props = {
  question: string
  hint?: string  // 1차 오답 시 노출
  onSubmit: (answer: string) => void
}
```

- 단답 input + "확인" 버튼
- 오답 시 hint 표시 + 1회 재시도. 2회 오답 시 "정답 보기" + onPass 그대로 진행

## 알고리즘 의존

- 04-algorithms §3.1 (`diagnoseQ1`) — 그대로
- 04-algorithms §5 (`buildRecapCard`) — 그대로
- 04-algorithms §5.4 검증 + fallback
- 04-algorithms §3.4 임계값: TAU_RECAP=0.6, MAX_RECAP_CARDS=1 (Q1 override)

## LLM 프롬프트 의존

- 05-llm-prompts §3 (리캡카드 빌드) — 그대로
- 모델: `claude-opus-4-7`
- system prompt에 cache_control ephemeral 적용
- 출력은 `emit_recap_card` tool_use 강제. 검증 실패 시 1회 재시도 + fallback (05 §3 fallbackCard)

## 의존 마일스톤

- M1.1 (pattern_state·prereq edge 데이터)
- M1.2 (attempt에서 reasonTags + 매핑 Pattern theta 들어옴)
- M1.3 (ResultPanel "리캡 보기" CTA + RecapOverlay 마운트 자리)

## 작업량 추정

- diagnoseQ1 + 단위 테스트: 1 인일
- buildRecapCard + LLM 호출 + 검증·재시도: 2 인일
- claude.ts wrapper + token_usage 기록: 1 인일
- /api/recap/* 3개 엔드포인트: 1.5 인일
- RecapOverlay·RecapCard·RecapQuizInput UI (deck slide 9 디자인 매칭): 2 인일
- SolveClient 통합 + RETURN_TO_RETRY 플로우: 1 인일
- attempt 메타에 recap_followup 저장: 0.5 인일
- E2E 시나리오 (오답 → 카드 → 퀴즈 → 재도전 → 정답): 1 인일

**합계: 10 인일 (2주, 1인)**

## Acceptance criteria

1. **시나리오 D1 (deck slide 9)**: seed 문제 = "곡선 밖 접선" + 사용자가 "이차방정식 판별식" Pattern theta < 0.4 상태
   - 풀이 오답 제출 → diagnose 결과 `candidates=[{patternId: 판별식, deficitProb >= 0.6}]`
   - RecapOverlay 자동 표시
   - 카드 내용: 학년='중3', 이름~='이차방정식의 판별식', 3줄 bullets
   - 확인퀴즈 정답 입력 → "원래 문제로 돌아가기" 활성
   - 클릭 → SolveClient가 같은 itemId 재진입 (storedRetryItemId 사용)
   - 재도전 정답 → ResultPanel + 다음 문제 CTA
2. **fallback**: LLM이 schema 위반 응답 2회 → fallback 카드 표시 (signature 그대로 bullet화)
3. **퀴즈 오답**: 1차 오답 시 hint 표시. 2차 오답 시 "정답 보기" + 통과 처리
4. **스킵**: "이번엔 건너뛰기" 클릭 → recap 무시, 다음 문제로 (attempt meta에 `recap_skipped: true`)
5. **재도전 식별**: 재도전 결과 attempt에 `meta.source = 'recap_retry', meta.recapPatternIds = [...]` 저장
6. **token 절약**: prompt cache hit ratio ≥ 50% (5분 TTL 내 동일 prereq Pattern 재호출 시)
7. **에러 handling**: LLM 5xx 또는 timeout → fallback 카드 자동 노출 (사용자에 에러 X)
8. **performance**: 카드 첫 렌더 ≤ 2.5s (LLM 호출 포함)

## 주의 사항

- Q1 단일 카드 제약 — `MAX_RECAP_CARDS = 1`. 다중 후보 중 deficitProb 최대 1개만. 시퀀스 + scheduledRecap[] 큐는 Q2(M2.3+)
- `diagnoseQ1` cold-start: 사용자 attempt < 5 시 candidates=[] → recapNeeded=false (실제 운영에선 가장 큰 함정. seed 데이터로 충분 attempt 미리 주입)
- prereq_deficit_log 테이블은 Q2(M2.3)부터. M1.4엔 attempt meta로만
- recap을 무한 루프 차단: 같은 itemId 재도전 → 또 오답 → 또 recap이 발동하지 않도록 attempt meta `recap_followup` 체크 후 두 번째 recap은 스킵하고 ResultPanel만 표시

---

# M1.5 — AI 코치 + 5칩 + 그래프 컨텍스트 (2주)

## Goals

- `app/v2/solve/[itemId]` 우측 패널에 AI 코치 사이드 패널 등장
- 5칩 클릭 → SSE 스트리밍 응답 + 토큰 단위 점진 렌더
- LLM이 `insert_recap_card` 도구 호출 시 인서트 카드 표시
- LLM이 `highlight_graph_nodes` 도구 호출 시 그래프 노드 강조 (그래프 패널은 M1.6에서, M1.5엔 nodeIds 수신만 store에 저장)
- AI 호출은 `ai_coach_calls`에 row 기록 + `check_ai_quota` 사전 검증
- M1.2에서 enqueue된 비동기 reasonTag 분류 워커 합류

## 파일 경로

신규:
- `lib/ai-coach/build-context.ts` — 05-llm-prompts §1 context block 빌더
- `lib/ai-coach/quota.ts` — `assertQuota(userId)` 호출 (실패 시 throw QuotaError)
- `lib/ai-coach/system-prompt.ts` — 05 §1 system prompt 상수
- `lib/ai-coach/tools.ts` — 05 §1 tool 정의 3개
- `lib/ai-coach/stream.ts` — SSE 변환 (delta → token, tool_use → card/highlight 이벤트)
- `app/api/ai-coach/chat/route.ts` — 03-api-contracts §3 SSE
- `app/api/ai-coach/suggest/route.ts` — Q1엔 정적 lock 카피만 응답 (실 LLM 호출 X, M2+)
- `lib/api/schemas/ai-coach.ts` — zod
- `app/v2/solve/_components/CoachPanel.tsx` — 사이드 패널 (열기/닫기, 메시지 list, 5칩, free input)
- `app/v2/solve/_components/CoachMessage.tsx` — assistant 메시지 (streaming 효과)
- `app/v2/solve/_components/CoachInsertedCard.tsx` — `insert_recap_card` 결과 인라인 카드
- `app/v2/_components/store/coach-store.ts` — Zustand: 메시지·streaming 상태·highlight nodeIds
- `lib/queue/classify-worker.ts` — M1.2 stub 큐 → 실제 워커 (Haiku 호출 + reasonTags merge)
- `tests/unit/ai-coach/build-context.test.ts`
- `tests/e2e/coach-flow.spec.ts`

수정:
- `app/v2/solve/[itemId]/SolveClient.tsx` — CoachPanel 마운트, ChipBar onChipClick 실연결, hintsUsed/aiQuestions 카운트
- `app/api/attempts/route.ts` — 큐에 enqueue 후 워커가 비동기로 reasonTags merge

## API 엔드포인트

- `POST /api/ai-coach/chat` (03 §3) — SSE
- `POST /api/ai-coach/suggest` (03 §3) — Q1엔 정적 응답 (chips 5개 lock 카피)

precondition: `assertQuota(userId)` 통과 필수. 실패 시 `429 QUOTA_EXCEEDED` + 메시지 (Free 5회 평생 / Pro 일 30회 / Pro+ 무제한 — C-9). Q1엔 모든 사용자 free tier(아직 결제 미연결) → 5회 평생 캡 실작동.

## DB 스키마 변경

없음 (M1.1에서 ai_coach_calls 이미 lay-down).

## 컴포넌트 spec

### `<CoachPanel>` (props)

```typescript
type Props = {
  itemId: string
  open: boolean
  onClose: () => void
  onAiQuestion: () => void  // SolveClient의 aiQuestions 카운트 +1
}
```

핵심 동작:
- 마운트 시 `/api/ai-coach/suggest` 호출 → 5칩 표시 (Q1엔 정적이지만 API 형태는 동일)
- 칩 클릭 → 메시지 list에 user 메시지 push + `/api/ai-coach/chat` SSE 호출 + chipKey 동봉
- SSE delta → 마지막 assistant 메시지 텍스트 누적
- SSE event=card → `<CoachInsertedCard>` push (RecapCard 인라인 — M1.4 RecapCard 재사용)
- SSE event=highlight → coach-store.highlightNodeIds 업데이트
- free input → 동일 endpoint, chipKey=undefined
- quota 초과 응답 → 패널에 "이번 달 코치 사용량 다 썼어요. Pro 업그레이드 시 일 30회" 카피

### `<CoachMessage>`

```typescript
type Props = {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  insertedCards?: RecapCard[]
}
```

- streaming=true 시 마지막 글자 뒤 깜빡이는 cursor
- KaTeX 렌더 (LaTeX inline + display 둘 다)

### `<ChipBar>` 업데이트 (M1.3 → M1.5)

`onChipClick`이 placeholder가 아닌 실제 CoachPanel.open(chipKey) 트리거

## 알고리즘 의존

- 04-algorithms §1.5 비동기 reasonTag merge 워커 — Haiku 호출 후 user_item_history.result_history[-1].reasonTags에 merge

## LLM 프롬프트 의존

- 05-llm-prompts §1 (AI 코치 chat) — 그대로
- 05 §5 (8가지 오답 원인 분류) — 워커가 사용
- 5칩별 system prompt tweak (05 §1 표) — chipKey에 따라 system prompt 끝에 추가 lines append
- 모델: chat은 `claude-opus-4-7`, 분류 워커는 `claude-haiku-4-5-20251001`
- prompt cache: chat system prompt 블록만 ephemeral. context block (`<problem>...`)은 itemId마다 다르므로 캐시 비활성

## 의존 마일스톤

- M1.1 (ai_coach_calls + check_ai_quota)
- M1.4 (RecapCard 컴포넌트 재사용 + insert_recap_card 도구가 buildRecapCard 호출)

## 작업량 추정

- build-context.ts (5 attempt 이력·prereq chain·item 컨텍스트): 1.5 인일
- claude.ts wrapper streaming 지원 (M1.4 wrapper 확장): 1 인일
- /api/ai-coach/chat SSE 핸들러 + tool_use 분기: 2 인일
- /api/ai-coach/suggest 정적 응답: 0.5 인일
- CoachPanel + CoachMessage + CoachInsertedCard UI: 2.5 인일
- coach-store + ChipBar 실연결: 0.5 인일
- 비동기 분류 워커 + reasonTags merge: 1.5 인일
- quota 검증 + 429 UI: 0.5 인일
- E2E (5칩 클릭 → 스트리밍 → 카드 인서트): 1 인일

**합계: 11 인일 (2주, 1.1인 = 1인 풀타임 + 10% 디자인 review)**

## Acceptance criteria

1. **5칩 클릭 → 스트리밍**: hint 칩 클릭 → 1.5초 이내 첫 토큰 도착, 단계별 텍스트 누적
2. **Coach 컨텍스트**: 시스템 프롬프트에 현재 itemId, Pattern, 직접 prereq, 최근 5 attempt 모두 포함
3. **insert_recap_card 도구**: 사용자가 "이거 prereq 부족한 거 아니에요?" 같은 free input 시 LLM이 도구 호출 → CoachInsertedCard로 카드 표시
4. **highlight_graph_nodes 도구**: 응답에 Pattern 언급 시 nodeIds 수신, coach-store에 저장 (M1.6 그래프 패널이 사용)
5. **find_similar_items 도구**: variant 칩 클릭 시 LLM이 도구 호출 → 응답에 itemIds 표시 (실제 fetch는 M1.6 추천 엔진)
6. **quota**: free 사용자가 5회 호출 후 6번째 시 429. 클라가 "Pro 업그레이드" 카피 노출
7. **ai_coach_calls 기록**: 매 호출마다 row insert (callType='chat' or 'suggest_chip', tokens, cost)
8. **aiQuestions 카운트**: 코치 호출마다 SolveClient의 aiQuestions += 1. 제출 시 attempt에 반영
9. **비동기 분류 워커**: 오답 attempt 1건 → 워커가 5초 이내 user_item_history.result_history[-1].reasonTags에 AI tags merge
10. **streaming 끊김 복구**: 네트워크 끊김 시 클라가 "다시 불러오기" 버튼 노출, 같은 메시지 retry

## 주의 사항

- ai_coach_calls insert는 SSE done 이벤트 시점 (성공한 호출만). 실패 호출은 별도 errors 테이블 X — Sentry로만 추적
- check_ai_quota는 호출 직전 1회. 동시 요청 race condition은 Q1엔 무시 (Free 5회는 hard cap 아님 — best effort)
- 5칩 카피는 정적 lock (B-4). API는 형식 맞추기용. 동적 카피는 M2+
- 비동기 분류 워커가 중복 호출되지 않도록 큐 row에 `dedupKey = attemptId`
- streaming SSE 응답 timeout 60초. 그 이상이면 abort + 클라에 message_too_long 이벤트

---

# M1.6 — 동적 학습 지도 + 연습 모드 상태 머신 + 통합 (2주)

## Goals

- 그래프 패널에 visual encoding 적용 (04-algorithms §8) — 색·점선·뱃지가 mastery 상태 반영
- AI 코치 highlight_graph_nodes 도구의 nodeIds가 그래프에서 실제 강조됨 (펄스 애니메이션)
- `practice-machine.ts`로 SolveClient 상태 일원화 (수동 분기 제거)
- D1 (deck slide 9 사이클) 인수 시나리오 E2E 패스
- 마지막 1주는 통합·디자인 polish·데모 리허설

## 파일 경로

신규:
- `lib/graph/encode-visual.ts` — 04-algorithms §8 그대로
- `lib/graph/build-user-state.ts` — pattern_state + recent attempts → UserState 빌드
- `app/api/graph/unit/[unitKey]/route.ts` — 03-api-contracts §7 핸들러 (visualAttrs 서버 인코딩)
- `lib/api/schemas/graph.ts` — zod
- `lib/session/practice-machine.ts` — 06-state-machines §1 XState v5 머신
- `lib/session/types.ts` — SessionContext, SessionEvent
- `app/v2/solve/_components/GraphPanel.tsx` — 그래프 mini-view (현재 itemId 주변 prereq + same-pattern items)
- `app/v2/_components/store/session-store.ts` — XState actor 래핑 + Zustand mirror
- `lib/telemetry/session.ts` — 06 §8 transition 텔레메트리
- `tests/unit/session/practice-machine.test.ts` — 06 §9 시나리오 4종
- `tests/e2e/d1-acceptance.spec.ts` — D1 통합 E2E

수정:
- `app/v2/solve/[itemId]/SolveClient.tsx` — practiceMachine actor로 상태 일원화. `useActor` hook 도입
- `app/v2/solve/[itemId]/page.tsx` — Server Component에서 `/api/graph/unit/[unitKey]` 동시 fetch (parallel)
- `app/v2/solve/_components/CoachPanel.tsx` — `highlightNodeIds`를 GraphPanel에 props 전달
- `app/v2/graph/page.tsx` — visual encoding 동일하게 적용

## API 엔드포인트

- `GET /api/graph/unit/[unitKey]` — 03 §7. 본 마일스톤 신규
- (기존) `POST /api/attempts`, `/api/recap/*`, `/api/ai-coach/*` 변경 없음

응답 차이: GraphNode.visualAttrs는 서버에서 encodeVisual 호출 후 채움. 클라는 그대로 `<svg>` props로 사용.

## DB 스키마 변경

없음.

## 컴포넌트 spec

### `<GraphPanel>` (props)

```typescript
type Props = {
  unitKey: string
  centerNodeId: string  // 현재 itemId 또는 그것이 매핑된 Pattern
  highlightNodeIds: string[]  // coach-store에서 흘러옴
  onNodeClick?: (nodeId: string) => void  // 선택 (현재 패턴 컨텍스트 전환)
}
```

- @xyflow/react 12.x 사용
- 노드 30~50개 표시 한도 (현재 + prereq 깊이 2까지 + 같은 Pattern items)
- visualAttrs 그대로 fillColor·strokeColor·strokeStyle 적용
- highlightNodeIds 안의 노드는 펄스 애니메이션 (framer-motion)
- 미니 뷰 (250px × 250px) — 풀이 화면 우상단 또는 코치 패널 위쪽 토글

### `practiceMachine` (XState)

06-state-machines §1 그대로. 단 Q1 simplification:
- `mode` 항상 'practice' (다른 모드 핸들링 X — 06 §2~5는 Q2+)
- `MAX_RECAP_CARDS = 1` 강제
- `scheduledRecap` 길이는 항상 ≤ 1

context, event, action, guard, state는 06 §1 표 그대로 lock.

### `<SolveClient>` 재구조

```typescript
function SolveClient({ item, unitKey, initialGraph, userState }: Props) {
  const [actor, send] = useActor(practiceMachine, { input: { userId, mode: 'practice', unitId: unitKey } })
  // actor.snapshot.value === 'IDLE' | 'SOLVING' | 'GRADING' | 'GRADED' | 'FOLLOWUP_RECAP' | 'RECAP_CARD' | 'RETRY_PROMPT' | 'NEXT_PROMPT' | 'DONE'

  return (
    <>
      <ItemBody />
      <ConfidenceSlider />
      <ChipBar onChipClick={chipKey => send({ type: 'OPEN_AI_COACH', chipKey })} />
      <SubmitButton onClick={() => send({ type: 'SUBMIT_ATTEMPT', payload })} />
      <CoachPanel open={actor.snapshot.context.coachOpen} ... />
      <RecapOverlay open={actor.snapshot.value === 'RECAP_CARD'} ... />
      <ResultPanel show={actor.snapshot.value === 'GRADED'} ... />
      <GraphPanel highlightNodeIds={coachStore.highlightNodeIds} ... />
    </>
  )
}
```

## 알고리즘 의존

- 04-algorithms §8 (`encodeVisual`) — 그대로
- 04-algorithms §3.1 (`diagnoseQ1`) — 06 머신의 `fetchRecap` action에서 호출
- 04-algorithms §5 (`buildRecapCard`) — 같음

## LLM 프롬프트 의존

- 신규 없음 (M1.4·M1.5에서 모두 lay-down).
- 단 M1.5 highlight_graph_nodes 도구 응답이 GraphPanel에서 실제 의미 있게 동작해야 함 (M1.5엔 store에 저장만, M1.6에서 펄스).

## 의존 마일스톤

- M1.1 ~ M1.5 모두

## 작업량 추정

- encode-visual.ts + 단위 테스트: 1 인일
- build-user-state.ts (pattern_state · attempts → UserState): 1 인일
- /api/graph/unit/[unitKey] 핸들러: 1 인일
- GraphPanel UI + xyflow 통합 + 펄스: 2 인일
- practice-machine.ts XState v5 + 단위 테스트 4종: 2 인일
- SolveClient 재구조 (useActor 통합, 수동 분기 제거): 2 인일
- D1 E2E 작성 + 디버그: 1.5 인일
- 디자인 polish (deck v2 톤 일치): 1 인일
- 데모 리허설 + 시드 데이터 정제: 1 인일

**합계: 12.5 인일 → 2주 빡빡. M1.5 잔여 작업과 겹치면 1주 슬립 가능.** 그래서 분기 일정 12주 중 마지막 2주를 M1.6 통합으로 잡았다.

## Acceptance criteria

1. **D1 인수 시나리오 통과** (12-acceptance.md D1 정의 그대로):
   - 신규 사용자 가입 + seed 데이터 (math2-calc unit, "이차방정식 판별식" theta=0.3 상태)
   - `/v2/solve/<곡선 밖 접선 itemId>` 진입
   - 객관식 오답 + 자신감 'unsure' 제출
   - ResultPanel 적색 + reasonTags 표시
   - 자동 RecapOverlay (판별식 카드)
   - 확인퀴즈 정답
   - "원래 문제로 돌아가기" → 재진입 → 정답
   - ResultPanel 초록 + "다음 문제" CTA
   - GraphPanel에서 판별식 노드 색이 회색 점선 → 일반 색으로 변화
   - 모든 단계 60초 이내 (LLM 포함)
2. **visual encoding 시각 검증**: pattern_state.theta 0.7+ 노드는 초록, 미학습은 회색 점선, 누적 결손 의심은 주황 점선 (수동 검증)
3. **highlight 펄스**: 코치가 "판별식 노드 봐주세요" 응답 → highlight_graph_nodes 호출 → GraphPanel에서 해당 노드 1.5초 펄스
4. **practice-machine 단위 테스트**: 06 §9 4 시나리오 모두 패스 (정답→next, 오답+recap, recap 통과→재도전, 일반 next)
5. **수동 분기 0**: SolveClient 안에 `if (result === 'wrong')` 류 직접 분기 없음. 모든 상태 전이는 send 이벤트
6. **Lighthouse**: solve 페이지 Performance ≥ 80, A11y ≥ 95
7. **Sentry**: 데모 리허설 1주일 동안 unhandled exception 0
8. **데모 deck**: 영상 1분 시연본 (GitHub Releases 또는 Notion에 업로드, deck v2 slide 9 톤과 일치)

## 주의 사항

- xyflow는 SSR과 안 맞음 — `<GraphPanel>`은 `'use client'` + dynamic import (`{ ssr: false }`) 적용
- visualAttrs 서버 인코딩은 캐시 안 함 (사용자 상태 자주 바뀜). 클라 재계산도 안전 (같은 함수)
- highlightNodeIds 펄스 1.5초 후 자동 fade. coach-store에서 `setTimeout`으로 클리어
- D1 시연용 seed 데이터는 별도 PR (`scripts/seed-d1-demo.ts`)에서 lay-down. 운영 DB와 분리

---

# 분기 통합 + 데모 (M1.6 마지막 1주)

## 통합 점검

- D1 시나리오 외에 다음 부정 케이스도 검증:
  - LLM timeout → fallback 카드 → 시연 끊기지 않음
  - quota 초과 → 코치 비활성 + 메시지 정상
  - 같은 문제 두 번째 attempt → recap 무한 루프 X
  - 모바일 (390px 폭) 풀이 화면 작동
  - 키보드 only (탭+엔터)로 전체 플로우 가능

## 데모 시나리오 lock

D1 시연 스크립트:
1. (15s) "지금 학생이 곡선 밖 접선 문제를 풀려고 합니다" — `/v2/solve/<id>` 진입
2. (10s) 객관식 오답 + 자신감 'unsure' 제출
3. (15s) 결과 풀스크린 — 8가지 원인 중 'prereq_deficit' 강조
4. (15s) 자동 리캡카드 — "실은 막힌 곳은 중3 판별식이었습니다"
5. (10s) 확인퀴즈 정답 → 원래 문제 재도전
6. (5s) 정답 → 그래프 노드 색 변화 (회색 점선 → 일반)

총 70초. 데모 영상 90초 이내 lock.

## 분기 산출물 lock

- 빌드: `pnpm build` 0 에러
- 테스트: `pnpm test` 0 실패, `pnpm test:e2e` D1 + 4 단위 시나리오 패스
- 마이그레이션: 0001~0005 production-applied
- LLM 프롬프트 v1: chat·recap·classify 3종 production
- 데모 영상: 90초
- Q1 retro 회고 문서: `docs/retro-q1.md` (M1.6 마지막 날)

## Q2로의 인수인계

다음 Q2 입구 (M2.1)에서 다룰 것:
- BN 본격 도입 (04-algorithms §3.2) → 누적 결손 + prereq_deficit_log
- tldraw 펜슬 풀이 (06 §1 OPEN_PENCIL state 추가)
- 시퀀스 리캡카드 (≤ 3) — practice-machine.scheduledRecap 큐 활성
- 모드 셀렉터 노출 + exam·recovery·challenge 머신

본 Q1 산출물은 모두 lock. Q2가 추가는 하되 변경은 PR 절차.

---

# 부록 A — Q1 시드 데이터 lock

D1 시연이 매번 작동하려면 seed 데이터가 production·dev 모두 일치해야 함. `scripts/seed-d1-demo.ts`:

| 항목 | 값 |
|---|---|
| seed_unit_key | `math2-calc` |
| pattern A | "이차방정식의 판별식" (grade='중3', signature=['D=b²-4ac', 'D=0 중근', '접선 조건']) |
| pattern B | "접선의 기하학적 의미" (grade='수Ⅱ') |
| pattern C | "곡선 밖 접선" (grade='수Ⅱ') |
| edge | A → B (prerequisite), B → C (prerequisite) |
| seed item | "곡선 y=x² 밖의 점 (0,-1)에서 접선의 방정식은?" (5지선다, patternIds=[C]) |
| seed user 상태 | pattern A theta=0.30, pattern B theta=0.55, pattern C theta=0.50 |
| 사전 attempts | 5건 (Pattern A에 오답 3건 + Pattern B에 정답 2건) |

이 데이터로 D1 시나리오의 diagnoseQ1이 항상 patternA를 후보로 도출.

# 부록 B — Q1에서 의도적으로 미구현 항목

다음은 Q1에 만들지 않는다 (Q2+ 분기 빌드 문서 참조):
- exam·recovery·challenge·retry 모드 (M1.6엔 practice만)
- 시퀀스 리캡카드 (≤ 3)
- BN 본격 추론 + prereq_deficit_log
- 펜슬 풀이 + OCR + LCS 정렬
- 임베딩 기반 similar items
- 결제 + Toss 연결
- 어드민 검수 화면
- 학원 SaaS / 교사 대시보드
- 보호자 리포트
- 매일 약점 챌린지 cron

이 중 어떤 것도 Q1 데모에 포함되지 않는다. 데모 외 코드는 dead code 금지 (Q2 분기 시작 시 구현).

# 부록 C — 비동기 분류 워커 운영 메모

M1.5에서 도입한 워커는 다음 운영 정책:
- 큐: 단순 Postgres `attempt_classify_queue` 테이블 (status='queued'|'running'|'done'|'failed', attempt 한 건당 1 row)
- 폴링: `lib/queue/classify-worker.ts`가 Vercel cron (1분마다) 또는 별도 worker process. Q1엔 cron으로 충분
- 모델: Haiku (저비용)
- 신뢰도 < 0.5 결과 무시 (05-llm-prompts §5)
- 결과 merge: user_item_history.result_history JSONB 마지막 entry의 reasonTags에 set union
- 실패 정책: 최대 재시도 3회 후 failed. failed entry는 attempt 직접 영향 없음 (룰 기반 tags만 살아남음)

# 부록 D — 에러 코드 lock

03-api-contracts §공통의 ErrorCode enum 외에 Q1 신규 추가 없음. 본 분기에서 자주 쓰이는 케이스:
- `UNAUTHORIZED` — 모든 라우트 기본 가드
- `VALIDATION` — zod 실패
- `QUOTA_EXCEEDED` — 코치 호출 quota 초과
- `EXTERNAL_API` — Anthropic 5xx 또는 timeout
- `NOT_FOUND` — itemId 잘못된 경우

UI는 이 5개에 한국어 카피 매핑 1회 lock (`app/_components/ErrorToast.tsx`).
