# 04 · 알고리즘 (lock)

> 모든 수식, 임계값, 가중치를 lock. 코드 구현이 이 사양과 다르면 코드 수정. 수치 튜닝은 PR + cohort 데이터 첨부.

## 1. 채점 분기 — `lib/grading/score.ts`

### 1.1 입력 신호

| 신호 | 타입 | 출처 |
|---|---|---|
| `correct` | `0 \| 1` | 클라가 정답 비교 후 보냄 (객관식: 즉시 / 주관식: OCR 후) |
| `timeMs` | `number` | 클라 타이머 |
| `hintsUsed` | `number` | 클라 카운터 |
| `aiQuestions` | `number` | AI 코치 호출 횟수 (해당 attempt 내) |
| `selfConfidence` | `'sure' \| 'mid' \| 'unsure'` | 슬라이더 |

### 1.2 timeZ 계산

```typescript
// item별 평균 풀이시간 (publish된 모든 attempt over 7d)
async function getItemAvgTime(itemId: string): Promise<{ mean: number, std: number }>

// fallback: cohort 데이터 부족 시 difficulty 기반 추정
const FALLBACK_TIME_MS = (difficulty: number) => 60000 + difficulty * 120000  // 1~3분
const FALLBACK_STD = 30000

const timeZ = (timeMs - mean) / max(std, 1)
```

### 1.3 confidence_score 공식 (lock)

```typescript
const W = { correct: 1.0, time: 0.3, hints: 0.4, ai: 0.2, conf: 0.5 } as const

function confidenceScore(s: Signals): number {
  return (
    W.correct * (s.correct ? 1 : 0)
    - W.time * Math.max(0, s.timeZ)
    - W.hints * s.hintsUsed
    - W.ai * s.aiQuestions
    - W.conf * (s.selfConfidence === 'unsure' ? 1 : 0)
  )
}
```

### 1.4 분류

```typescript
const TAU_HIGH = 0.6  // 정답이지만 헷갈림 임계

function classifyAttempt(s: Signals, cs: number): Label {
  if (s.correct === 0) return 'wrong'
  if (cs >= TAU_HIGH) return 'correct'
  return 'unsure'  // 정답이지만 헷갈림
}
```

### 1.5 reason_tags 룰 즉시 부여 (8가지 중 일부)

```typescript
function ruleBaseTags(s: Signals, timeZ: number, bnMaxP: number): ReasonTag[] {
  const tags: ReasonTag[] = []
  if (timeZ > 2) tags.push('time_overrun')
  if (s.hintsUsed > 0) tags.push('hint_dependent')
  if (bnMaxP >= 0.6) tags.push('prereq_deficit')
  return tags
}
```

나머지 5종(`concept_lack`, `pattern_misrecognition`, `approach_error`, `calculation_error`, `condition_misread`, `graph_misread`, `logic_leap`)은 비동기 AI 분류 (05-llm-prompts §5).

## 2. Pattern Elo 숙련도 — `lib/grading/elo.ts`

### 2.1 파라미터 (lock)

```typescript
const K = 32             // Elo K-factor
const ELO_TO_THETA = (elo: number) => 1 / (1 + Math.exp(-(elo - 1500) / 200))  // sigmoid → 0~1
const THETA_TO_ELO = (theta: number) => 1500 + 200 * Math.log(theta / (1 - theta))
```

### 2.2 갱신

```typescript
function updateElo(args: {
  thetaUser: number,    // 0~1
  betaPattern: number,  // 0~1 (Pattern 난이도)
  label: 'correct' | 'wrong' | 'unsure',
}): { thetaUser: number, betaPattern: number } {
  const eloUser = THETA_TO_ELO(args.thetaUser)
  const eloPattern = THETA_TO_ELO(args.betaPattern)
  const expected = 1 / (1 + Math.pow(10, (eloPattern - eloUser) / 400))
  const labelScore = args.label === 'correct' ? 1.0 : args.label === 'unsure' ? 0.6 : 0.0
  const delta = K * (labelScore - expected)
  return {
    thetaUser: ELO_TO_THETA(eloUser + delta),
    betaPattern: ELO_TO_THETA(eloPattern - delta),
  }
}
```

### 2.3 다중 Pattern 매핑

한 Item이 N개 Pattern에 태깅되어 있으면, **각 Pattern을 독립 갱신**. 가중치 균등 1/N 적용은 Q3에 임베딩 도입 후 검토.

### 2.4 콜드스타트

- 사용자 첫 attempt: `thetaUser = 0.5`
- Pattern 첫 등장: `betaPattern = avg(items.difficulty)`
- M4.6 pre-test diagnostic 도입 시 초기값 다르게 세팅 (§6 참조)

## 3. Phase 3 진단 (Bayesian Network) — `lib/recap/diagnose.ts`

### 3.1 Q1 단순화 버전

BN 없이 룰 기반:

```typescript
async function diagnoseQ1(userId, currentItemId): Promise<Diagnosis> {
  const item = await getNode(currentItemId)
  const directPrereqs = await getPrereqPatterns(item.patternIds)
  // 사용자 patternState에서 theta가장 낮은 prereq 1개 + 최근 attempt에서 해당 prereq item 오답 1+
  const candidates = await Promise.all(directPrereqs.map(async p => {
    const state = await getPatternState(userId, p.id)
    const recentWrong = await countRecentWrongOnPattern(userId, p.id, 7)  // 7일
    const score = (1 - state.theta) * 0.7 + min(recentWrong / 3, 1) * 0.3
    return { patternId: p.id, deficitProb: score }
  }))
  const top = candidates.sort((a,b) => b.deficitProb - a.deficitProb)[0]
  return {
    recapNeeded: top && top.deficitProb >= 0.6,
    candidates: top ? [top] : [],
  }
}
```

### 3.2 Q2 본격 BN — `lib/recap/bn-inference.ts`

Pattern DAG 위에 noisy-AND CPT 베이지안 네트워크:

**노드**: 각 Pattern의 mastery 잠재 변수 ∈ {1: 숙련, 0: 결손}

**CPT**:
```
P(C=1 | parents) = 0.9 · ∏_{p ∈ parents} (P(p=1) · 0.9 + P(p=0) · 0.1)
```

**관측 변수**: 최근 N=20 attempt의 label
```
P(observed_label | mastery) =
  if label='correct':  mastery==1 ? 0.85 : 0.15
  if label='unsure':   mastery==1 ? 0.35 : 0.40
  if label='wrong':    mastery==1 ? 0.15 : 0.85
```

**추론**: belief propagation (작은 DAG는 정확, 큰 DAG는 loopy BP).

**구현**: `lib/recap/bn-inference.ts`에 인터페이스 lock:
```typescript
async function runBN(userId: string, currentItemId: string): Promise<{
  immediate: { patternId: string, prob: number }[],   // 현재 item 직접 prereq만
  cumulative: Map<string, number>,                    // 누적 결손 확률
}>
```

immediate 결과 중 `prob ≥ 0.6` 인 것을 토폴로지 정렬 → recap 시퀀스. cumulative는 prereq_deficit_log에 upsert.

### 3.3 Cold-start

- 사용자 attempt < 5: BN 호출하지 않고 Q1 단순 룰 사용
- 같은 학년·과목 사용자 평균을 prior로 (M4.6 이후 도입)

### 3.4 임계값 (lock)

| 임계값 | 값 | 의미 |
|---|---|---|
| `TAU_RECAP` | 0.6 | recap 발동 임계 deficit prob |
| `TAU_HIGH` | 0.6 | confidence_score 임계 |
| `MAX_RECAP_CARDS` | 3 | 시퀀스 카드 최대 |
| `BN_OBS_WINDOW_DAYS` | 30 | 관측 evidence 기간 |

## 4. 추천 엔진 — `lib/recommend/`

### 4.1 정책 (`policy.ts`)

```typescript
function nextAction(args: {
  mode: SessionMode,
  attemptResult: AttemptResult,
  diagnosis: Diagnosis,
  userState: UserState,
}): NextAction {
  // 알고리즘 5-1
  if (args.mode === 'practice' && args.diagnosis.recapNeeded) {
    return { type: 'recap', payload: { candidates: args.diagnosis.candidates } }
  }
  if (args.mode === 'exam') {
    return { type: 'next_item', payload: { fromBatch: true } }   // 일괄 채점은 마지막에
  }
  if (args.mode === 'recovery') {
    if (consecutiveCorrect >= 3) return { type: 'session_end' }
    return { type: 'next_item', payload: { fromWrongNote: true } }
  }
  if (args.mode === 'challenge') {
    if (consecutiveCorrect >= 5) return { type: 'level_up' }
    return { type: 'next_item', payload: { samePattern: true, difficulty: '+0.1' } }
  }
  if (args.mode === 'retry') {
    return { type: 'next_item', payload: { itemId: storedItemId } }
  }
  // mastery 구간별
  const theta = currentPatternTheta
  if (theta < 0.4) return { type: 'next_item', payload: { samePattern: true, easy: 2, mid: 1 } }
  if (theta < 0.7) return { type: 'next_item', payload: { mixed: true } }
  return { type: 'next_item', payload: { advanced: 1, killer: 1 } }
}
```

### 4.2 후보 풀 필터 (mode별)

| mode | 1차 필터 |
|---|---|
| practice | `pattern_id ∈ targets`, `not recently_solved`, `cooling_window=7d` |
| exam | 동일 + `not in_wrong_note` |
| challenge | `pattern_id = current_pattern`, `difficulty ≥ theta + 0.1` |
| recovery | `in_wrong_note = true` 우선, 부족 시 similar |
| retry | itemId 강제 (Phase 7 상태) |

### 4.3 하이브리드 랭킹 — `score.ts` (M3.3+)

```typescript
const ALPHA = 0.30  // jaccard
const BETA  = 0.30  // cosine
const GAMMA = 0.15  // prereq overlap
const DELTA = 0.15  // weakness alignment
const EPSILON = 0.10 // deficit boost

function score(item: ItemWithMeta, base: ItemWithMeta, user: UserState): number {
  const jac = jaccard(item.signature, base.signature)
  const cos = cosine(item.embedding, base.embedding)
  const ovl = overlap(item.requiresPrereq, base.requiresPrereq)
  const wal = weaknessAlignment(item, user)
  const dft = deficitBoost(item, user)
  return ALPHA*jac + BETA*cos + GAMMA*ovl + DELTA*wal + EPSILON*dft
}

function weaknessAlignment(item, user): number {
  // item이 사용자의 약점 Pattern을 건드리는가
  return item.patternIds.reduce((acc, pid) => {
    const theta = user.masteryByPattern[pid]?.theta ?? 0.5
    return acc + (1 - theta)  // theta 낮을수록 가중
  }, 0) / item.patternIds.length
}

function deficitBoost(item, user): number {
  // item.requiresPrereq ∩ user.deficitMap
  let boost = 0
  for (const pid of item.requiresPrereq) {
    boost += user.deficitMap.get(pid) ?? 0
  }
  return Math.min(1, boost)
}
```

### 4.4 임베딩 — `lib/embeddings/`

- 모델: `text-embedding-3-large` (1536-dim)
- 입력 텍스트: `${label}\n\n${signature.join(', ')}\n\n${content.slice(0, 2000)}`
- 저장: `nodes.text_embedding` vector(1536)
- 쿼리: pgvector cosine `<=>` 연산자
- 인덱스: ivfflat lists=100 (Pattern·Item 합쳐 1만 노드 가정), 1만 초과 시 lists=sqrt(N) 권장

```sql
SELECT id, label, 1 - (text_embedding <=> $1::vector) AS similarity
FROM nodes
WHERE type = 'item' AND status = 'published' AND id != $base_id
ORDER BY text_embedding <=> $1::vector
LIMIT $k;
```

## 5. Recap 카드 빌드 — `lib/recap/build-card.ts`

### 5.1 입력
```typescript
async function buildRecapCard(args: {
  patternId: string,
  currentItemId: string,
  userMastery: number,  // theta
}): Promise<RecapCard>
```

### 5.2 카드 구조 (lock — deck Slide 9 디자인 일치)

```typescript
type RecapCard = {
  patternId: string,
  grade: string,                       // '중3', '수Ⅱ' 등
  name: string,                        // '이차방정식의 판별식'
  durationMin: 1 | 2 | 3,
  whyNeeded: string,                   // 1줄
  coreBullets: [string, string, string],  // 정확히 3줄
  checkQuiz: { question: string, answer: string, hint: string },
  triggerItemId: string,               // 원래 문제 (복귀용)
}
```

### 5.3 LLM 호출 (05-llm-prompts §3)

prompt cache 적용 (system prompt 5분 TTL).

응답 schema는 `tool_use` 블록으로 강제 (claude-opus-4-7 tool calling).

### 5.4 검증

- coreBullets.length === 3
- coreBullets.every(b => b.length ≤ 80자)
- whyNeeded.length ≤ 60자
- 응답 schema 위반 시 1회 재시도, 그래도 실패면 fallback (`signature[0..3]`을 그대로 bullet화)

## 6. Pre-test Diagnostic — `lib/diagnostic/pretest.ts` (M4.6, 부록)

알고리즘 부록 그대로 구현:

```typescript
async function runPreTest(userId: string, unitId: string): Promise<Map<patternId, theta>> {
  const dag = await getPatternDag(unitId)
  const sorted = topologicalSort(dag)
  const uncertain = new Set(sorted.map(n => n.id))
  const results = new Map<string, number>()

  let questionsAsked = 0
  while (uncertain.size > 0 && questionsAsked < 10) {
    // 정보량 최대 노드 선택
    const target = pickMaxInfo(uncertain, dag)
    const item = await pickRepresentativeItem(target, 'mid')
    const correct = await askQuestion(userId, item)  // 클라 동기 대기
    questionsAsked++

    if (correct) {
      // target + ancestors → mastery_score 0.7
      for (const ancestor of getAncestors(target, dag)) {
        results.set(ancestor, 0.7)
        uncertain.delete(ancestor)
      }
      results.set(target, 0.7)
      uncertain.delete(target)
    } else {
      // target + descendants → mastery_score 0.3
      for (const desc of getDescendants(target, dag)) {
        results.set(desc, 0.3)
        uncertain.delete(desc)
      }
      results.set(target, 0.3)
      uncertain.delete(target)
    }
  }
  return results
}

function pickMaxInfo(uncertain, dag): nodeId {
  return [...uncertain].sort((a, b) => {
    const aInfo = dag.ancestors(a).size + dag.descendants(a).size
    const bInfo = dag.ancestors(b).size + dag.descendants(b).size
    return bInfo - aInfo
  })[0]
}
```

## 7. OCR + LCS 단계 정렬 — `lib/ocr/`

### 7.1 추출

Claude Vision (claude-opus-4-7) 호출. prompt: 05-llm-prompts §6.

응답 schema:
```typescript
{ steps: { line: number, text: string, type: 'equation' | 'condition' | 'conclusion' }[] }
```

### 7.2 정렬 (LCS)

```typescript
function alignLCS(userSteps: string[], canonicalSteps: string[]): AlignedStep[] {
  // 표준 LCS DP — semantic similarity로 매칭 (각 step pair에 cosine 임베딩)
  const sim = await Promise.all(userSteps.map(async u => 
    canonicalSteps.map(c => semanticSim(u, c))
  ))
  // dp[i][j] = LCS length up to userSteps[i], canonicalSteps[j]
  // backtrack → aligned pairs + unaligned
  return aligned
}

const SIM_THRESHOLD = 0.7  // 매칭 임계
```

### 7.3 오류 분류

매칭 안 된 user step에 LLM이 `errorKind` 부여:
- `'extra_step'` (canonical에 없는 줄)
- `'wrong_substitution'`
- `'sign_error'`
- `'missing_condition'`

## 8. 학습자 그래프 시각 인코딩 — `lib/graph/encode-visual.ts`

```typescript
type VisualAttrs = {
  fillColor: string,        // hex
  strokeColor: string,
  strokeStyle: 'solid' | 'dashed',
  borderColor?: string,
  badgeIcon?: 'warning' | 'killer',
  opacity: number,
}

function encode(node: GraphNode, userState: UserState): VisualAttrs {
  const theta = userState.masteryByPattern[node.id]?.theta
  const attemptCount = userState.attemptCountByPattern[node.id] ?? 0
  const isCumulativeDeficit = userState.deficitCandidates.includes(node.id)
  const recentWrongStreak = userState.recentWrongStreak[node.id] ?? 0

  // 회색 점선 = 미학습
  if (attemptCount === 0) return { fillColor: '#E5E5E5', strokeStyle: 'dashed', opacity: 0.7 }

  // 초록 = 안정 숙련 (theta >= 0.7)
  if (theta >= 0.7) {
    return {
      fillColor: '#16A34A',
      strokeStyle: 'solid',
      badgeIcon: recentWrongStreak >= 2 ? 'warning' : undefined,
      opacity: 1,
    }
  }

  // 노란색 = 정답률 낮음
  if (node.avgCorrectRate !== null && node.avgCorrectRate < 0.5) {
    return { fillColor: '#FACC15', strokeStyle: 'solid', opacity: 1 }
  }

  // 진한 색 = 빈출
  const isFrequent = (node.frequencyRank ?? 999) <= 10
  const fillColor = isFrequent ? '#1E40AF' : '#60A5FA'
  const borderColor = node.isKiller ? '#DC2626' : undefined
  const strokeColor = isCumulativeDeficit ? '#F97316' : '#3B82F6'

  return {
    fillColor,
    strokeColor,
    strokeStyle: isCumulativeDeficit ? 'dashed' : 'solid',
    borderColor,
    opacity: 1,
  }
}
```

서버 측 인코딩 (M3+) 또는 클라 (Q1~Q2). 같은 함수.

## 9. 정해진 상수 일람 (lock)

```typescript
// 채점
TAU_HIGH = 0.6
W = { correct: 1.0, time: 0.3, hints: 0.4, ai: 0.2, conf: 0.5 }

// Elo
K = 32

// BN/Recap
TAU_RECAP = 0.6
MAX_RECAP_CARDS = 3
BN_OBS_WINDOW_DAYS = 30

// Recommend
COOLING_WINDOW_DAYS = 7
RECOVERY_EXIT_STREAK = 3
CHALLENGE_LEVELUP_STREAK = 5
ALPHA=0.30, BETA=0.30, GAMMA=0.15, DELTA=0.15, EPSILON=0.10

// Visual encoding
THETA_GREEN = 0.7
AVG_CORRECT_RATE_YELLOW = 0.5
FREQ_RANK_DARK = 10

// AI Coach quota
FREE_LIFETIME = 5
PRO_DAILY = 30
TIER_RESET_TZ = 'Asia/Seoul'
```

변경 시 cohort A/B + memo 동봉.
