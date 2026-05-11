# 08 · Q2 빌드 (M2.1~M2.6, 12주)

> **분기 목표**: Deepen의 차별 자산을 본격 빌드 — 펜슬 입력 + Claude Vision OCR + Bayesian Network 진단 + 8가지 오답 원인 자동 태깅 + 실전/오답복구 모드 + 어드민 듀얼 패널 검수. Q1이 "연습 모드 critical path"였다면 Q2는 "차별 엔진 가동" 분기다.
>
> **읽는 사람**: Q2 담당 풀스택/AI/프론트엔드. Q1 담당과 매주 1회 동기화 필수 (Phase 6 코치·Phase 5 추천 인터페이스가 Q2의 모드별 정책에서 다시 확장되므로).
>
> **참조 우선순위**: 본 문서가 02~06 계약 문서를 다시 인용하지 않는다. 항상 02~06이 source of truth. 본 문서는 "어떤 마일스톤에 어떤 계약을 어떻게 충족시키느냐"의 빌드 순서·파일·의존만 기술한다.

## Q2 분기 헤더

### 인수 조건 (분기 종료 시)

Q2 종료 시점(M2.6 + 통합 베타 1주 = 13주차 말)에 다음이 모두 참:

1. iPad Safari 또는 PencilKit-equivalent 웹 펜 입력으로 풀이 작성 → `/api/ocr` → 단계 정렬 → 채점까지 end-to-end 1.2초 이내 (95p)
2. BN 본격 진단이 attempt ≥ 5인 사용자에 대해 Q1 단순 룰 대신 가동, recap candidate top-1 정확도 ≥ 70% (수기 라벨 50건 기준)
3. 8가지 오답 원인 태그 부여율 ≥ 90% (오답 attempt 100건 샘플링, 룰+AI 합산), AI 분류 latency p95 < 4s (비동기 큐 기준)
4. ModeSelector에서 4종 노출 (practice/exam/recovery/challenge는 placeholder OK 단 exam/recovery는 동작) 단 challenge·retry는 Q3 deferral
5. 어드민이 PDF 업로드 결과(draft 노드·엣지)를 듀얼 패널에서 publish/discard 가능. 검수 처리량: 10분당 nodes 30개 + edges 20개 (수기 측정)
6. 듀얼 패널 (PDF + 그래프 + 코치 3-pane) 학생용 study 페이지 라우트 존재, resize·고정 스크롤 동작

### Q2 → Q3 전달 자산

- `lib/recap/bn-inference.ts` (정확 추론 + loopy BP fallback)
- `lib/ocr/extract-steps.ts` + `lib/ocr/align-lcs.ts`
- `lib/session/exam-machine.ts`, `recovery-machine.ts`
- `app/admin/review/` (어드민 검수 화면 전체)
- `app/v2/study/[unitId]/dual/page.tsx` (3-pane 듀얼 레이아웃)
- `prereq_deficit_log` 누적 결손 데이터 (Q3 challenge·retry 정책의 input)

### Q2가 다루지 않는 것

- pgvector 임베딩 + 하이브리드 랭킹 ALPHA~EPSILON 가중 → **M3.3** (Q3)
- challenge 모드 + retry 모드 머신 → **M3.2** (Q3)
- 결제 (Toss) → **M3.1**
- 통계 대시보드 → **M3.5**
- 학원 SaaS · 교사 대시보드 → **Q4**
- iOS 앱 (경로 B) → **M3.6** + 11-ios-app.md
- Pre-test diagnostic 알고리즘 → **M4.6**

### 의존 체인 (M1.x → M2.y)

| Q2 산출물 | 필요한 Q1 산출물 |
|---|---|
| M2.1 펜슬 캔버스 | M1.5 풀이 화면 (Tldraw가 IteamPanel 옆에 mount) |
| M2.2 OCR | M1.4 attempts 라우트 (ocrImageBase64 필드는 03 §2에 이미 lock) |
| M2.3 BN | M1.4 진단 단순 룰 (`diagnoseQ1`) — BN은 그 위 toggle |
| M2.3 BN | M1.1 `pattern_state` (theta 분포가 BN 관측치) |
| M2.4 8태그 분류 | M1.4 룰 베이스 3태그 + `result_history.reasonTags` 컬럼 |
| M2.5 모드 머신 | M1.6 practice-machine (공통 정의 재사용) |
| M2.6 듀얼 패널 | M1.5 SolvePage·StudyPage + M1.6 그래프 |
| M2.6 어드민 검수 | M1.1 `nodes.status='draft'` enum + M1.2 PDF 파이프라인 draft 출력 |

---

## M2.1 · 펜슬 입력 (경로 C, tldraw 또는 raw Canvas) — 2주

### Goals

오르조 영역 C.1 PencilKit를 웹에서 등가로 구현. 자체 ink 엔진 만들지 않고 tldraw 위에 Deepen 도메인 어댑터만 얹는다. 이 마일스톤의 1차 산출물은 "풀이 화면 우측 패널에서 펜으로 자유롭게 풀고 PNG로 export 가능"한 상태이며, **OCR 호출은 M2.2**에서 붙인다.

### 파일 경로

**신규**:
- `lib/pencil/canvas-host.tsx` — tldraw store wrapping + 페이지 단위 lifecycle
- `lib/pencil/export-png.ts` — drawing → PNG base64 (longer side 1600px clamp)
- `lib/pencil/tools-config.ts` — 펜 색상·두께 프리셋 (오르조 후기 [src 6,7] 등가)
- `app/v2/solve/[itemId]/_components/PencilPanel.tsx` — 우측 sticky 패널 wrapper
- `app/v2/solve/[itemId]/_components/PencilToolbar.tsx` — 펜/지우개/색상 토글
- `lib/pencil/persistence.ts` — drawing JSON ↔ Supabase Storage 동기화 (item별 `drawings/{userId}/{itemId}.json`)

**수정**:
- `app/v2/solve/[itemId]/page.tsx` — 우측 영역에 `PencilPanel` mount, 모바일에선 탭 전환
- `lib/db/schema.ts` — `attempts` 또는 `user_item_history` 메타에 `lastDrawingKey` 추가하지 않음 (Storage 경로 convention만 약속, 02 §0 기존 테이블 변경 없음)

### API 엔드포인트

이 마일스톤은 신규 라우트 추가하지 **않는다**. tldraw drawing 영구화는 Supabase Storage 직접 업로드(클라 service-role 사용 금지, Storage signed URL 통해서) — 03 문서에는 영향 없음.

다만 다음 두 헬퍼는 lib에 둔다:
- `getSignedUploadUrl(path)`, `getSignedDownloadUrl(path)` (Supabase SDK wrap)

OCR 호출은 M2.2 `/api/ocr` 시점에 attach.

### 스키마 변경

없음. (drawing은 Storage에 두고 DB row를 만들지 않는다 — Q4 학원 SaaS 시점에 학생별 쿼터 추적 필요해지면 그때 별도 테이블)

### 컴포넌트 props

```typescript
// PencilPanel
type PencilPanelProps = {
  itemId: string
  initialDrawing?: TldrawSnapshot          // 이전 세션 drawing 있으면 prefill
  onExport: (pngBase64: string) => void    // M2.2 단계에서 OCR 핸들러로 연결
  onChange?: (snapshot: TldrawSnapshot) => void
  readOnly?: boolean                        // 어드민이 학생 풀이 review 시
  height: number | 'auto'
}

// PencilToolbar
type PencilToolbarProps = {
  store: TLStore
  onClear: () => void
  onExport: () => void
}
```

### 알고리즘 함수

해당 없음 (04 알고리즘 변경 없음).

### LLM 프롬프트 의존

해당 없음.

### 의존 마일스톤

- M1.5 (풀이 화면 레이아웃 grid) — `app/v2/solve/[itemId]/page.tsx`가 Q1에 만들어진 grid 위에 PencilPanel을 추가하는 것
- M1.1 (사용자 인증) — Storage RLS는 `user_id` 매칭 필요

### 작업량 추정

| 작업 | 인일 |
|---|---|
| tldraw 셋업 + Tailwind 충돌 해결 | 1 |
| PencilPanel + Toolbar | 2 |
| export-png + resize | 1.5 |
| persistence (Storage signed URL + autosave debounce 2s) | 2 |
| 모바일 반응형 (탭 전환) | 1 |
| 단위 테스트 (export size·snapshot round-trip) | 1.5 |
| QA + iPad Safari Pointer Events 검증 | 1 |
| **합계** | **10 인일 (2주, 1FTE)** |

### Acceptance criteria

- [ ] iPad Safari 9.x에서 Apple Pencil로 풀이 작성, latency 체감 < 50ms (오르조 PencilKit 9ms에는 못 미치지만 베타 허용 범위 — 본격 latency 개선은 경로 B로)
- [ ] export PNG longer side 1600px, base64 size ≤ 4MB
- [ ] 새로고침 후 같은 itemId 진입 시 drawing 자동 복원
- [ ] 다른 사용자가 같은 itemId 풀이 시 자기 drawing만 보임 (Storage RLS 검증)
- [ ] PencilToolbar에서 색 3종 + 굵기 3종 전환 동작
- [ ] tests/unit/pencil/*.test.ts 통과 (export-png mock canvas, persistence mock storage)

---

## M2.2 · Claude Vision OCR + 풀이 단계 정렬 — 2주

### Goals

M2.1에서 만들어진 PNG drawing을 Claude Vision (claude-opus-4-7)으로 LaTeX 단계로 변환하고, LCS DP로 canonical solution과 정렬해 step-level 오류 분류까지 한 번에 만든다. 03 §6 `/api/ocr` 계약을 그대로 충족한다.

### 파일 경로

**신규**:
- `app/api/ocr/route.ts` — POST handler, 03 §6 계약
- `lib/ocr/extract-steps.ts` — Claude Vision 호출 + 05 §6 system prompt
- `lib/ocr/align-lcs.ts` — LCS DP + semantic similarity pairwise 매트릭스
- `lib/ocr/classify-step-error.ts` — Haiku로 errorKind 분류 (05 §7)
- `lib/ocr/preprocess-image.ts` — 클라가 보내기 전 호출하는 helper (서버에도 안전망)
- `lib/api/schemas/ocr.ts` — zod request/response (03 §15 lock 위치)
- `app/v2/solve/[itemId]/_components/OcrResultPanel.tsx` — OCR 결과 표시 (단계별 정렬 + 오류 highlight)
- `tests/unit/ocr/align-lcs.test.ts`

**수정**:
- `app/v2/solve/[itemId]/page.tsx` — PencilPanel `onExport` 핸들러를 `/api/ocr`로
- `app/v2/solve/[itemId]/_components/PencilPanel.tsx` — "채점하기" 버튼이 누르면 `onExport` 호출
- `app/api/attempts/route.ts` — request body에 `ocrImageBase64?` (03 §2에 이미 lock) 처리. 있으면 OCR 결과를 attempt meta에 저장
- `lib/db/schema.ts` — `userItemHistory.resultHistory` JSONB 항목에 `ocrSteps?: AlignedStep[]` 추가. 마이그레이션 불필요 (JSONB 자유 필드)

### API 엔드포인트

03 §6 그대로:

```
POST /api/ocr
req: { itemId, imageBase64 }
resp: { steps, overallConfidence, processingTimeMs }
```

세부 구현:
1. `withAuth` + zod parse + rate limit (10 req/min/user, 03 § Rate limit lock)
2. `extractSteps(imageBase64)` → Claude Vision tool_use → `EmitStepsOutput`
3. canonical = `nodes[item].itemSolution`을 줄 단위 split (helper `lib/ocr/canonical-steps.ts`)
4. `alignLCS(userSteps, canonicalSteps)` → AlignedStep[]
5. matched 안 된 user step에 `classifyStepError` 비동기 (Promise.allSettled, 4초 타임아웃)
6. `costUsd` + `tokensUsed`를 `ai_coach_calls`에 callType='classify' (저비용 카운터)로 기록 (02 §4)

### 스키마 변경

없음. JSONB free-field만 사용.

### 컴포넌트 props

```typescript
type OcrResultPanelProps = {
  ocrResult: OcrResponseData          // 03 §6 resp 그대로
  canonicalSolution: string
  onAcceptAndGrade: () => void        // attempts POST 호출
  onRedraw: () => void                 // PencilPanel 다시 활성
}

type AlignedStepRowProps = {
  userText?: string
  canonicalText?: string
  errorKind?: 'match' | 'extra_step' | 'wrong_substitution' | 'sign_error' | 'missing_condition' | 'arithmetic_error'
  suggestion?: string
}
```

### 알고리즘 함수

04 §7.1 ~ §7.3 그대로 구현. 추가 결정 사항:

- semanticSim 1차 구현은 **string similarity (Jaro-Winkler 또는 Levenshtein)** 만으로 시작 — 임베딩은 M3.3 시점에 `text-embedding-3-large` 도입 후 swap
- `SIM_THRESHOLD = 0.7` (04 §7.2 lock)
- LCS DP는 user steps × canonical steps 매트릭스, 최악 N=20 × M=15 — O(NM) 안전
- backtrack 시 매칭 페어를 결정. 매칭 안 된 user step을 별도 배열로 → classify-step-error 분기

### LLM 프롬프트 의존

- 05 §6 OCR 추출 (Vision, opus)
- 05 §7 LCS 보조 분류 (Haiku)

캐싱: 05 §6 system prompt에 `cache_control: ephemeral` 적용. canonical steps는 item별로 다르므로 캐시 안 됨 (image도 매번 다름).

### 의존 마일스톤

- M2.1 PencilPanel `onExport` 인터페이스
- M1.4 attempts 라우트 (req body `ocrImageBase64` 필드 lock 이미 있음)
- M1.1 `ai_coach_calls` 테이블 (cost 누적)

### 작업량 추정

| 작업 | 인일 |
|---|---|
| /api/ocr 라우트 + zod + 핸들러 | 1.5 |
| extract-steps (Claude Vision wrapper) | 2 |
| align-lcs DP + Jaro-Winkler 유사도 | 2 |
| classify-step-error (Haiku) | 1 |
| OcrResultPanel UI | 2 |
| 통합: attempts → ocr → 채점 plumbing | 1.5 |
| 단위 테스트 (LCS edge case, mock vision response) | 1.5 |
| 평가셋 20쌍 라벨링 + 회귀 (05 §10 운영 정책) | 1.5 |
| **합계** | **13 인일 (2주, 1FTE 다소 over)** — 평가셋 라벨링은 Q1 콘텐츠 인력 분담 |

### Acceptance criteria

- [ ] PNG 1600px → /api/ocr → 응답 p95 < 6s, p50 < 3.5s (Anthropic Vision SLA 의존)
- [ ] alignLCS 테스트셋 50개 (수기 정렬 ground truth)에서 매칭 정확도 ≥ 80%
- [ ] errorKind 분류 정확도 ≥ 65% (50건 수기 라벨)
- [ ] OcrResultPanel에서 매칭 안 된 user step row가 errorKind 색상으로 표시 (sign_error=주황, missing_condition=노랑 등)
- [ ] 학생이 "다시 그리기" 누르면 PencilPanel 활성, 새 export 후 재호출 가능
- [ ] cost USD가 `ai_coach_calls`에 기록되고 `check_ai_quota`에 영향
- [ ] 4MB 초과 이미지 자동 거절 (413)

---

## M2.3 · Bayesian Network 본격 + 시퀀스 리캡 — 2주

### Goals

04 §3.2 BN 정확 추론을 본격 빌드. attempt ≥ 5인 사용자에게 Q1 단순 룰(`diagnoseQ1`)을 자동 toggle off하고 BN으로 교체. 누적 결손은 `prereq_deficit_log`에 upsert. **시퀀스 리캡** = Pattern DAG에서 토폴로지 정렬된 prereq 후보 ≤ MAX_RECAP_CARDS=3개를 큐로 빌드, 학생이 한 장씩 pass하며 마지막 통과 시 `RETRY_PROMPT`로 진입.

### 파일 경로

**신규**:
- `lib/recap/bn-inference.ts` — `runBN(userId, currentItemId)` (04 §3.2 인터페이스 lock)
- `lib/recap/bn-cpt.ts` — noisy-AND CPT 정의 + observation likelihood (04 §3.2 수식)
- `lib/recap/belief-propagation.ts` — exact BP (작은 DAG ≤ 30 노드) + loopy BP fallback
- `lib/recap/topo-sort.ts` — Pattern DAG 토폴로지 정렬 (Kahn 알고리즘)
- `lib/recap/sequence-builder.ts` — immediate prereqs ∩ deficit prob ≥ TAU_RECAP → 시퀀스 빌드
- `app/v2/solve/[itemId]/_components/RecapSequence.tsx` — 카드 큐 UI (좌우 navigation)
- `tests/unit/recap/bn-inference.test.ts` — 합성 DAG 5종 (단일 chain, fork, diamond, cycle-free, 큰 그래프)

**수정**:
- `lib/recap/diagnose.ts` — `diagnose(userId, currentItemId)` 진입점이 attempt count 기반으로 Q1 / Q2 분기
- `app/api/recap/diagnose/route.ts` — 동일 진입점 사용 (03 §4 계약 동일)
- `lib/db/schema.ts` — `prereq_deficit_log` row insert 패턴 사용 (이미 02 §5에 lock)
- `lib/session/practice-machine.ts` — `scheduledRecap` 큐가 1개가 아닌 N개 카드일 때 `NEXT_RECAP_CARD` 이벤트로 다음 카드 진입 (06 §1 다이어그램에 이미 표현)

**마이그레이션**:
- `drizzle/0007_prereq_deficit.sql` — 02 §5 SQL 그대로

### API 엔드포인트

03 §4 계약 변경 없음. 응답 candidates 배열이 Q1엔 1개였는데 Q2엔 ≤ 3개로 늘어남 (계약 자체는 array라 변경 없음).

`POST /api/recap/build-card`도 그대로 — 카드 N장을 만들기 위해 클라가 N번 호출 (또는 서버에서 batch — 결정 사항: **클라가 N회 직렬 호출** + 첫 카드 표시 후 다음 카드 prefetch. 이유: 학생이 첫 카드 pass 못 하면 뒤 카드 안 만들어도 됨, 비용 절감).

### 스키마 변경

`prereq_deficit_log` (02 §5에 이미 lock된 신규 테이블) — 마이그레이션 0007 실행.

upsert 정책: 같은 (userId, patternId) 행은 새 evidence가 들어올 때마다 새 row insert (시계열 보존). 조회 시 `MAX(deficit_probability)` over 최근 30일.

### 컴포넌트 props

```typescript
type RecapSequenceProps = {
  cards: RecapCard[]                           // 04 §5.2 RecapCard
  currentIndex: number
  onQuizSubmit: (cardId: string, answer: string) => Promise<{ correct: boolean; hint?: string }>
  onPassNext: () => void                       // NEXT_RECAP_CARD 이벤트
  onAllPassed: () => void                      // RETRY_PROMPT 진입
}
```

### 알고리즘 함수

04 §3.2 `runBN` 시그니처 lock:

```typescript
async function runBN(userId: string, currentItemId: string): Promise<{
  immediate: { patternId: string, prob: number }[]
  cumulative: Map<string, number>
}>
```

추가 구현 결정:
- DAG 크기 ≤ 30 노드면 exact BP (junction tree 가벼운 구현, 또는 변수 소거)
- 30 < DAG ≤ 200 노드면 loopy BP (max iter = 50, convergence ε = 0.01)
- DAG > 200 노드면 ancestor subgraph 자르기 (현재 item의 prereq closure만)
- 관측 evidence는 최근 30일 (lock `BN_OBS_WINDOW_DAYS`) 그 attempts의 label
- 결과 immediate prob ≥ TAU_RECAP=0.6인 노드만 sequence-builder로

`buildRecapSequence`:

```typescript
function buildRecapSequence(args: {
  immediate: { patternId: string, prob: number }[]
  patternDag: Dag
}): { patternIds: string[] } {
  const filtered = immediate.filter(x => x.prob >= TAU_RECAP)
  const sorted = topoSort(filtered.map(x => x.patternId), patternDag)
  return { patternIds: sorted.slice(0, MAX_RECAP_CARDS) }
}
```

### LLM 프롬프트 의존

- 05 §3 리캡카드 빌드 (변경 없음, 카드 N장이면 N번 호출)
- prompt cache hit-rate가 같은 사용자 같은 단원에서 시퀀스 N장 만들 때 매우 높아짐 — Sentry 메트릭 모니터링 권장

### 의존 마일스톤

- M1.1 `pattern_state` 테이블 (theta 분포 = BN 관측 prior)
- M1.4 `diagnoseQ1` (toggle 분기의 fallback)
- M1.4 attempts 라우트 (`diagnose` 호출 후 응답에 candidates ≤3개 배열)

### 작업량 추정

| 작업 | 인일 |
|---|---|
| BP 라이브러리 선정 vs 자체 구현 (자체 권장 — 외부 deps 무겁고 도메인 specific) | 1 |
| bn-cpt + belief-propagation 코어 | 3 |
| topo-sort + sequence-builder | 1 |
| diagnose() Q1/Q2 toggle | 0.5 |
| prereq_deficit_log upsert 통합 | 0.5 |
| RecapSequence UI (카드 N장 navigation, prefetch) | 2 |
| practice-machine 시퀀스 큐 처리 (NEXT_RECAP_CARD) | 0.5 |
| 합성 DAG 테스트 5종 + ground truth 50건 라벨링 | 2.5 |
| 운영: cohort 데이터로 TAU_RECAP 미세 튜닝 (코드 수정 없이 설정값으로) | 1 |
| **합계** | **12 인일 (2주, 1FTE)** |

### Acceptance criteria

- [ ] 합성 DAG (chain 5노드, diamond 4노드, fork 6노드)에서 BN 결과가 수기 계산과 ε=0.01 이내
- [ ] 실제 cohort sample 50건에서 candidate top-1 정확도 ≥ 70% (수기 라벨)
- [ ] attempt < 5인 사용자에 대해 여전히 Q1 단순 룰 사용 (regression 방지)
- [ ] DAG 200 노드 시나리오에서 BN 호출 p95 < 800ms
- [ ] `prereq_deficit_log` row가 attempt마다 N개 (=immediate prob > 0.5 노드) insert
- [ ] RecapSequence에서 3장 카드 모두 통과 시 `RETRY_PROMPT` 진입 → 원래 itemId로 SOLVING 재진입
- [ ] 첫 카드 fail 시 fallback (04 §3.4 + 05 §3 fallbackCard)으로 채워짐, 빈 화면 X

---

## M2.4 · 8가지 오답 원인 자동 태깅 — 1주

### Goals

오답 attempt에서 04 §1.5 룰 베이스 3태그(`time_overrun`, `hint_dependent`, `prereq_deficit`)는 즉시 부여하고, 나머지 7태그(`concept_lack`, `pattern_misrecognition`, `approach_error`, `calculation_error`, `condition_misread`, `graph_misread`, `logic_leap`)는 Haiku 비동기 분류로 부여한다. 05 §5 prompt 그대로. 결과는 `user_item_history.result_history[-1].reasonTags`에 merge.

### 파일 경로

**신규**:
- `lib/grading/reason-tags.ts` — `classifyWrongReasons(itemId, attemptId, signals): Promise<ReasonTag[]>` (Haiku 호출 + 05 §5 prompt + tool)
- `lib/grading/queue.ts` — 비동기 enqueue helper. M1.x에 `document_jobs` 패턴이 있으므로 같은 테이블 재활용 (`job_type='classify_reasons'`)
- `lib/grading/job-runner.ts` — worker가 큐에서 픽업하여 `classifyWrongReasons` 실행 후 `result_history`에 merge
- `app/api/cron/classify-reasons/route.ts` — `Authorization: Bearer ${DOCUMENT_JOB_WORKER_TOKEN}` (03 §14와 같은 패턴)

**수정**:
- `app/api/attempts/route.ts` — attempt 분류 후 oddly: 룰 태그를 즉시 응답에 포함, AI 7태그는 enqueue. 응답에는 `reasonTagsPending: true` flag 동봉 (03 §2 응답 lock된 `attemptResult.reasonTags`에는 룰 3개만)
- `lib/db/schema.ts` — `document_jobs.job_type` enum에 `'classify_reasons'` 추가 (또는 별도 테이블 신설은 비용 대비 이득 없음 — 같은 큐 재사용 권장. 단 02 §0 기존 테이블 점검 필요. 결정: `document_jobs.job_type` 컬럼이 enum이 아니라 text면 그대로 사용, enum이면 마이그레이션 0008-1로 ALTER TYPE)

**마이그레이션**:
- `drizzle/0008_document_jobs_extend.sql` (필요 시) — job_type enum에 'classify_reasons' 추가. 컬럼이 text면 마이그레이션 불필요.

### API 엔드포인트

- `/api/attempts`는 응답 schema 변경 없음 (reasonTags 배열에 룰 3개만 들어감, AI 7개는 후속 fetch 필요)
- 학생 클라가 AI 태그 결과를 받으려면 다음 attempt를 시작할 때 `userItemHistory`를 재조회 (Q1에 이미 graph 페이지가 polling) — 별도 push 불필요
- 어드민/통계용으로 `GET /api/admin/attempts/[id]` (M2.6에서 노출)

### 스키마 변경

`document_jobs.job_type` 확장 (text면 무변경, enum이면 ALTER TYPE).

`result_history` JSONB 자유 필드 — `reasonTags` 배열에 추가. 룰 태그는 timestamp T0에, AI 태그는 T0+~3s에 merge.

merge policy (lock):
```typescript
function mergeReasonTags(existing: ReasonTag[], aiTags: ReasonTag[], aiConfidence: number): ReasonTag[] {
  if (aiConfidence < 0.5) return existing
  return Array.from(new Set([...existing, ...aiTags]))
}
```

### 컴포넌트 props

```typescript
// FailureReasonChips.tsx — 풀이 결과 화면에서 태그 표시
type FailureReasonChipsProps = {
  tags: ReasonTag[]
  pending: boolean                         // AI 분류 진행중
  onRefresh?: () => void                   // pending이면 polling 트리거
}
```

### 알고리즘 함수

04 §1.5 + 05 §5. 신규 함수:

```typescript
async function classifyWrongReasons(args: {
  itemId: string
  selectedAnswer: string
  ocrSteps?: AlignedStep[]
  signals: Signals
}): Promise<{ tags: ReasonTag[]; confidence: number }>
```

비동기 큐 정책:
- 오답 (label='wrong')만 분류. 'unsure'·'correct'는 호출 안 함 (비용 절감)
- batch 호출 가능성: 사용자 1명이 한 세션에서 N개 오답 모이면 1회 호출로 묶기 (M3.x 최적화로 미룸 — Q2엔 1:1 호출)

### LLM 프롬프트 의존

- 05 §5 system prompt + tool `classify_wrong_reasons`
- prompt_version 컬럼에 'v1' 기록 (05 §10 운영 정책)

### 의존 마일스톤

- M1.4 룰 태그 + `result_history` 컬럼
- M2.2 OCR (ocrSteps가 prompt에 들어감 — 단 OCR 없이도 동작해야 함, optional)
- M1.1 `ai_coach_calls` (cost 카운터, callType='classify')

### 작업량 추정

| 작업 | 인일 |
|---|---|
| classify-wrong-reasons Haiku wrapper | 1 |
| 큐 enqueue + worker | 1.5 |
| cron route + 인증 | 0.5 |
| FailureReasonChips UI + polling | 1 |
| 평가 sample 30쌍 + 정확도 측정 | 1 |
| **합계** | **5 인일 (1주, 1FTE)** |

### Acceptance criteria

- [ ] 오답 attempt 후 5초 이내 AI 태그가 `result_history`에 merge (p95)
- [ ] AI confidence < 0.5면 무시 (existing 유지)
- [ ] 평가셋 30건에서 7태그 정확도 ≥ 60% (precision), recall ≥ 50%
- [ ] FailureReasonChips가 pending 상태에서 spinner, 완료 시 chip 형태로 전환
- [ ] cron 엔드포인트 인증 실패 시 401
- [ ] `ai_coach_calls`에 callType='classify' row 정상 insert

---

## M2.5 · 실전 모드 + 오답복구 모드 — 2주

### Goals

06 §2 (Exam) + §4 (Recovery) 머신 본격 빌드. ModeSelector에 4종 노출 (challenge·retry는 placeholder, 클릭 시 "Q3 출시 예정" 안내). 서버측 mode enforcement(06 §7) 구현 — exam에서 ai_questions > 0이면 attempt 거절.

### 파일 경로

**신규**:
- `lib/session/exam-machine.ts` — XState 머신 (06 §2)
- `lib/session/recovery-machine.ts` — XState 머신 (06 §4)
- `app/v2/study/[unitId]/_components/ModeSelector.tsx` — 06 §6 4종 chip
- `app/v2/exam/[unitId]/page.tsx` — 실전 모드 전용 라우트 (timer + 일괄 채점 결과)
- `app/v2/exam/[unitId]/_components/ExamTimer.tsx` — 문항별 카운트다운 + 자동 SUBMIT
- `app/v2/exam/[unitId]/_components/BatchResult.tsx` — 일괄 채점 결과 페이지
- `app/v2/recovery/page.tsx` — 오답복구 모드 (Q1 graph 페이지가 아닌 wrong_note view를 entry로)
- `app/v2/recovery/_components/WrongNoteList.tsx` — 자동 누적 + 사용자 수동 별표 (오르조 C.3 이원화)
- `lib/recommend/policy.ts` 업데이트 — exam·recovery branch 활성화 (Q1엔 practice만)
- `tests/unit/session/exam-machine.test.ts`, `recovery-machine.test.ts`

**수정**:
- `app/api/attempts/route.ts` — mode별 enforcement (06 §7 서버측 체크 추가)
  - exam: `aiQuestions > 0` || `hintsUsed > 0` → 400 VALIDATION
  - exam: 응답에서 `diagnosis.recapNeeded = false`, `nextAction.type = 'next_item'`로 강제
  - recovery: 응답 nextAction이 `consecutiveCorrect`에 따라 `'next_item'` (similar) 또는 `'session_end'`
- `app/api/recommend/next/route.ts` — mode별 후보 풀 필터 (04 §4.2 표 그대로)
- `app/v2/study/[unitId]/page.tsx` — ModeSelector mount, 모드 선택 후 라우트 이동

### API 엔드포인트

03 §2 `/api/attempts` 응답 nextAction이 모드별 분기 — 03에 이미 lock된 union type. 추가 lock 결정:

- exam 모드는 attempt N개를 한꺼번에 submit하지 않고, 클라가 N번 호출 + 마지막 호출에 `mode: 'exam'`+ `examLastInBatch: true` flag 동봉. 서버는 마지막 호출 시 `nextAction.type = 'session_end'`, payload에 batch summary
- 결정: examLastInBatch flag는 03 §2 req body에 추가 필드로 (validation: optional boolean) — 03 문서 PR 별도

### 스키마 변경

없음. (recovery는 `user_wrong_note` view 사용, exam은 `user_item_history`에 timestamp 기반 추적).

`user_wrong_note` view (02 §2 lock된 SQL) 확인 — Q1에 만들어졌으면 그대로, 안 만들어졌으면 M2.5에서 동봉.

### 컴포넌트 props

```typescript
type ModeSelectorProps = {
  unitId: string
  enabledModes: SessionMode[]              // ['practice','exam','recovery']  Q2 기준
  onSelect: (mode: SessionMode, payload?: { targetPatternId?: string }) => void
}

type ExamTimerProps = {
  itemId: string
  examTimeMs: number                        // item.meta.examTimeMs ?? difficulty * 90000
  onTimeUp: () => void                      // 자동 SUBMIT
  onTick?: (remainingMs: number) => void
}

type WrongNoteListProps = {
  items: WrongNoteItem[]
  filterMode: 'auto' | 'manual' | 'all'    // 오르조 C.3 이원화
  onSelect: (itemId: string) => void
}
```

### 알고리즘 함수

04 §4.1 `nextAction` 함수 — exam·recovery 분기 활성화 (Q1엔 placeholder). 04 §4.2 후보 풀 필터:

| mode | 1차 필터 (lock 그대로) |
|---|---|
| exam | `pattern_id ∈ targets`, `not recently_solved`, `cooling_window=7d`, `not in_wrong_note` |
| recovery | `in_wrong_note=true` 우선, 부족 시 similar (단 similar는 M3.3 임베딩 도입 전엔 signature jaccard로 fallback) |

`recovery_exit_streak = 3` (lock).

### LLM 프롬프트 의존

해당 없음 (모드 머신 자체는 LLM 안 씀).

단, recovery에서 student가 OPEN_AI_COACH 누르면 06 §4 정책상 허용 → 05 §1 코치 호출. quota 체크는 동일.

### 의존 마일스톤

- M1.6 practice-machine (공통 SessionContext·이벤트 정의 재사용)
- M1.4 attempts 라우트 + recommend 라우트
- M1.5 SolvePage (exam·recovery에서 그대로 reuse)
- M2.4 reason tags (recovery 화면에서 오답 원인 chip 표시)

### 작업량 추정

| 작업 | 인일 |
|---|---|
| exam-machine + 단위 테스트 | 2 |
| recovery-machine + 단위 테스트 | 2 |
| ExamTimer + 자동 SUBMIT | 1 |
| BatchResult 페이지 | 1.5 |
| WrongNoteList + 자동/수동 필터 | 1.5 |
| 서버측 mode enforcement | 1 |
| recommend policy exam·recovery 분기 | 1.5 |
| 통합 QA + 모드 전환 시나리오 | 1.5 |
| **합계** | **12 인일 (2주, 1FTE)** |

### Acceptance criteria

- [ ] ModeSelector에서 4종 chip, challenge·retry는 disabled + tooltip "Q3 예정"
- [ ] exam 모드 진입 시 ExamTimer 동작, 시간 초과 시 자동 SUBMIT (timeMs = examTimeMs)
- [ ] exam 모드에서 OPEN_AI_COACH 이벤트 무시 (UI상 코치 버튼 비활성)
- [ ] exam 모드에서 클라가 ai_questions > 0 위변조 시 서버가 400 VALIDATION 반환
- [ ] exam 마지막 attempt 후 BatchResult 페이지에 N개 attempt 일괄 표시 (정답률·평균 시간·오답 패턴)
- [ ] recovery 모드 진입 시 wrong_note 리스트 노출, 자동 누적 우선 정렬
- [ ] recovery에서 같은 Item 3 연속 정답 시 RECOVERED → similar 자동 큐잉
- [ ] 단위 테스트 06 §9 lock 시나리오 모두 통과

---

## M2.6 · 어드민 검수 화면 + 듀얼 패널 — 2주

### Goals

두 가지 큰 산출물을 동시 빌드:

**A) 어드민 검수**: PDF 파이프라인이 만든 `nodes/edges status='draft'`를 어드민이 검토 → publish/discard. 03 §10 admin 라우트 5종 구현. M1.2의 PDF 파이프라인은 draft 출력하도록 이미 변경되어 있음.

**B) 듀얼 패널**: 학생용 `app/v2/study/[unitId]/dual` 라우트 — PDF + 그래프 + 코치 3-pane (오르조 C.4). 지문 고정 스크롤 + 한 패널만 스크롤되는 layout 검증. PDF에서 드래그 → 코치 호출 인터랙션은 Deepen 차별 자산 핵심.

### 파일 경로

**신규 (어드민)**:
- `app/admin/review/page.tsx` — 검수 큐 entry
- `app/admin/review/_components/ReviewQueue.tsx` — node/edge 큐 리스트
- `app/admin/review/_components/NodeReviewCard.tsx` — 단건 노드 검수 (label, content, signature 수정 가능)
- `app/admin/review/_components/EdgeReviewCard.tsx` — 엣지 검수 (source/target Pattern 표시 + reason)
- `app/admin/review/_components/DualReviewPanel.tsx` — 좌측 PDF chunk 미리보기 (draft 노드의 sourceDocumentId 기반) + 우측 노드 폼 (오르조 C.4 응용)
- `app/api/admin/review/queue/route.ts` — 03 §10
- `app/api/admin/nodes/[id]/publish/route.ts`, `.../discard/route.ts`
- `app/api/admin/edges/[id]/publish/route.ts`, `.../discard/route.ts`
- `app/api/admin/patterns/[id]/signature/route.ts`
- `lib/admin/role-guard.ts` — `withRole(['admin'])` (03 §15 lock 헬퍼 활용)
- `lib/api/schemas/admin.ts` — zod

**신규 (듀얼 패널)**:
- `app/v2/study/[unitId]/dual/page.tsx` — 3-pane 라우트
- `app/v2/study/[unitId]/dual/_components/DualPanelLayout.tsx` — Resizable Panels (`react-resizable-panels` 또는 자체 grid)
- `app/v2/study/[unitId]/dual/_components/PdfPane.tsx` — 좌측 PDF 뷰어 (M1.2 chunk 좌표 활용 + 드래그 selection)
- `app/v2/study/[unitId]/dual/_components/GraphPane.tsx` — 중앙 그래프 (Q1 그래프 컴포넌트 reuse, 좁은 폭에서 작동)
- `app/v2/study/[unitId]/dual/_components/CoachPane.tsx` — 우측 AI 코치 (Q1 ChatPanel reuse)
- `lib/dual-panel/drag-to-coach.ts` — PDF 드래그 selection → 코치 입력 prefill
- `lib/dual-panel/sticky-scroll.ts` — 한 패널만 스크롤되는 lock policy

**수정**:
- `app/v2/study/[unitId]/page.tsx` — "듀얼 모드 전환" 버튼 추가, dual 라우트로 이동
- `lib/db/schema.ts` — 변경 없음 (status enum은 02 §1에 이미 lock)

**마이그레이션**:
- `drizzle/0008_admin_review.sql` — 02 §0008에 따라 별도 컬럼 없음, 정책만 보강 가능

### API 엔드포인트

03 §10 그대로. 추가 결정:

- `GET /api/admin/review/queue?type=node|edge` — pagination 50/page, draft 상태만, 최신 createdAt desc
- `POST /api/admin/nodes/[id]/publish` — req body `{ overrides?: Partial<Node> }` → 핸들러가 overrides 적용 후 status='published'로
- discard는 hard delete 아님 — `status='discarded'` enum에 추가 권장? 결정: **discarded는 row 삭제** (단 audit log는 별도). 02 §1에 status enum lock된 두 값 'draft', 'published'만이므로 discard = row 삭제. 별도 audit는 `admin_actions` 테이블 미신설 (Q3 결정 보류 — Q4 학원 SaaS 시점에 audit 필요).

### 스키마 변경

없음. status enum은 02 §1에 이미 lock.

### 컴포넌트 props

```typescript
type ReviewQueueProps = {
  type: 'node' | 'edge'
  initialItems: ReviewItem[]
  onSelect: (id: string) => void
}

type NodeReviewCardProps = {
  draft: GraphNode
  sourceChunk?: { documentId: string, page: number, text: string }
  onPublish: (overrides?: Partial<GraphNode>) => Promise<void>
  onDiscard: () => Promise<void>
  onSignatureUpdate: (sig: string[]) => Promise<void>
}

type DualPanelLayoutProps = {
  leftPane: React.ReactNode
  centerPane: React.ReactNode
  rightPane: React.ReactNode
  defaultSizes?: [number, number, number]   // 기본 30 / 40 / 30
  stickyLeft?: boolean                       // 오르조 "지문 고정 스크롤"
}

type PdfPaneProps = {
  documentId: string
  onTextSelect: (selection: { text: string; chunkId: string; bbox: BBox }) => void
}

type CoachPaneProps = {
  prefillText?: string                       // PDF 드래그 결과 prefill
  itemId?: string                            // 풀고 있는 문제 컨텍스트 (없을 수 있음 — study 모드)
}
```

### 알고리즘 함수

신규 함수 거의 없음. drag-to-coach는 다음:

```typescript
function buildCoachPrefill(args: {
  selectedText: string
  chunkContext: { documentId: string, chunkId: string, page: number }
}): string {
  // 학생이 드래그한 부분을 "이 부분 설명해줘:" 형태로 wrap
  return `다음을 설명해주세요:\n\n${selectedText}\n\n(${chunkContext.page}p)`
}
```

### LLM 프롬프트 의존

- 05 §1 AI 코치 chat (변경 없음, prefill만 클라가 채워서 보냄)
- 05 §4 PDF 추출 (어드민이 reprocess 트리거 시 재호출)

### 의존 마일스톤

- M1.1 `nodes.status` enum + `nodes_select_published` RLS
- M1.2 PDF 파이프라인 draft 출력
- M1.5 SolvePage layout (3-pane은 SolvePage와 별 라우트, 중복 X)
- M1.6 practice-machine + GraphPanel
- M2.3 BN (어드민이 검수 결과를 publish 시 BN cache invalidate 필요)
- M2.4 reason tags (어드민이 학생 attempt 검토 시 활용)

### 작업량 추정

| 작업 | 인일 |
|---|---|
| 어드민 라우트 5종 + zod | 2 |
| ReviewQueue + NodeReviewCard | 2 |
| EdgeReviewCard | 1 |
| DualReviewPanel (PDF chunk preview) | 2 |
| 학생 듀얼 패널 layout | 2 |
| PdfPane (드래그 selection + chunk 좌표 매핑) | 2 |
| CoachPane prefill 통합 | 1 |
| sticky scroll 정책 + iPad 검증 | 1 |
| QA + 어드민 처리량 측정 | 1 |
| **합계** | **14 인일 (2주 over, 다소 빡빡 — 어드민 1FTE + 듀얼 패널 0.5FTE 분담 권장)** |

### Acceptance criteria

- [ ] 어드민 role 사용자만 `/admin/review` 접근 (다른 role → 403)
- [ ] 큐 페이지에서 draft node 50건 페이지네이션
- [ ] NodeReviewCard에서 label/content/signature 인라인 편집 후 publish 시 status='published'
- [ ] discard 후 row 삭제, 큐에서 사라짐
- [ ] 어드민 처리량 measured: 10분 동안 nodes 30개 + edges 20개 처리 가능 (수기 stopwatch)
- [ ] 듀얼 패널 라우트에서 PDF 드래그 → 코치 prefill 자동 채워짐
- [ ] 한 패널 길어도 다른 패널 위치 안 흔들림 (sticky scroll lock)
- [ ] iPad Safari에서 3-pane 동시 표시 (가로) + 모바일에선 탭 전환
- [ ] DualPanelLayout resize 위치 localStorage persist

---

## 통합 베타 (1주, 13주차)

### Goals

M2.1~M2.6 기능을 한 명의 학생 cohort (5~10명)가 1주일 동안 실제로 사용. 데이터 수집 + 회귀 fix.

### 작업

| 작업 | 인일 |
|---|---|
| 베타 학생 5명 모집 + 온보딩 | 1 |
| Sentry breadcrumb 추가 (모드별·OCR·BN) | 0.5 |
| 일일 회고 + bug fix backlog | 2 |
| 인수 시나리오 12-acceptance.md D2 (Q2 차별 데모) 자동화 | 1.5 |
| **합계** | **5 인일 (1주, 0.5FTE)** |

### Acceptance criteria (Q2 분기 종료)

분기 헤더 인수 조건 6개 (위) 모두 충족.

추가:
- [ ] 5명 cohort에서 1주일 동안 OCR 호출 평균 일 3회 이상
- [ ] BN 진단 발동률 (recapNeeded=true 비율) 25%~50% (너무 낮으면 TAU_RECAP 하향, 너무 높으면 상향 고려 — 단 이번 분기엔 lock 유지)
- [ ] exam 모드 사용 ≥ 1회/학생, 일괄 채점 페이지 만족도 정성 인터뷰
- [ ] recovery 모드 사용 ≥ 1회/학생
- [ ] 어드민이 베타 동안 새 PDF 1개 → 노드 30개 publish 처리 가능

---

## Q2 통합 의존 그래프 (요약)

```
M1.1 (schema, pattern_state)
  ├─→ M2.3 BN (theta가 prior)
  └─→ M2.6 admin (status enum)

M1.2 (PDF 파이프라인 draft)
  └─→ M2.6 admin (검수 input)

M1.4 (attempts, reason rules)
  ├─→ M2.2 OCR (ocrImageBase64 필드)
  ├─→ M2.4 8태그 (룰 베이스 위 AI 7태그)
  └─→ M2.5 모드 (exam·recovery enforcement)

M1.5 (SolvePage layout)
  ├─→ M2.1 펜슬 (PencilPanel mount)
  └─→ M2.6 듀얼 패널 (별 라우트지만 컴포넌트 reuse)

M1.6 (practice-machine, GraphPanel)
  ├─→ M2.5 exam·recovery (공통 정의)
  └─→ M2.6 듀얼 패널 GraphPane

M2.1 PencilPanel
  └─→ M2.2 OCR (export PNG → /api/ocr)

M2.2 OCR
  └─→ M2.4 8태그 (ocrSteps가 prompt 입력)

M2.3 BN
  └─→ M2.5 recovery (similar 추천 시 BN deficit 데이터 활용 가능)

M2.4 8태그
  └─→ M2.5 recovery (오답 화면에 chip 표시)
  └─→ M2.6 어드민 (학생 attempt 검토)
```

---

## Q2 분기 작업량 종합

| 마일스톤 | 인일 | 주 |
|---|---|---|
| M2.1 펜슬 | 10 | 2 |
| M2.2 OCR + LCS | 13 | 2 |
| M2.3 BN + 시퀀스 리캡 | 12 | 2 |
| M2.4 8태그 | 5 | 1 |
| M2.5 모드 머신 (exam·recovery) | 12 | 2 |
| M2.6 어드민 + 듀얼 패널 | 14 | 2 |
| 통합 베타 | 5 | 1 |
| **합계** | **71 인일** | **12주** |

1FTE 기준 12주 = 60 인일이라 초과. 권장: **1.2~1.4 FTE 평균** (피크 M2.6에 0.5FTE 추가). 또는 M2.4를 M2.5와 같은 sprint에 묶고 M2.6에 듀얼 패널만 남기는 재배분 가능 — 단 M2.4가 M2.5 recovery 화면 의존이라 순서 유지 권장.

## Q2 리스크 + 미티게이션

| 리스크 | 확률 | 영향 | 미티게이션 |
|---|---|---|---|
| iPad Safari Pointer Events latency 30ms+ | 높음 | 중 | 베타 사용자 후기 모니터링, 임계 도달 시 Q3 경로 B (PencilKit iPad 앱) 가속 — 11-ios-app.md 참조 |
| Claude Vision OCR 정확도 < 70% | 중 | 높음 | 평가셋 50건 회귀, 임계 미달 시 학생에게 "수정 후 재제출" 워크플로 강조 + 단계 textarea 직접 입력 폴백 |
| BN 정확도 < 70% | 중 | 중 | TAU_RECAP 튜닝 (0.6 → 0.55 또는 0.65), cohort 데이터 50건 회귀 |
| 어드민 처리량 < 30/10분 | 중 | 중 | DualReviewPanel UX 단순화, 일괄 publish 버튼 (M3.x로 미룸) |
| Q2 베타 cohort 5명 모집 실패 | 낮음 | 높음 | 학원 사전 협력 (별도 BD) — Q1 분기에 합의 완료 가정 |
| OCR 비용 폭증 (Vision + Haiku 조합) | 중 | 중 | 일 1만 호출 cost projection (Anthropic 단가 × token), Q2 종료 시 단가 < $0.05/attempt 검증, 초과 시 Haiku 단독 OCR로 swap 검토 (M3.x) |

## Q2 측정 지표 (Sentry custom metrics)

```
ocr.latency_p95
ocr.success_rate
bn.inference_latency_p95
bn.recap_needed_rate
reason_tags.ai_classification_accuracy
exam_mode.usage_count
recovery_mode.usage_count
admin.review_throughput_per_10min
dual_panel.drag_to_coach_event_count
llm.cache_hit_rate (05 §10에 이미 lock)
```

각 지표는 일 단위 dashboard. 베타 1주차에 baseline 측정, 2주차부터 회귀 추적.

---

## Q3 인수인계 노트 (M3.x 담당에게)

Q2 종료 시 다음 작업을 Q3가 이어서:

1. **M3.1 Toss 결제 + 사용량 캡 강제** — `ai_coach_calls` 카운터는 이미 가동, billing 라우트만 추가
2. **M3.2 challenge 모드 + retry 모드** — 06 §3, §5 머신. retry는 practice의 sub-state로 진입 (단순), challenge는 새 라우트
3. **M3.3 pgvector 임베딩 + 하이브리드 랭킹** — 04 §4.3 ALPHA~EPSILON 활성화. M2.2 LCS의 semanticSim도 임베딩으로 swap
4. **M3.4 챌린지 퀘스트 + 보호자 리포트 cron** — 03 §14 cron 라우트 활성화
5. **M3.5 통계 대시보드** — Q2의 measurement 데이터를 학생 대시보드로 노출
6. **M3.6 iOS 앱 베타 (경로 B)** — 11-ios-app.md 참조. M2.1 tldraw 자산은 폐기되지 않고 웹 fallback으로 유지

Q2가 만든 BN 진단 + 시퀀스 리캡은 Q3·Q4 내내 핵심 자산이다. 변경은 04 §3 cohort 데이터 + memo 동봉 PR 절차 따른다.
