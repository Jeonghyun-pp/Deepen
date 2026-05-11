# 06 · 세션·모드 상태 머신 (lock)

> 5종 모드 + 공통 세션 머신. XState 컨벤션으로 전이표 정의. `lib/session/` 안에 모드별 분리 구현.

## 0. 공용 정의

### Session context (모든 모드 공통)

```typescript
type SessionContext = {
  userId: string
  mode: SessionMode                      // 'practice' | 'exam' | 'challenge' | 'recovery' | 'retry'
  unitId: string                          // 단원 (예: 'math2-calc')
  startedAt: number                       // epoch ms
  currentItemId: string | null
  attempts: AttemptRecord[]               // 세션 내 누적
  consecutiveCorrect: number
  consecutiveWrong: number
  storedRetryItemId: string | null        // recap 후 재도전용
  scheduledRecap: RecapCard[]             // 시퀀스 카드 큐
  meta: Record<string, unknown>
}

type SessionMode = 'practice' | 'exam' | 'challenge' | 'recovery' | 'retry'

type AttemptRecord = {
  itemId: string
  result: AttemptResult
  diagnosis: Diagnosis
}
```

### 공용 이벤트

```typescript
type SessionEvent =
  | { type: 'START'; mode: SessionMode; unitId: string; targetPatternId?: string }
  | { type: 'SELECT_ITEM'; itemId: string }
  | { type: 'OPEN_AI_COACH' }
  | { type: 'CLOSE_AI_COACH' }
  | { type: 'SUBMIT_ATTEMPT'; payload: SubmitPayload }
  | { type: 'SHOW_NEXT_ACTION' }
  | { type: 'ENTER_RECAP'; cards: RecapCard[] }
  | { type: 'RECAP_QUIZ_PASS' }
  | { type: 'RECAP_QUIZ_FAIL' }
  | { type: 'NEXT_RECAP_CARD' }
  | { type: 'RETURN_TO_RETRY' }
  | { type: 'BATCH_GRADE' }                  // exam 모드 끝
  | { type: 'END_SESSION' }
```

### 공용 상태

```
IDLE → SOLVING → GRADED → (FOLLOWUP | NEXT)
```

`FOLLOWUP` 안에서 모드별 분기.

---

## 1. Practice (연습) 모드 — Q1 유일

### 상태 다이어그램

```
[IDLE]
  └─ SELECT_ITEM → [SOLVING]
                        ├─ OPEN_AI_COACH → [SOLVING.coach_open]
                        ├─ CLOSE_AI_COACH → [SOLVING]
                        └─ SUBMIT_ATTEMPT → [GRADING] (서버 호출)
                                                 ↓
                                          [GRADED]
                                                 ├─ recapNeeded? → [FOLLOWUP_RECAP]
                                                 │       ├─ ENTER_RECAP → [RECAP_CARD]
                                                 │       │       ├─ NEXT_RECAP_CARD → [RECAP_CARD]
                                                 │       │       └─ RECAP_QUIZ_PASS → [RETRY_PROMPT]
                                                 │       │                                 ├─ RETURN_TO_RETRY → [SOLVING] (storedRetryItemId)
                                                 │       │                                 └─ END_SESSION → [DONE]
                                                 │       └─ RECAP_QUIZ_FAIL → [RECAP_CARD] (재시도 또는 fallback)
                                                 └─ else → [NEXT_PROMPT]
                                                         ├─ SELECT_ITEM → [SOLVING]
                                                         └─ END_SESSION → [DONE]
```

### Guards

```typescript
// recapNeeded 진단 결과 사용
guard.recapNeeded = (ctx, ev) => ev.payload.diagnosis.recapNeeded

// retry 후 GRADED로 다시 들어왔을 때 storedRetryItemId 클리어
action.clearRetryStore = assign({ storedRetryItemId: null })
```

### Actions

```typescript
action.persistAttempt = ctx => POST /api/attempts
action.fetchRecap = ctx => POST /api/recap/diagnose → if needed POST /api/recap/build-card
action.refreshGraph = ctx => 그래프 노드 색 갱신
action.refreshStats = ctx => stats 캐시 invalidate
```

### 마일스톤

`lib/session/practice-machine.ts` — M1.6 (Q1)

---

## 2. Exam (실전) 모드 — M2.5

### 차이

- **AI 코치 차단**: `OPEN_AI_COACH` 이벤트 무시
- **힌트 차단**: HintButton 컴포넌트 disabled
- **시간 강함**: 문제 단위 제한 시간 (Item meta `examTimeMs`, 없으면 difficulty × 90초)
- **Recap 차단**: `recapNeeded`라도 FOLLOWUP_RECAP으로 안 감
- **일괄 채점**: 세션 완료 시 한꺼번에 GRADED→ResultPage

### 상태

```
[IDLE]
  └─ START → [LOADING_BATCH] → [SOLVING_BATCH] (item index 0)
                                  ├─ TICK (timer) — 제한 도달 시 자동 SUBMIT
                                  └─ SUBMIT_ATTEMPT → [SOLVING_BATCH] (next idx)
                                                         └─ 마지막 → [BATCH_GRADING]
                                                                          └─ [BATCH_RESULT]
                                                                                 └─ END_SESSION → [DONE]
```

### Special: 문제별 timer

`Timer.tsx`가 `setInterval` + 모드 판별. 시간 초과 시 자동 `SUBMIT_ATTEMPT` (clientside).

---

## 3. Challenge (챌린지) 모드 — M3.2

### 정책

- 같은 Pattern 안에서 난이도 점진 상승
- N=5 연속 정답 시 다음 Pattern으로 이동 (또는 세션 종료)
- 1회 오답 시 같은 Pattern 더 쉬운 문제로 후퇴
- AI 코치·힌트 차단

### 상태

```
[IDLE]
  └─ START (targetPatternId) → [LOADING_FIRST] → [SOLVING_CHALLENGE]
                                                     └─ SUBMIT_ATTEMPT
                                                          ├─ correct: streak++ → if 5 → [LEVEL_UP] → next Pattern → [SOLVING_CHALLENGE]
                                                          │                       else → [SOLVING_CHALLENGE] (next harder item)
                                                          └─ wrong: streak=0 → [SOLVING_CHALLENGE] (easier item) — 2회 연속 오답 시 [DONE]
```

### Recommend 호출

```typescript
POST /api/recommend/next { mode: 'challenge', targetPatternId, contextItemId }
// 응답에서 첫 item 사용
```

---

## 4. Recovery (오답복구) 모드 — M2.5

### 정책

- 후보 풀에서 `in_wrong_note=true` Item 우선 추천
- 추천된 오답 Item을 풀고 정답이면, 그 Item의 similar 2~3개를 자동으로 연달아 추천 (강제 반복)
- 3회 연속 정답 시 해당 Item의 `in_wrong_note=false` (자동 view 갱신)
- AI 코치·힌트·recap 모두 허용 (연습 모드와 유사)

### 상태

```
[IDLE]
  └─ START → [SOLVING_RECOVERY]
                ├─ SUBMIT_ATTEMPT → [GRADED]
                │      ├─ correct: 같은 Item 정답 streak++ — 3 도달 시 [RECOVERED] → [SOLVING_RECOVERY] (next wrong note item)
                │      │             else: similar 2~3개 자동 큐잉 → [SOLVING_RECOVERY]
                │      └─ wrong: streak=0 → [SOLVING_RECOVERY] (같은 Item 재시도 or similar)
                └─ END_SESSION → [DONE]
```

### in_wrong_note 갱신

서버가 `user_item_history.result_history`만 업데이트. view가 자동으로 파생.

---

## 5. Retry (리캡 후 재도전) 모드 — M3.2

### 정책

- 단독 모드는 거의 아님. Practice 모드 안의 sub-state로 진입하는 게 일반적
- 세션 컨텍스트의 `storedRetryItemId`를 사용
- 재도전 결과로 Phase 3 재진단 (recap 효과 측정)

### 상태

```
(Practice의 sub-state)
[RECAP_CARD] (마지막 카드 통과) → [RETRY_PROMPT]
                                       └─ RETURN_TO_RETRY → [SOLVING_RETRY] (item = storedRetryItemId)
                                                                 └─ SUBMIT_ATTEMPT → [GRADED_AFTER_RECAP]
                                                                                          ├─ recap 효과 평가 (BN re-run on prereq)
                                                                                          └─ → [NEXT_PROMPT]
```

### 효과 측정

```typescript
// 재도전 결과에 'recap_followup' meta 첨부
attemptMeta = { source: 'recap_retry', recapPatternIds: [...] }
// 서버: BN re-run on those patternIds → 변화 기록 (prereq_deficit_log에 entry 추가, evidenceCount += 1)
```

---

## 6. 모드 선택 UI — `app/v2/study/[unitId]/page.tsx`

### Q1: 연습 모드만 → ModeSelector 미노출, 자동 practice

### Q2 (M2.5+): 4종 노출

```tsx
<ModeSelector>
  <Mode key="practice" label="연습" desc="자유롭게 풀고 막히면 코치" default />
  <Mode key="exam" label="실전" desc="시간 압박, 힌트 X, 일괄 채점" />
  <Mode key="recovery" label="오답복구" desc="틀렸던 문제 다시" />
  <Mode key="challenge" label="챌린지" desc="이 유형 5연속 정답 도전" requireTargetPattern />
</ModeSelector>
```

`retry`는 사용자에게 노출되지 않음 (recap 통과 시 자동).

---

## 7. 구현 가이드라인

- 각 모드 머신은 `lib/session/<mode>-machine.ts` 한 파일
- XState v5 권장 (`createMachine` + `createActor`)
- 클라 상태 동기화: `useActor` hook + Zustand 미들웨어
- 서버 검증: 클라가 보낸 mode를 서버가 신뢰하지 않음. 서버 측에서도 mode별 정책 재적용 (recap 차단 등) — 위변조 방지

```typescript
// app/api/attempts/route.ts (server-side mode enforcement 일부)
if (mode === 'exam') {
  // recap 정보 응답에서 strip
  resp.diagnosis.recapNeeded = false
  resp.diagnosis.candidates = []
}
if (mode === 'challenge' || mode === 'exam') {
  // AI 코치 호출 카운트가 0인지 추가 검증
  if (aiQuestions > 0) return jsonError('VALIDATION', 'AI usage not allowed in this mode')
}
```

---

## 8. 텔레메트리

세션 머신 전이마다 이벤트 emit:

```typescript
// lib/telemetry/session.ts
function trackTransition(from: State, to: State, event: SessionEvent) {
  console.log(`[session] ${from} → ${to} via ${event.type}`)
  // 또는 Sentry breadcrumb
}
```

추적 메트릭:
- 각 모드 진입률
- recap 발동률
- recap 통과율
- 세션당 평균 attempt 수
- challenge level-up rate

---

## 9. 단위 테스트 lock

각 모드 머신마다 다음 시나리오 테스트 필수 (`tests/unit/session/`):

| 모드 | 시나리오 | 기대 |
|---|---|---|
| practice | 정답 → next | NEXT_PROMPT 도달 |
| practice | 오답 + recap needed | FOLLOWUP_RECAP, 카드 큐 비어있지 않음 |
| practice | recap 통과 → 재도전 정답 | DONE 또는 다음 추천 |
| exam | recap needed라도 | NEXT 직행, recap 차단 |
| exam | 시간 초과 | 자동 SUBMIT |
| recovery | 3 연속 정답 | RECOVERED, in_wrong_note 갱신 호출 |
| challenge | 5 연속 정답 | LEVEL_UP, 다음 Pattern으로 |
| retry | recap 끝 후 | SOLVING_RETRY, item == storedRetryItemId |

```typescript
// 예: tests/unit/session/practice-machine.test.ts
import { createActor } from 'xstate'
import { practiceMachine } from '@/lib/session/practice-machine'

test('recap needed → recap card 진입', () => {
  const actor = createActor(practiceMachine).start()
  actor.send({ type: 'START', mode: 'practice', unitId: 'math2-calc' })
  actor.send({ type: 'SELECT_ITEM', itemId: 'item-1' })
  actor.send({
    type: 'SUBMIT_ATTEMPT',
    payload: { ..., diagnosis: { recapNeeded: true, candidates: [{ patternId: 'p-1', deficitProb: 0.7 }] } }
  })
  expect(actor.getSnapshot().value).toBe('FOLLOWUP_RECAP')
  expect(actor.getSnapshot().context.scheduledRecap.length).toBe(1)
})
```
