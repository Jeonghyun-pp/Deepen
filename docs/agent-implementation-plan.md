# Deepy Agent — 구현 계획

관련 문서:
- 원본 설계: `docs/agent-architecture.md`
- 피드백 리뷰: `docs/agent-architecture-review.md`
- 구현 가이드: `docs/agent-implementation-guide.md`

---

## 반영된 결정사항 요약

구현 전체에 걸쳐 다음 결정이 반영됨:

| # | 결정 | 반영 위치 |
|---|---|---|
| 1 | Batch Approval — 같은 턴의 모든 approval tool call을 한 카드로, 개별 체크박스 | Step 5 (approval.ts) + Step 8 (ApprovalCard) |
| 2 | 컨텍스트 압축 — 질문 기반 키워드 매칭 + 1-hop 이웃, placeholder로 시작 | Step 4 (prompt.ts) |
| 3 | analyze_paper — 데이터 수집 tool로, LLM-in-LLM 제거 | Step 6 (analyze-paper.ts) |
| 4 | 대화 히스토리 — 중요도 기반(type별) + Sliding Window + 대화 요약 노트화 | Step 5 (history.ts) + Step 4 (프롬프트 지침) |
| 5 | LLM Provider — OpenAI 단일 타겟 | Step 2 (openai.ts 확장) |
| 미결 | 키워드 추출 방식 (의논2) | Step 4에서 placeholder (`string.includes`) |
| 미결 | 1-hop 상한선 (의논3) | Step 4에서 placeholder (15개 고정) |

---

## 구현 순서

### Step 1: 타입 + Tool 인터페이스 정의

**만들 파일:**
- `lib/agent/types.ts`
- `lib/agent/tools/types.ts`

**내용:**
- `Message`, `ToolCall`, `AgentEvent`, `ApprovalItem` 타입
- `ToolDefinition`, `ToolContext`, `ToolResult` 인터페이스
- `ToolResult`에 `summary` 필드 포함 (결정4: 히스토리 정리용)
- `AgentEvent`에 `batch_approval` 타입 포함 (결정1)

**의존성:** 없음. 다른 모든 Step의 기반.

**검증:** TypeScript 컴파일 통과.

---

### Step 2: OpenAI tool use 확장

**수정할 파일:**
- `lib/clients/openai.ts` — `callOpenAIWithTools()` 함수 추가

**내용:**
- 기존 `callOpenAI` (structured output용) 유지
- 새로 `callOpenAIWithTools` 추가: messages + tools → LLMWithToolsResult
- `toOpenAITools()`: ToolDefinition → OpenAI function schema 변환
- `toOpenAIMessages()`: Message[] → OpenAI ChatCompletionMessage[] 변환
- finish_reason 파싱: "tool_calls" → toolCalls 배열, "stop" → text

**결정5 반영:** OpenAI만 구현. Claude용 `toClaudeTools`는 만들지 않음.

**의존성:** Step 1 (타입)

**검증:** 간단한 tool 하나로 OpenAI API 호출 테스트. tool call이 올바르게 파싱되는지 확인.

---

### Step 3: Tool Registry + 기본 Tool 구현

**만들 파일:**
- `lib/agent/registry.ts`
- `lib/agent/tools/query-graph.ts`
- `lib/agent/tools/search-openalex.ts`
- `lib/agent/tools/search-semantic-scholar.ts`
- `lib/agent/tools/add-node.ts`
- `lib/agent/tools/add-edge.ts`
- `lib/agent/tools/focus-node.ts`

**내용:**
- `registry.ts`: Tool 등록/조회. `getAllTools()`, `registry.get(name)`
- `query_graph`: search_nodes, get_neighbors, get_stats (기존 그래프 데이터 순회)
- `search_papers_openalex`: 기존 `lib/clients/openalex.ts`의 `searchPapers()` 래핑
- `search_papers_semantic_scholar`: 기존 `lib/clients/semantic-scholar.ts` 래핑
- `add_node`: requiresApproval=true. 노드 추가 후 uiAction으로 포커스
- `add_edge`: requiresApproval=true
- `focus_node`: requiresApproval=false. uiAction 반환

**모든 tool의 ToolResult에 `summary` 포함** (결정4: 히스토리 정리용)

**의존성:** Step 1 (타입)

**검증:** 각 tool을 직접 호출해서 ToolResult가 올바르게 반환되는지 단위 테스트.

---

### Step 4: 시스템 프롬프트 빌더

**만들 파일:**
- `lib/agent/prompt.ts`

**내용:**
- `buildSystemPrompt(graphData, userQuery)` — **결정2 반영**: userQuery를 파라미터로 받음
- 키워드 추출: `extractKeywords()` — **의논2 placeholder**: `string.includes()` 기반
- 관련 노드 검색 → 1-hop 이웃 확장 — **의논3 placeholder**: MAX_NEIGHBORS=15, edge weight 정렬
- 전체 통계 (항상 포함)
- 페르소나 + 행동 원칙 + **대화 요약 노트화 지침** (결정4: "대화가 끝나면 핵심 내용을 메모 노드로 저장할지 제안하세요")

**의존성:** Step 1 (타입), Step 3 (query_graph 로직 참조)

**검증:** 샘플 데이터 + 테스트 질문으로 프롬프트 생성, 관련 노드만 포함되는지 확인.

---

### Step 5: 히스토리 관리 + Batch Approval + Agent Runner

**만들 파일:**
- `lib/agent/history.ts`
- `lib/agent/approval.ts`
- `lib/agent/runner.ts`

#### history.ts — 결정4 반영

- `compactHistory(messages)`:
  - 1단계: type 기반 정리 (tool_result → summary로 교체, tool_start/approval/ui_action/error → 삭제)
  - 2단계: Sliding Window (총 토큰 초과 시 오래된 턴부터 제거)
- 토큰 추산: `content.length * 0.4` (placeholder, 추후 tiktoken 교체)

#### approval.ts — 결정1 반영

- 승인 대기 큐 (Map<callId, resolve function>)
- `waitForBatchApproval(callId)`: Promise 반환, approve 엔드포인트에서 resolve
- `resolveApproval(callId, response)`: 대기 중인 Promise resolve

#### runner.ts — 모든 결정 통합

핵심 루프:
1. `buildSystemPrompt(graphData, userQuery)` — 결정2
2. `compactHistory(messages)` — 결정4
3. `callOpenAIWithTools()` — 결정5
4. tool call 분류: autoExecute vs needsApproval
5. autoExecute → 바로 실행
6. needsApproval → **한 카드로 묶어서** batch_approval 이벤트 → `waitForBatchApproval` — 결정1
7. 승인된 것만 실행, 거부된 것은 "거부됨"으로 LLM에 전달 — 결정1
8. 매 루프 끝에 `compactHistory()` — 결정4
9. 최대 10회 반복

**의존성:** Step 1~4 전부

**검증:**
- 단순 시나리오: "내 그래프에 논문 몇 개 있어?" → query_graph → 텍스트 답변 (tool 1회)
- 복합 시나리오: "Transformer 논문 검색해서 추가해줘" → search → add_node → 승인 → 답변

---

### Step 6: analyze_paper Tool

**만들 파일:**
- `lib/agent/tools/analyze-paper.ts`

**결정3 반영:**
- LLM 호출 없음
- 논문 데이터 + 이웃 노드(citations, concepts, memos) + 인용 관계를 모아서 반환
- description에 "이 데이터를 바탕으로 6-Layer 분석을 직접 생성하세요" 명시
- 에이전트(LLM)가 반환된 데이터를 보고 직접 분석 텍스트 생성

**의존성:** Step 1, Step 3 (registry에 등록)

**검증:** "Attention Is All You Need 분석해줘" → analyze_paper → 에이전트가 6-Layer 분석 생성.

---

### Step 7: API 라우트

**만들 파일:**
- `app/api/agent/chat/route.ts`
- `app/api/agent/approve/route.ts`

#### chat/route.ts
- POST 수신 → `runAgent()` 호출 → AgentEvent를 SSE로 스트리밍
- graphData를 요청 body에서 받음 (프로토타입: 클라이언트가 전체 그래프 전송)
- ToolContext 생성: setGraphData는 SSE의 ui_action으로 클라이언트에 전달

#### approve/route.ts
- POST 수신 → `resolveApproval(callId, { approvedIds, rejectedIds })` 호출
- runner의 `waitForBatchApproval`이 이걸 받아서 루프 재개

**의존성:** Step 5 (runner, approval)

**검증:** curl 또는 Postman으로 SSE 스트림 확인. 메시지 전송 → tool call → 답변 흐름 확인.

---

### Step 8: 프론트엔드 — useAgent hook + 채팅 UI

**만들 파일:**
- `app/graph/_hooks/useAgent.ts`
- `app/graph/_components/ChatPanel.tsx`
- `app/graph/_components/ApprovalCard.tsx`

**수정할 파일:**
- `app/graph/_components/RightPanel.tsx` — 기존 Q&A 섹션을 ChatPanel로 교체
- `app/graph/_components/GraphShell.tsx` — useAgent hook 연결

#### useAgent.ts
- `sendMessage(text)`: POST /api/agent/chat → SSE 스트림 읽기 → 메시지/승인 상태 업데이트
- `respondApproval(callId, approvedIds, rejectedIds)`: POST /api/agent/approve
- 상태: messages, isLoading, pendingApproval

#### ChatPanel.tsx
- 메시지 목록 렌더링 (user/assistant 구분)
- tool_start → "검색 중..." 로딩 표시
- 입력창 + 전송 버튼

#### ApprovalCard.tsx — 결정1 반영
- 체크박스 목록 (각 tool call의 preview 표시)
- "선택 승인" / "전체 거부" 버튼
- 기본 상태: 전체 선택

**의존성:** Step 7 (API 라우트)

**검증:** 실제 UI에서 대화 → tool 호출 → 승인 카드 → 답변 전체 흐름 동작 확인.

---

### Step 9: 통합 테스트 + 프롬프트 튜닝

**시나리오별 테스트:**

| 시나리오 | 검증 포인트 |
|---|---|
| "내 그래프에 뭐 있어?" | query_graph → 통계 답변 |
| "Transformer 관련 논문 찾아줘" | search_papers → 결과 답변 |
| "DDPM 논문 추가해줘" | search → add_node → 승인 카드 → 승인 → 포커스 이동 |
| "논문 3개 추가해줘" | add_node ×3 → **Batch 승인 카드 1개** (결정1) |
| "Batch에서 2번째만 거부" | 1,3번 실행 + 2번 거부 → LLM에 알림 (결정1) |
| "Attention Is All You Need 분석해줘" | analyze_paper(데이터 수집) → 에이전트가 6-Layer 직접 생성 (결정3) |
| "Diffusion 모델 설명해줘" | 시스템 프롬프트에 Diffusion 관련 노드만 포함되는지 확인 (결정2) |
| 10턴 이상 대화 | 히스토리 정리 동작, 컨텍스트 초과 안 터지는지 확인 (결정4) |
| 대화 종료 | 에이전트가 메모 노드 저장 제안하는지 확인 (결정4) |

**프롬프트 튜닝:**
- 시스템 프롬프트의 행동 원칙 조정
- tool description 개선 (LLM이 적절한 tool을 선택하도록)
- 6-Layer 분석 품질 확인 및 지침 보강
- 노트화 제안 타이밍/품질 확인

---

## 구현 순서 요약

```
Step 1  타입 정의
  │
  ├──→ Step 2  OpenAI tool use 확장
  │
  ├──→ Step 3  Tool Registry + 기본 Tool 7개
  │       │
  │       ├──→ Step 4  시스템 프롬프트 빌더
  │       │       │
  │       │       └──→ Step 5  히스토리 + Approval + Runner
  │       │               │
  │       │               └──→ Step 6  analyze_paper Tool
  │       │                       │
  │       │                       └──→ Step 7  API 라우트
  │       │                               │
  │       │                               └──→ Step 8  프론트엔드 UI
  │       │                                       │
  │       │                                       └──→ Step 9  통합 테스트
  │       │
  │       └── (Step 2, 3은 병렬 가능)
  │
  └── Step 2와 Step 3은 Step 1만 있으면 독립 진행 가능
```

**병렬 가능한 작업:**
- Step 2 (OpenAI 확장)와 Step 3 (Tool 구현)은 동시 진행 가능
- Step 8 (프론트)의 ChatPanel 마크업은 Step 7 전에 미리 만들어둘 수 있음

---

## placeholder 교체 시점

구현 완료 후, 의논 2·3이 확정되면 교체할 지점:

| placeholder | 파일 | 함수 | 교체 내용 |
|---|---|---|---|
| 키워드 추출 | `lib/agent/prompt.ts` | `extractKeywords()` | LLM 기반 / 사전 인덱싱 / 규칙 기반 중 확정된 방식 |
| 1-hop 상한선 | `lib/agent/prompt.ts` | `MAX_NEIGHBORS = 15` | 옵시디언 연구 후 확정된 수치 + 정렬 기준 |
| 토큰 카운팅 | `lib/agent/history.ts` | `TOKENS_PER_CHAR = 0.4` | tiktoken 등 정확한 토크나이저 |
| 노트화 트리거 | `lib/agent/prompt.ts` | 시스템 프롬프트 지침 | 명시적 트리거 로직 (대화 종료 감지) |
