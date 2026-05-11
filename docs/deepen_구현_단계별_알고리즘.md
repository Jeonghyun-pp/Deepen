# Deepen 구현 단계별 핵심 알고리즘
> `deepen_full_ux_flow_with_recap.md`의 22 UX 단계를 **구현 가능한 8개 빌딩 블록**으로 그룹화하고, 각 블록에 필요한 알고리즘·입출력·동작 방식을 정리한 문서.

---

## 전체 구성 요약

UX 22단계는 **사용자가 보는 흐름**이고, 시스템이 실제로 만들어야 하는 것은 그 흐름을 떠받치는 7개의 빌딩 블록이다.

| # | 빌딩 블록                          | UX 매핑              | 핵심 알고리즘                                |
|---|----------------------------------|---------------------|--------------------------------------------|
| 1 | 데이터 기반 (콘텐츠 + 그래프 스키마)    | 1, 2, 3, 4, 5      | 문제→Pattern 분류기, 선행 관계 DAG 빌더, 메타데이터 라벨링 |
| 2 | 채점 엔진 + 학습자 상태               | 11, 12, 17        | 가중 신호 채점, BKT / IRT-Elo 숙련도 갱신     |
| 3 | 선행 개념 결손 진단                  | 8, 15             | Bayesian Network on Prerequisite DAG       |
| 4 | 그래프 시각화                        | 4, 5, 18          | Force-directed layout + 상태 인코딩 함수      |
| 5 | 추천 엔진 (메타데이터 기반 검색·랭킹)   | 9, 19, 20, 22     | 룰 기반 정책 + 패턴 자카드 + 임베딩 cosine + 결손 가중치 |
| 6 | AI 코치 (RAG QA + 풀이 OCR 교정)    | 13, 14            | Context-aware RAG, OCR + 단계 정렬 diff      |
| 7 | 세션 / 모드 오케스트레이션            | 6, 7, 8-A/B/C, 10, 16 | 세션 상태 머신                          |

각 블록은 **독립적으로 구현·테스트·롤아웃 가능**하도록 분리되어 있다. 의존성은 1 → 2 → 3 → 5 순서가 필수이고, 4·6·7은 1·2·3 위에서 병렬로 진행할 수 있다.

> **설계 결정**: Deepen은 **LLM으로 문제를 새로 생성하지 않는다.** 모든 추천 문제는 사전 큐레이션된 기출/문제 풀에서 메타데이터 기반으로 선택된다. 입시 콘텐츠는 정답·해설의 신뢰성이 절대적이라 LLM 생성의 검증 부담이 효용을 넘는다.

> **콜드스타트**: 사전 진단 없이도 동작한다. Phase 2의 `mastery_score`가 없는 초기 상태에서는 Phase 5가 Pattern 메타데이터(빈출도·난이도·정답률) 기준으로만 추천하고, 사용자 데이터가 쌓이면서 점진적으로 개인화된다. 사전 진단은 초기 추천 품질을 높이기 위한 선택적 개선이다 — 아래 부록 참조.

> **Frontier**: Pattern 노드는 Phase 2의 `mastery_score`로부터 `mastered / frontier / locked` 3상태로 파생된다. `mastery_score ≥ τ` → mastered, 모든 prereq가 mastered이고 본인은 아직 → frontier(지금 학습 가능), prereq 중 하나라도 미숙련 → locked. Phase 5의 추천 후보는 원칙적으로 frontier Pattern의 Item에 집중한다. 별도 알고리즘이 아니라 Phase 2 출력에 임계값 τ를 얹은 파생 상태다.

---

## Phase 1. 데이터 기반 (콘텐츠 + 그래프 스키마)

### 핵심 설계 결정: Concept 없음, Pattern만 존재

**Pattern이 두 역할을 동시에 한다.**
- **수평적 역할**: 이 Pattern의 Item들을 풀 수 있는가 (숙련도 추적 단위)
- **수직적 역할**: DAG상 위치로 다른 Pattern의 선행이 됨 (선행 지식 단위)

Pattern의 단위는 **리캡 카드 1장**으로 정의. "2~3분 안에 설명 가능한 하나의 지식 포인트 또는 풀이 유형". 이 단위가 상위 Pattern(수능 출제 유형)부터 하위 Pattern(선행 지식)까지 동일하게 적용된다.

```
Node:
  Pattern {
    id,
    name,
    grade,           // 어느 학년 수준의 지식인가
    signature[],     // 리캡 카드 내용 = 이 Pattern의 핵심 sub-skill 목록
    prereq_ids[],    // DAG 엣지: 이 Pattern의 선행 Pattern들
    items[]          // 이 Pattern에 해당하는 문제들 (비어 있어도 됨)
  }

  Item {
    id,
    source,          // 수능 / 6모 / 9모 / 교과서 / EBS / 자체제작 등 제한 없음
    year?, num?,
    text, solution,
    difficulty, correct_rate?,
    pattern_ids[]    // 태깅된 Pattern들 (여러 개 가능)
  }

Edge:
  Pattern --prereq--> Pattern   // DAG (단방향, 사이클 없음)
  Item    --tagged--> Pattern   // N:M
```

**DAG 예시**:
```
[P_판별식_중근조건, 중3] ──→ [P_접선의_기하학적_의미, 수Ⅱ] ──→ [P_곡선_밖_접선, 수Ⅱ]
[P_일차함수_기울기, 중2]  ──→ [P_접선의_기하학적_의미, 수Ⅱ]
```

P_판별식_중근조건을 보면 → 그 위의 P_접선의_기하학적_의미, P_곡선_밖_접선으로 이어지는 전체 지식 흐름이 보인다. 이것이 UX의 "선행 개념 연결 표시"의 실체.

---

### 매핑되는 UX 단계
1 (서비스 진입), 2 (시험 범위 선택), 3 (그래프 진입), 4 (빈출 시각화), 5 (선행 개념 연결).

### Phase 1의 4개 서브 단계

| 서브 단계 | 하는 일 | 담당 | 실행 빈도 |
|---------|--------|------|---------|
| **1-A** | Pattern 분류 체계 정의 (상위~하위 전체) | 전문가 수작업 | 최초 1회 + 교과 개편 시 |
| **1-B** | Item 수집 + Item→Pattern 태깅 | 전문가 직접 + LLM 초안 보조 | 신규 콘텐츠 추가마다 |
| **1-C** | Pattern→Pattern DAG 구성 | 전문가 + LLM 보조 | 1-A가 바뀔 때만 |
| **1-D** | 통계 라벨 산출 | 자동 집계 | 주기적 갱신 |

---

#### 1-A. Pattern 분류 체계 정의 (수작업, 최초 1회)

전문가가 Pattern 목록과 각 Pattern의 signature를 정의한다. **상위 Pattern(수능 출제 유형)과 하위 Pattern(선행 지식 단위) 모두 이 단계에서 만들어진다.**

- 상위 Pattern: 수능에 실제로 출제되는 유형 → Items가 풍부
- 하위 Pattern: 상위 Pattern의 prereq로만 존재 → Items가 적거나 없어도 무방. DAG 노드 역할만 해도 됨.
- **입력**: 교과 과정 문서, 기출 유형 분석 자료
- **출력**: Pattern 카탈로그 (id, name, grade, signature[]) → DB 영속화

> signature가 핵심. "이 Pattern을 수행하는 데 필요한 sub-skill 순서"를 명시한 것. Phase 5의 자카드 유사도가 이걸 쓴다.

---

#### 1-B. Item 수집 + Item→Pattern 태깅 (전문가 직접, 신규 추가마다)

Item을 만들고 어떤 Pattern(들)에 해당하는지 태깅한다. 소스는 제한 없음.

- **입력**: 문제 원본 (이미지/PDF/텍스트) + 공식 해설 + 1-A의 Pattern 카탈로그
- **동작**: 전문가가 직접 태깅, LLM은 signature 매칭 초안 제안으로 보조
- **출력**: Item 레코드 + `Item→Pattern` 태그. 한 Item이 여러 Pattern에 속할 수 있음 (복합 유형)
- **Items 비어도 됨**: 하위 Pattern은 items[]가 비어 있어도 DAG 노드로 기능함

---

#### 1-C. Pattern→Pattern DAG 구성 (전문가, 1-A 바뀔 때만)

"이 Pattern을 수행하려면 어떤 Pattern이 선행되어야 하는가"를 연결. **진단(Phase 3)의 핵심 입력**.

- **입력**: Pattern 카탈로그 (signature 포함)
- **동작**: signature를 보고 "이 sub-skill들을 수행하려면 어떤 하위 Pattern이 먼저 있어야 하는가"를 연결. LLM이 초안 생성 → 전문가 확인.
- **출력**: `Pattern --prereq--> Pattern` 엣지 집합
- **검증**: 토폴로지 정렬 가능해야 함 (사이클 발견 시 사람이 끊음)

---

#### 1-D. 통계 라벨 산출 (자동 집계, 주기적 갱신)

- **연산**: Pattern 출현 빈도 → `frequency_rank`, Item 정답률 → `avg_correct_rate`, 킬러 여부 → `is_killer`
- **출력**: Pattern·Item 노드의 시각화 라벨 (Phase 4 사용)

---

### 입출력 (Phase 1 전체)
- **입력**: 문제 원본 + 교과 과정 문서
- **출력**: Pattern DAG + Item 풀 + 통계 라벨 → Phase 2~7 전부의 기반
- **병목**: 1-A(Pattern 정의)와 1-C(DAG 구성)가 전문가 작업. 이 품질이 진단 정확도를 직결.

---

## Phase 2. 채점 엔진 + 학습자 상태 업데이트

### 왜 필요한가
입시에서 "맞췄지만 운"·"맞췄지만 시간 초과"·"맞췄지만 힌트 사용"은 진짜 숙련이 아니다. 단순 정답률은 약점을 가린다. 따라서 **신호 통합 채점 + Pattern 단위 숙련도 추적**이 필요.

### 매핑되는 UX 단계
11 (문제 풀이), 12 (채점 3분기), 17 (학습자 상태 업데이트).

### 핵심 알고리즘

#### 2-1. 3분류 채점기 (정답 / 오답 / 정답이지만 헷갈림)
- **방식**: 가중 합산 점수 → 임계값 분류
- **입력 신호**:
  - `correct ∈ {0,1}` (정답 여부)
  - `time_z` (해당 Item 평균 풀이시간 대비 z-score)
  - `hints_used ∈ ℕ`
  - `ai_questions ∈ ℕ`
  - `self_confidence ∈ {확신, 보통, 헷갈림}` (사용자 자가 보고)
- **공식 (예)**:
  ```
  confidence_score =
      w1·correct
    - w2·max(0, time_z)
    - w3·hints_used
    - w4·ai_questions
    - w5·1[self_confidence = 헷갈림]
  ```
- **분류**:
  - `correct=1 ∧ confidence_score ≥ τ_high` → 정답
  - `correct=1 ∧ confidence_score < τ_high` → **정답이지만 헷갈림**
  - `correct=0` → 오답
- **출력**: `{label, confidence_score, signals}` — Phase 3 진단의 evidence로 사용.

#### 2-2. Pattern 숙련도 갱신 (BKT 또는 IRT-Elo)
두 가지 후보 알고리즘. 초기에는 **Elo 변형**으로 시작하고, 데이터가 쌓이면 **BKT**로 교체 권장.

**옵션 A — Elo 변형 (간단, cold-start 강함)**
```
expected = 1 / (1 + 10^((β_pattern - θ_user_pattern) / 400))
θ_user_pattern  ← θ_user_pattern  + K · (label_score - expected)
β_pattern       ← β_pattern       - K · (label_score - expected)
```
- `θ`: 사용자의 해당 Pattern 능력치
- `β`: Pattern 난이도
- `label_score`: 정답=1.0, 헷갈림=0.6, 오답=0.0

**옵션 B — BKT (Bayesian Knowledge Tracing, 4 파라미터)**
- 파라미터: `P(L0)` 사전 숙련, `P(T)` 학습 전이, `P(S)` slip, `P(G)` guess
- 매 시도마다 `P(Lₜ | obs)`를 베이즈 갱신.
- **장점**: slip/guess를 명시적으로 모델링 → "정답이지만 헷갈림"을 자연스럽게 표현.

**입력**: `(user_id, pattern_id, label_score, time, hints)`
**출력**: 갱신된 `Pattern State`(숙련도 0~1, 추정 안정성)

### 입출력 (블록 단위)
- **입력**: 매 풀이 이벤트 `{user_id, item_id, correct, time, hints, ai_questions, self_confidence}`
- **출력**: `Item Attempt State` 행 + 갱신된 `Pattern State` (Concept State는 별도로 존재하지 않음 — Pattern이 곧 지식 단위)

---

## Phase 3. 선행 개념 결손 진단

### 왜 필요한가
Deepen의 **핵심 차별점**. "고2 미분 문제 오답"의 진짜 원인이 "중3 판별식 결손"일 수 있다는 가설을 시스템이 추정해야 한다. 이 추정 없이는 리캡 카드(8-A, 15-A)를 트리거할 근거가 없다.

### 매핑되는 UX 단계
8 (리캡 필요 여부 판단), 15 (선행 결손 진단), 15-A/B 분기.

### 핵심 알고리즘

#### 3-1. Bayesian Network over Pattern DAG
Phase 1-C에서 만든 Pattern→Pattern DAG 위에 베이지안 네트워크를 얹는다. Concept 노드는 없고 **모든 노드가 Pattern**이다.

- **노드**: 각 Pattern의 `mastery ∈ {숙련, 결손}` 잠재 변수
- **엣지**: 선행 관계 (Pattern --prereq--> Pattern DAG)
- **CPT**: `P(현재 Pattern 숙련 | 모든 선행 Pattern 숙련 상태)`
  - 단순화: noisy-AND. 모든 선행 Pattern이 숙련이면 P(현재 숙련)=0.9, 하나라도 결손이면 그에 비례해 떨어짐.
- **관측 변수**: 사용자의 최근 풀이 결과 (Phase 2의 `label`과 `confidence_score`)

#### 3-2. 추론 (Posterior)
오답 또는 헷갈림이 들어올 때마다:
```
P(prereq_pattern_i = 결손 | 최근 N개 evidence)
  = belief propagation 또는 variational approximation
```

- **입력**: 현재 Pattern, 그 선행 Pattern 집합 (DAG 역방향 탐색), 사용자의 최근 N(=20) attempt
- **출력**: 각 선행 Pattern별 결손 확률 `p_i ∈ [0,1]`
- **분기**:
  - `max(p_i) ≥ τ_recap` (예: 0.6) → **15-A 리캡 필요**
  - 그 외 → **15-B 유형 숙련도 부족** (Phase 5의 같은-Pattern 추천 경로)

#### 3-3. 결손 정보의 저장과 활용 분리 (중요)
누적 결손과 리캡은 다른 목적을 가진다. 둘을 혼동하면 사용자 흐름이 깨진다.

| 구분 | 무엇을 저장 | 어디에 영향 |
|-----|-----------|-----------|
| **누적 결손** | 모든 선행 Pattern의 시계열 결손 확률 | Phase 5 추천 시 가중치 + Phase 4 그래프 시각 표시 |
| **현재 리캡 후보** | 현재 Item의 Pattern들의 직접 선행 Pattern ∩ 결손 확률 ≥ τ | 이번 사이클의 리캡 카드만 생성 |

**리캡 카드 범위 규칙:**
- 후보 집합 = `current_item.pattern_ids[].prereq_ids` (현재 문제와 직접 연결된 선행 Pattern만)
- 위 집합에서 `p_i ≥ τ_recap`인 것만 카드화 (1~2개, 최대 3개)
- 리캡 카드 자체가 그 Pattern의 signature를 기반으로 생성됨. Items가 있으면 리캡 퀴즈로 연결.
- 평소 약했지만 이번 문제와 무관한 Pattern은 띄우지 않음 — 흐름을 끊고 부담만 준다.

누적 결손은 Phase 5에서 자동 반영되므로, 다른 유형 풀 때 자연스럽게 해당 Pattern의 Items가 추천 풀에 올라온다.

#### 3-3. Cold-start 처리
초기에는 사용자 데이터가 부족하므로:
- 같은 학년·과목 사용자의 사전분포를 prior로 사용
- AI에게 던진 질문 텍스트를 추가 evidence로 활용 (`AI에게 판별식 관련 질문이 잦음` → 결손 likelihood 상승)

### 입출력 (블록 단위)
- **입력**: 사용자 attempt 이력 + 선행 DAG + 현재 Pattern
- **출력**: `{prereq_concept_id → 결손 확률}` 맵, 리캡 트리거 여부, 추천 리캡 대상

### 대안
구현 부담이 크면 **PFA (Performance Factors Analysis)**의 멀티-스킬 변형으로 대체 가능 (로지스틱 회귀, 학습 쉬움). 정확도는 BN보다 낮지만 cold-start가 빠름.

---

## Phase 4. 그래프 시각화

### 왜 필요한가
UX 4·5·18의 핵심: 사용자가 "공부할 것"을 목록이 아닌 **공간적 지도**로 인지하게 만든다. 시각화는 프론트엔드의 알고리즘적 책임이다.

### 매핑되는 UX 단계
4 (빈출 시각화), 5 (선행 개념 연결 표시), 18 (약점/결손 반영).

### 핵심 알고리즘

#### 4-1. 레이아웃
- **알고리즘**: Force-directed (D3-force, reagraph 내장)
  - Concept은 동심원/계층, Pattern은 Concept 주변, Item은 Pattern 외곽
  - 선행 엣지는 학년 축(상→하)으로 정렬되도록 별도 force 추가
- **입력**: `GraphData {nodes, edges}`
- **출력**: 각 노드의 `(x, y)` 좌표

#### 4-2. 상태 인코딩 함수 (state → 시각 속성)
사양상 명시된 시각 인코딩:
| 상태                      | 시각 속성             |
|--------------------------|---------------------|
| 빈출 개념/유형             | 채도 ↑ (진한 색)      |
| 킬러/준킬러                | 붉은 테두리           |
| 정답률 낮음                | 노랑 표시             |
| 미학습                    | 회색                 |
| 안정적으로 풀이 가능        | 초록                 |
| 반복 오답                  | 경고 아이콘           |
| 결손 의심 선행 노드        | 점선 경계 + 강조 엣지   |

- **알고리즘**: 순수 함수 `encode(node, userState, contentLabels) → VisualAttrs`. 테스트하기 쉬워야 한다.

#### 4-3. 노드 포커스 레이아웃
노드를 클릭하면 3분할 뷰로 전환:
- **캔버스 (중앙)**: 선택된 노드를 화면 중앙으로 이동, 나머지 노드·엣지는 opacity 낮춰 흐릿하게 처리. 선택 노드와 직접 연결된 prereq 엣지만 선명하게 유지.
- **왼쪽 패널**: 해당 Pattern의 선행 Pattern DAG만 따로 렌더링. DAG를 학년 축 기준으로 위→아래(선행→현재) 정렬. 각 노드에 결손 확률 색 인코딩 유지.
- **오른쪽 패널**: 해당 Pattern에 태깅된 Item 목록. 난이도·정답률·풀이 이력(풀어봤음/오답 여부) 표시.

포커스 해제(빈 곳 클릭 또는 ESC) 시 전체 그래프 뷰로 복귀.

#### 4-4. 추천 경로 오버레이
Phase 5의 추천 경로를 그래프 위에 강조 (엣지 굵기·애니메이션).

### 입출력 (블록 단위)
- **입력**: GraphData + UserState (Phase 2,3 결과)
- **출력**: 렌더 가능한 시각 그래프

---

## Phase 5. 추천 엔진 (메타데이터 기반 검색·랭킹)

### 왜 필요한가
사용자가 다음에 무엇을 해야 하는지 시스템이 결정해야 한다 (UX 19). "리캡 vs 유형 반복 vs 응용"의 선택은 Phase 3 진단 결과에 의존한다. **모든 추천 후보는 Phase 1에서 큐레이션된 기존 문제 풀에서 메타데이터 기반으로 선택**한다 — 새로 생성하지 않는다.

### 매핑되는 UX 단계
9 (난이도별 문제 확인), 19 (다음 액션), 20 (유사 문제), 22 (반복 학습 루프).

### 핵심 알고리즘

#### 5-0. 풀이 이력 추적 (UserItemHistory)

Phase 5가 "이전에 푼 것"을 기억하고 오답 노트를 구성하려면 **UserItemHistory** 레코드가 필요하다. Phase 7-3의 오답 원인 태깅(`reason_tags`)도 별도 테이블 없이 여기에 통합한다.

```
UserItemHistory {
  user_id,
  item_id,
  seen_count,          // 누적 풀이 횟수 (재도전 포함)
  last_solved_at,      // 마지막 풀이 시각 → cooling_window 필터에 사용
  result_history[{     // 시도마다 누적
    label,             // 정답 / 오답 / 헷갈림
    reason_tags[],     // 오답 원인 태그 (Phase 7-3이 기록) — 정답 시 빈 배열
    timestamp
  }],
  marked_difficult,    // bool — 사용자가 직접 "어렵게 느낀 문제" 태그
  user_memo?           // 사용자 메모 (AI 코치에게 컨텍스트로 전달)
}
```

**`in_wrong_note`는 별도 필드가 아닌 파생 조건:**
```
진입: result_history에 오답이 1개라도 존재 → 즉시 오답 노트
탈출: 그 이후 정답이 3회 연속 → 복구 완료, 오답 노트 제거

in_wrong_note =
  result_history에 오답이 존재
  AND 마지막 오답 이후 연속 정답 횟수 < 3
```

| 필드 | 사용 위치 |
|-----|---------|
| `last_solved_at` | 5-2 1차 필터 `not recently_solved` — `last_solved_at < now - cooling_window` |
| `in_wrong_note` (파생) | 오답복구 모드 강제 후보 풀 |
| `result_history[].reason_tags` | UI 오답 노트 라벨, AI 코치 컨텍스트, Phase 4 "반복 오답" 아이콘 |
| `marked_difficult` | 5-2 `weakness_align` 보조 신호 |
| `seen_count` | Phase 4 그래프 "풀어봤음" 표시 기준 |

탈출 기준 3회는 조정 가능한 파라미터. 줄이면 오답 노트가 빨리 비워지고, 늘리면 더 오래 잔류한다.

---

#### 5-1. 다음 액션 정책 (Policy)
초기에는 **룰 기반 의사결정 트리**, 데이터 충분 시 **Multi-Armed Bandit** 또는 강화학습으로 진화.

```
if Phase3.recap_needed:
    추천 = [선행 리캡 카드(현재 문제 한정), 리캡 퀴즈, 원래 문제 재도전]
elif PatternState.숙련도 < 0.4:
    추천 = [같은 Pattern 쉬움 ×2, 중간 ×1]
elif 0.4 ≤ 숙련도 < 0.7:
    추천 = [같은 Pattern 중간 ×1, 유사 Pattern 중간 ×1]
else:
    추천 = [응용 ×1, 킬러 후보 ×1]
```

- **입력**: 현재 사용자 상태 (Pattern·Concept State + Phase 3 진단) + **현재 모드**
- **출력**: 정렬된 액션 목록 (각 액션은 type ∈ {recap, quiz, item, similar} — 모두 기존 풀에서 선택)

#### 5-1-B. 모드별 추천 정책 차이

5종 모드는 Phase 7의 상태 머신이 제어하지만, **Phase 5의 추천 로직도 모드에 따라 달라진다.** 모드는 세 축으로 Phase 5에 영향을 준다: (1) recap 허용 여부, (2) 후보 풀 범위, (3) 랭킹 가중치 조정.

| 모드 | recap 허용 | 후보 풀 | 랭킹 특이사항 |
|-----|----------|--------|------------|
| **연습** | O | 전체 풀, cooling_window 적용 | deficit_boost 활성, 난이도 유연 |
| **실전** | X | 전체 풀, cooling_window 적용 | weakness_align ↑, 목표 난이도 고정 (`±0.5`), recap 경로 차단 |
| **챌린지** | X | 같은 Pattern 한정 | 난이도 점진 상승, 연속 정답 카운터 유지 |
| **오답복구** | O | `in_wrong_note=true` 우선 + 유사 문제 | 오답 빈도 높은 Item score ↑ |
| **리캡 후 재도전** | — | 원래 item_id 강제 (Phase 7 상태가 보유) | 새 Item 선택 없음 — Phase 5는 원래 item 반환만 |

**모드별 동작 상세:**

- **연습**: 기본 경로. Phase 3 진단에 따라 recap → 퀴즈 → 재도전 흐름이 자연스럽게 흐른다. deficit_boost 온전히 작동.
- **실전**: recap 완전 차단. 오답 시에도 바로 일괄 채점 화면으로. 난이도 필터를 `target_difficulty ± 0.5`로 좁혀 실전 환경을 유지. 시스템이 "약점 보완" 유도를 숨기고 있어야 하므로 deficit_boost는 백그라운드에서만 가중치로 작동하고 UI 이유 노출은 없음.
- **챌린지**: `pattern_id = 현재 Pattern` 고정, `difficulty ≥ 현재 숙련도 기반 임계` 추가 조건. N개 연속 정답 시 다음 단계 Pattern 이동 또는 세션 종료. 틀리면 same-Pattern 더 쉬운 문제로 후퇴.
- **오답복구**: 1차 필터에서 `in_wrong_note=true` 조건 양방향 전환. 오답 Item 먼저 추천 + 그 Item의 similar 2~3개를 연달아 붙여 유사 반복 연습. 복구 판정(3회 연속 정답) 시 `in_wrong_note=false`.
- **리캡 후 재도전**: 리캡 시퀀스가 끝나면 Phase 7이 원래 item_id를 상태에 들고 있다가 강제 재도전시킨다. Phase 5는 이때 Item을 새로 선택하지 않음 — 세션 상태가 item_id를 이미 전달. 재도전 결과에 따라 Phase 3이 recap 효과를 재진단.

#### 5-2. 메타데이터 기반 문제 검색·랭킹
유사 문제 추천과 난이도별 추천 모두 동일한 검색 엔진을 사용. Phase 1에서 부여한 **Item 메타데이터**(`pattern_id`, `pattern_signature`, `difficulty`, `requires_prereq`, `frequency_rank`, `avg_correct_rate`, `is_killer`)를 1차 필터로, 임베딩 유사도를 2차 랭킹으로 사용.

**1차 필터 (메타데이터)**
```
candidates = Items.filter(
    pattern_id ∈ target_patterns,
    difficulty ∈ target_band,
    not user.recently_solved,
    not user.in_wrong_note   # 오답 복구 모드일 때는 반대로
)
```

**2차 랭킹 (하이브리드 점수)**
```
score(item) =
      α·jaccard(item.pattern_signature, base.pattern_signature)
    + β·cosine(emb(item.text), emb(base.text))
    + γ·overlap(item.requires_prereq, base.requires_prereq)
    + δ·weakness_alignment(item, user)        # 사용자가 약한 Concept을 건드리는가
    + ε·deficit_boost(item, user)             # 누적 결손 Concept 가중치 (3-3 참조)
```

- **인덱스**: 메타데이터는 관계형 DB 인덱스, 임베딩은 벡터 DB(pgvector/Qdrant). `pattern_signature`는 set 컬럼.
- `deficit_boost`: Phase 3에서 누적된 결손 확률을 가져와 "그 결손 Pattern을 prereq로 갖는 Item"의 점수를 올린다. 이렇게 누적 결손이 다음 학습 흐름에 자연스럽게 녹아들어간다 (사용자에게 "당신은 X도 약합니다"라고 직접 말하지 않고도).

**입력**: 기준 Item(또는 target Pattern), 사용자 상태, 누적 결손 맵
**출력**: 점수 정렬 Item 목록 top-K

#### 5-3. 학습 경로 생성
선행 결손형 추천일 때 "리캡 → 미니 퀴즈 → 원래 문제"의 시퀀스를 만들어야 함.
- **알고리즘**: Phase 3-3의 **현재 리캡 후보 Pattern 집합** (방금 푼 Item과 직접 관련된 선행만)을 토폴로지 정렬 → 우선순위(결손 확률 × frequency_rank) → 시퀀스화.
- 리캡 퀴즈는 기존 문제 풀에서 `pattern_id = {target_pattern}`이고 난이도 낮은 Item을 1~2개 추출. Items가 없으면 리캡 카드만 제공하고 퀴즈는 생략.

### 입출력 (블록 단위)
- **입력**: UserState (Pattern State + 누적 결손 Pattern 확률 맵) + Pattern DAG + 모드
- **출력**: 정렬된 추천 액션 시퀀스 (모두 기존 Item 풀에서 선택)

---

## Phase 6. AI 코치 (RAG QA + 풀이 OCR 교정)

### 왜 필요한가
사양상 AI는 **현재 문제 + 연결 개념 + 선행 개념 + 사용자 풀이 결과를 모두 알고 있는 문제풀이 코치**여야 한다 (UX 13). 일반 챗봇은 부족하다. 또한 사용자가 종이/태블릿에 쓴 풀이를 분석할 수 있어야 한다 (UX 14).

이 블록은 **deepen 코드에 이미 부분적으로 존재**하는 `lib/agent/runner.ts` (tool-use 루프)를 입시 코치 도메인으로 특화하는 작업.

### 매핑되는 UX 단계
13 (AI 해설/QA), 14 (풀이과정 교정).

### 핵심 알고리즘

#### 6-1. Context-Aware RAG 빌더
- **입력**: 현재 Item, 사용자 질문, 사용자의 Phase 2/3 상태
- **컨텍스트 조립**:
  1. Item 본문 + 공식 해설
  2. 연결된 Pattern signature와 그 의미
  3. 선행 Concept 카드들 (Phase 3에서 의심되는 것 우선)
  4. 사용자의 최근 5개 attempt 요약 (정답/오답/헷갈림 + 풀이시간 + 힌트)
  5. (선택) 풀이과정 OCR 결과
- **출력**: structured prompt → LLM
- **포맷**: Anthropic XML 태그 권장 (`<problem>`, `<user_history>`, `<prereq_chain>` 등) — 모델이 컨텍스트 부분을 구분하기 쉬움.

#### 6-2. Tool-use 루프
이미 `lib/agent/runner.ts`의 패턴을 그대로 사용. 입시 도메인 도구만 새로 정의:
- `lookup_pattern(pattern_id)` → Pattern signature + 대표 풀이
- `lookup_prereq(concept_id)` → 선행 개념 카드
- `find_similar_items(item_id, k)` → Phase 5-2 호출
- `generate_variant_item(pattern_id)` → Phase 7 호출
- `start_recap(concept_id)` → Phase 8의 세션 머신에 이벤트 전달

#### 6-3. 풀이 OCR 교정
- **OCR**: Mathpix API 또는 GPT-4V/Claude Vision (수식 인식 정확도가 결정적)
- **단계 분할 알고리즘**:
  1. OCR 결과를 줄 단위로 분리
  2. LLM에게 "각 줄을 풀이 단계로 라벨" 요청 (식 변형 / 조건 도입 / 결론 등)
  3. 공식 해설의 단계와 LCS(Longest Common Subsequence) 정렬
  4. 정렬되지 않은 줄 또는 LLM이 "오류 가능성 ≥ τ"로 표시한 줄을 강조
- **출력**: `[{step_idx, user_line, canonical_step?, error_kind?, suggestion?}]`

### 입출력 (블록 단위)
- **입력**: 사용자 질문(텍스트) 또는 풀이 이미지 + 컨텍스트
- **출력**: 스트리밍 답변 + (선택) 단계별 교정 마크업

## Phase 7. 세션 / 모드 오케스트레이션

### 왜 필요한가
UX는 5종 모드(연습/실전/챌린지/오답복구/리캡 후 재도전)와 분기점(8-A/B/C, 12-A/B/C, 15-A/B)이 얽혀 있다. 이 흐름을 명시적인 **상태 머신**으로 만들지 않으면 코드가 if-문 늪에 빠진다.

### 매핑되는 UX 단계
6, 7, 8, 8-A, 8-B, 8-C, 10, 16.

### 핵심 알고리즘

#### 7-1. 세션 상태 머신
```
states:
  IDLE → NODE_SELECTED → DETAIL_VIEWED
       → (RECAP_CARD → RECAP_QUIZ → RECAP_QUIZ_RESULT)?
       → MODE_SELECTED
       → SOLVING
       → GRADED → (FOLLOWUP_RECAP | FOLLOWUP_PRACTICE | NEXT)
       → IDLE
```

- **이벤트**: `select_node`, `start_recap`, `submit_quiz`, `choose_mode`, `submit_item`, `request_ai`, `request_similar`
- **전이 규칙**: Phase 3·5의 출력에 의해 결정 (예: GRADED → Phase3 호출 → recap 트리거 시 FOLLOWUP_RECAP)
- **구현**: XState 같은 라이브러리 또는 직접 작성한 reducer.

#### 7-2. 모드별 정책 (5종)
모드는 채점기·UI·타이머의 파라미터 다발로 인코딩.
| 모드            | 힌트 | 시간 제한 | AI 질문 | 채점 후 흐름                |
|---------------|-----|---------|--------|------------------------|
| 연습           | O   | 약함      | O      | 일반 채점·해설            |
| 실전           | X   | 강함      | X      | 일괄 채점·해설            |
| 챌린지          | X   | 강함      | X      | 점수·정답률·속도 누적      |
| 오답 복구       | O   | 약함      | O      | 유사 문제 강제 추가         |
| 리캡 후 재도전   | O   | 약함      | O      | 결손 복구 여부 재진단        |

#### 7-3. 오답 원인 태깅 (UX 16)
GRADED 상태에서 오답인 경우, `reason_tags[]`를 생성해 `UserItemHistory.result_history[-1].reason_tags`에 바로 기록한다. 별도 오답 노트 테이블은 없음 — "오답 노트"는 `in_wrong_note` 파생 조건(5-0 참조)으로 쿼리하는 뷰.

**태깅 방식:**
- 룰 기반 (즉시): `time_z > 2` → "풀이 시간 초과" / `hints_used > 0` → "힌트 의존" / Phase 3 `max(p_i) ≥ τ` → "이전 학년 개념 결손"
- AI 분류 (비동기): 룰로 잡히지 않는 나머지 → AI 코치가 풀이 맥락 보고 분류 (개념 오답 / 유형 인식 실패 / 계산 실수 / 조건 해석 오류 / 그래프 해석 오류)

- **입력**: GRADED 이벤트 + Phase 2·3 출력
- **출력**: `reason_tags[]` → `UserItemHistory.result_history[-1]`에 병합 기록

### 입출력 (블록 단위)
- **입력**: 사용자 이벤트 스트림
- **출력**: UI 화면 전이 + 다른 Phase 호출

---

## 의존성 & 구현 순서 권장

```
Phase 1 (데이터 기반: 콘텐츠 풀 + 메타데이터)
  ├→ Phase 2 (채점·숙련도)
  │     ├→ Phase 3 (선행 결손 진단 + 누적 결손 저장)
  │     │     └→ Phase 5 (메타데이터 기반 추천)
  │     │           └→ Phase 7 (오케스트레이션)
  │     └→ Phase 4 (시각화)  ← Phase 3 결과도 사용
  └→ Phase 6 (AI 코치)        ← Phase 1·2·3 컨텍스트 사용
```

**MVP 권장 순서**:
1. Phase 1 (소규모 — 한 단원 분량의 그래프와 100~300개 큐레이션 Item)
2. Phase 2 (Elo 변형으로 시작)
3. Phase 4 (룰 기반 시각 인코딩)
4. Phase 7 기본 상태 머신 + Phase 5 룰 기반 추천 (메타데이터 1차 필터만)
5. Phase 6 (RAG QA만; OCR은 별도 스프린트)
6. Phase 3 (BN; 데이터가 어느 정도 쌓인 뒤)
7. Phase 5 고도화 (임베딩 랭킹 + 결손 가중치 부스트)

**Phase 1의 콘텐츠 큐레이션이 사실상 가장 큰 비용**이다. LLM 생성을 배제했으므로 추천 품질은 풀의 다양성과 메타데이터 정확도에 직접 의존한다. 한 단원당 패턴별로 충분한 Item이 있어야 추천 엔진이 의미 있는 다양성을 보장할 수 있다.

각 Phase는 단위 테스트가 가능하도록 입출력 계약을 먼저 고정한 뒤 내부 구현을 진행하는 것을 권장.

---

## 부록. 사전 진단 (Pre-test Diagnostic) — 선택적 도입

> 콜드스타트 상태에서도 시스템은 메타데이터 기반 추천으로 동작한다. 사전 진단은 초기 추천 품질을 높이기 위한 옵션이며, 데이터가 어느 정도 쌓인 뒤 도입해도 무방하다.

### 목적
최초 진입 사용자의 Pattern 숙련도를 최소 문제 수로 빠르게 추정해 Phase 2의 `mastery_score` 초기값을 세팅한다. 없으면 모든 Pattern이 `mastery_score = prior`(사전 평균)로 시작한다.

### 알고리즘: Binary Search on Pattern DAG

DAG의 선수관계를 활용해 문제 1개의 결과로 여러 Pattern 상태를 동시에 추론한다.

```
전파 규칙 1 (상향 — 맞혔을 때)
  Pattern B를 맞혔다 → B의 모든 prereq Pattern도 숙련으로 추론

전파 규칙 2 (하향 — 틀렸을 때)
  Pattern A를 틀렸다 → A를 prereq로 갖는 Pattern들도 미숙련으로 추론
```

```
1. 위상 정렬로 각 Pattern의 depth 계산
2. uncertain 상태 Pattern 중 정보량 최대 노드 선택:
   argmax [ |ancestors(v)| + |descendants(v)| ]
   → 하나 테스트했을 때 가장 많은 Pattern 상태를 확정할 수 있는 것
3. 해당 Pattern의 Item 출제 (난이도 중간)
4. 결과에 따라 전파:
   - 맞음: 해당 Pattern + 모든 ancestors → mastery_score 높게 초기화
   - 틀림: 해당 Pattern + 모든 descendants → mastery_score 낮게 초기화
5. uncertain Pattern이 남아 있으면 2로 반복
6. 문제 수 K(예: 10) 도달 또는 uncertain Pattern 없으면 종료
```

- **입력**: Pattern DAG, 사용자 응답
- **출력**: Pattern별 초기 `mastery_score` → Phase 2에 전달
- **구현 시점**: Phase 2가 안정된 뒤 추가. 초기 MVP에서는 생략 가능.
