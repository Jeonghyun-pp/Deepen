# Deepy Agent Architecture

Research Copilot 에이전트의 전체 설계 문서.
사용자의 지식 그래프를 컨텍스트로 활용하며, 내부(그래프) + 외부(논문 DB, 웹) 정보를 넘나들며 연구를 돕는 에이전트.

---

## 1. 에이전트 전체 구조

### 1.1 역할 정의

| 항목 | 내용 |
|---|---|
| 페르소나 | Research Copilot — 논문 탐색, 분석, 지식 정리를 돕는 연구 보조 |
| 컨텍스트 범위 | 사용자의 전체 지식 그래프 (노드 수 증가 시 요약/필터링으로 조절) |
| 자율성 수준 | Read는 자율, Write는 반드시 사용자 승인 후 실행 |
| LLM | 오픈소스 모델 기반 (Claude/GPT도 프로바이더로 전환 가능) |

### 1.2 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React)                                           │
│                                                             │
│  RightPanel — Chat UI                                       │
│    ├── 메시지 스트림 (text, sources, tool 상태)               │
│    ├── 승인 카드 (write tool 호출 시)                         │
│    └── 사용자 입력                                           │
│         │                                                   │
│         ▼ POST + SSE                                        │
├─────────────────────────────────────────────────────────────┤
│  API Layer                                                  │
│                                                             │
│  POST /api/agent/chat     ── 메시지 전송, SSE 스트림 응답     │
│  POST /api/agent/approve  ── 승인/거부 수신                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Agent Core                                                 │
│                                                             │
│  AgentRunner (lib/agent/runner.ts)                          │
│    │                                                        │
│    ├── System Prompt Builder                                │
│    │     └── 그래프 요약 + 페르소나 + tool 사용 지침           │
│    │                                                        │
│    ├── LLM Client (tool use 지원)                            │
│    │     ├── Claude (Anthropic SDK)                          │
│    │     ├── OpenAI (OpenAI SDK)                             │
│    │     └── Open-source (Ollama / vLLM 등)                  │
│    │                                                        │
│    ├── Tool Registry                                        │
│    │     ├── 정보 수집 tools (read-only)                     │
│    │     ├── 그래프 수정 tools (requires approval)            │
│    │     ├── 분석/생성 tools                                 │
│    │     └── UI 제어 tools                                   │
│    │                                                        │
│    └── Approval Manager                                     │
│          └── write tool 감지 → 프론트에 승인 요청 → 대기      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  External Services                                          │
│                                                             │
│  OpenAlex API ── 논문 검색/메타데이터                         │
│  Semantic Scholar API ── 논문 검색/TLDR/영향력 인용/임베딩     │
│  Web Search API (Tavily / Brave) ── 일반 웹 정보              │
│  PDF Parser (GROBID / PyMuPDF) ── 업로드 논문 텍스트 추출     │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 파일 구조

```
lib/agent/
├── runner.ts                  # Agent loop (핵심 루프)
├── registry.ts                # Tool 등록 + LLM schema 변환
├── types.ts                   # AgentEvent, Message 등 공통 타입
├── prompt.ts                  # System prompt 빌더
└── tools/
    ├── types.ts               # ToolDefinition, ToolContext, ToolResult
    ├── query-graph.ts         # 그래프 조회
    ├── search-openalex.ts     # OpenAlex 논문 검색
    ├── search-semantic-scholar.ts  # S2 논문 검색
    ├── get-paper-details.ts   # 논문 상세 + 인용 관계
    ├── web-search.ts          # 웹 검색
    ├── parse-pdf.ts           # PDF 텍스트 추출
    ├── add-node.ts            # 노드 추가 (승인)
    ├── add-edge.ts            # 엣지 추가 (승인)
    ├── remove-node.ts         # 노드 삭제 (승인)
    ├── remove-edge.ts         # 엣지 삭제 (승인)
    ├── analyze-paper.ts       # 6-Layer 분석 생성
    ├── generate-roadmap.ts    # 학습 로드맵 생성
    └── focus-node.ts          # UI 노드 포커스

lib/clients/
├── llm.ts                     # LLM 공통 인터페이스 (tool use 확장)
├── claude.ts                  # Claude tool use 구현
├── openai.ts                  # OpenAI tool use 구현
├── openalex.ts                # 기존 유지
└── semantic-scholar.ts        # 새로 추가

app/api/agent/
├── chat/route.ts              # SSE 스트리밍 엔드포인트
└── approve/route.ts           # 승인/거부 엔드포인트

app/graph/_hooks/
├── useGraphData.ts            # 기존 유지
└── useAgent.ts                # 에이전트 통신 hook
```

---

## 2. 개별 Tool 정의

### 2.1 정보 수집 (Read-only)

#### `query_graph` — 지식 그래프 조회

사용자의 그래프에서 노드, 엣지, 경로, 통계를 조회한다.

```
Parameters:
  action*     : "search_nodes" | "get_neighbors" | "find_path" | "get_stats"
  query       : string        — 검색어 (search_nodes용)
  node_id     : string        — 기준 노드 ID (get_neighbors, find_path용)
  target_id   : string        — 도착 노드 ID (find_path용)
  node_type   : NodeType      — 타입 필터
  limit       : number        — 최대 결과 수 (기본 10)

Returns:
  search_nodes  → GraphNode[]
  get_neighbors → { node: GraphNode, edge: GraphEdge }[]
  find_path     → { path: GraphNode[], edges: GraphEdge[] }
  get_stats     → { totalNodes, byType, totalEdges, topConnected }

Approval: 불필요
```

#### `search_papers_openalex` — OpenAlex 논문 검색

OpenAlex API로 학술 논문을 검색한다. 제목, 초록, 저자, 인용 수, PDF URL 반환.

```
Parameters:
  query*      : string        — 검색어
  year_from   : number        — 시작 연도
  year_to     : number        — 종료 연도
  sort        : string        — "relevance" | "citations" | "year"
  max_results : number        — 최대 결과 수 (기본 10)

Returns:
  Paper[] — { title, abstract, authors[], year, citationCount, doi, pdfUrl, openAccess }

Approval: 불필요
```

#### `search_papers_semantic_scholar` — Semantic Scholar 논문 검색

Semantic Scholar API로 논문 검색. TLDR, 영향력 인용 수 등 고유 필드 포함.

```
Parameters:
  query*      : string        — 검색어
  year        : string        — 연도 범위 (예: "2020-2025")
  fields_of_study : string    — 분야 필터 (예: "Computer Science")
  max_results : number        — 최대 결과 수 (기본 5)

Returns:
  S2Paper[] — { title, abstract, tldr, authors[], year, citationCount,
                influentialCitationCount, openAccessPdf, fieldsOfStudy[] }

Approval: 불필요
Rate Limit: 100 req / 5min (API 키 없이), 키 발급 시 완화
```

#### `get_paper_details` — 논문 상세 정보 + 인용 관계

특정 논문의 전체 메타데이터와 참조/피인용 논문 목록을 가져온다.

```
Parameters:
  paper_id*   : string        — DOI, Semantic Scholar ID, 또는 OpenAlex ID
  source      : "semantic_scholar" | "openalex"  — 기본 "semantic_scholar"

Returns:
  {
    ...Paper,                  — 전체 메타데이터
    references: Paper[],       — 이 논문이 인용한 논문들
    citations: Paper[],        — 이 논문을 인용한 논문들
  }

Approval: 불필요
```

#### `web_search` — 웹 검색

일반 웹에서 정보를 검색한다. 개념 설명, 튜토리얼, 뉴스, 블로그 등 비논문 정보원.

```
Parameters:
  query*      : string        — 검색 쿼리
  max_results : number        — 최대 결과 수 (기본 5)

Returns:
  SearchResult[] — { title, url, snippet }

Approval: 불필요
Provider: Tavily (AI 에이전트 최적화) 또는 Brave Search (독립 인덱스)
```

#### `parse_pdf` — PDF 텍스트/구조 추출

PDF 파일에서 텍스트, 섹션 구조, 참고문헌을 추출한다.

```
Parameters:
  source*     : string        — PDF URL 또는 업로드된 파일 ID

Returns:
  {
    title: string | null,
    sections: { heading: string, text: string }[],
    references: { title: string, authors: string }[],
    raw_text: string
  }

Approval: 불필요
신뢰도:
  - 1단 레이아웃 텍스트: 90%+
  - 2단 레이아웃: 50-70% (칼럼 혼합 가능)
  - 테이블: 70-85%
  - 수식: 20-40% (Phase 2에서 Vision LLM으로 보완)
```

### 2.2 그래프 수정 (승인 필요)

#### `add_node` — 노드 추가

```
Parameters:
  type*       : "paper" | "concept" | "memo" | "document"
  label*      : string
  content*    : string
  meta        : { authors?: string, year?: number, citations?: number }

Returns:
  { id: string, message: string }

Approval: 필요 — 프론트에 승인 카드 표시 후 실행
UI Effect: 추가된 노드로 포커스 이동
```

#### `add_edge` — 엣지 추가

```
Parameters:
  source_id*  : string
  target_id*  : string
  type*       : "citation" | "shared_concept" | "manual" | "contains" | "similarity"
  label       : string
  weight      : number (0~1)

Returns:
  { id: string, message: string }

Approval: 필요
```

#### `remove_node` — 노드 삭제

```
Parameters:
  node_id*    : string

Returns:
  { message: string, removedEdges: number }  — 연결된 엣지도 함께 제거

Approval: 필요
```

#### `remove_edge` — 엣지 삭제

```
Parameters:
  edge_id*    : string

Returns:
  { message: string }

Approval: 필요
```

### 2.3 분석/생성

#### `analyze_paper` — 6-Layer 논문 분석

논문을 6개 레이어로 구조화 분석한다. LLM을 사용하여 실제 분석 생성.

```
Parameters:
  paper_id*   : string        — 그래프 내 논문 노드 ID 또는 외부 ID
  context     : string        — 추가 맥락 (사용자 질문 등)

Returns:
  SixLayerAnalysis — {
    priorWork:     { summary, items[] },    — 선행 연구
    keyConcepts:   { summary, items[] },    — 핵심 개념
    pipeline:      { summary, items[] },    — 방법론/아키텍처
    followUp:      { summary, items[] },    — 후속 연구
    industry:      { summary, items[] },    — 산업 적용
    openQuestions: { summary, items[] },    — 열린 질문
  }

Approval: 불필요 (읽기 전용 분석)
```

#### `generate_roadmap` — 학습 로드맵 생성

주제/키워드 기반으로 학습 경로를 설계한다. 사용자의 기존 그래프를 참고.

```
Parameters:
  topic*      : string
  user_level  : "beginner" | "intermediate" | "advanced"

Returns:
  RoadmapModule — {
    id, name,
    entries: { nodeId, order, reason, difficulty, estimatedMinutes }[]
  }

Approval: 필요 — 그래프에 로드맵으로 추가되므로
```

### 2.4 UI 제어

#### `focus_node` — 그래프 뷰 이동

그래프 캔버스에서 특정 노드로 뷰를 이동하고 선택 상태로 만든다.

```
Parameters:
  node_id*    : string

Returns:
  { message: string }

Approval: 불필요
UI Effect: 해당 노드로 카메라 이동 + 노드 선택
```

### 2.5 Tool 요약 매트릭스

| # | Tool | 카테고리 | Approval | 외부 API | 상태 |
|---|---|---|---|---|---|
| 1 | `query_graph` | 정보 수집 | X | X | 새로 만들기 |
| 2 | `search_papers_openalex` | 정보 수집 | X | OpenAlex | 기존 래핑 |
| 3 | `search_papers_semantic_scholar` | 정보 수집 | X | S2 | 새로 만들기 |
| 4 | `get_paper_details` | 정보 수집 | X | S2/OA | 새로 만들기 |
| 5 | `web_search` | 정보 수집 | X | Tavily/Brave | 새로 만들기 |
| 6 | `parse_pdf` | 정보 수집 | X | X (로컬) | 새로 만들기 |
| 7 | `add_node` | 그래프 수정 | O | X | 새로 만들기 |
| 8 | `add_edge` | 그래프 수정 | O | X | 새로 만들기 |
| 9 | `remove_node` | 그래프 수정 | O | X | 새로 만들기 |
| 10 | `remove_edge` | 그래프 수정 | O | X | 새로 만들기 |
| 11 | `analyze_paper` | 분석/생성 | X | X | mock → 실제 전환 |
| 12 | `generate_roadmap` | 분석/생성 | O | X | mock → 실제 전환 |
| 13 | `focus_node` | UI 제어 | X | X | 새로 만들기 |

---

## 3. Tool Function 호출 방법

### 3.1 Tool을 LLM에게 전달하는 형태

모든 tool은 `ToolDefinition`으로 정의되고, LLM에게 보낼 때는 provider별 스키마로 변환된다.

```typescript
// lib/agent/tools/types.ts

interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  enum?: string[];
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiresApproval: boolean;
  execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;
}

interface ToolContext {
  graphData: GraphData;
  setGraphData: (data: GraphData) => void;
  selectedNodeId: string | null;
  uiActions: {
    focusNode: (id: string) => void;
    openPaperTab: (id: string, label: string) => void;
  };
}

interface ToolResult {
  success: boolean;
  data: unknown;
  uiAction?: {
    type: "focus_node" | "open_tab" | "update_graph";
    payload: unknown;
  };
}
```

### 3.2 Provider별 스키마 변환

하나의 `ToolDefinition`을 각 LLM provider가 이해하는 형태로 변환한다.

```typescript
// lib/agent/registry.ts

// Claude (Anthropic) 형식
function toClaudeTools(tools: ToolDefinition[]) {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(t.parameters).map(([key, param]) => [key, {
          type: param.type,
          description: param.description,
          ...(param.enum ? { enum: param.enum } : {}),
        }])
      ),
      required: Object.entries(t.parameters)
        .filter(([, p]) => p.required)
        .map(([k]) => k),
    },
  }));
}

// OpenAI 형식
function toOpenAITools(tools: ToolDefinition[]) {
  return tools.map(t => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(t.parameters).map(([key, param]) => [key, {
            type: param.type,
            description: param.description,
            ...(param.enum ? { enum: param.enum } : {}),
          }])
        ),
        required: Object.entries(t.parameters)
          .filter(([, p]) => p.required)
          .map(([k]) => k),
      },
    },
  }));
}
```

### 3.3 LLM Client 확장 — Tool Use 지원

기존 `callLLM`에 tool use를 지원하는 `callLLMWithTools`를 추가한다.

```typescript
// lib/clients/llm.ts (확장)

interface ToolCallMessage {
  role: "assistant";
  toolCalls: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }[];
}

interface LLMWithToolsOptions {
  systemPrompt: string;
  messages: Message[];
  tools: ToolDefinition[];
  maxTokens?: number;
}

interface LLMWithToolsResult {
  stopReason: "end_turn" | "tool_use";
  text?: string;                          // end_turn일 때
  toolCalls?: {                           // tool_use일 때
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }[];
  inputTokens: number;
  outputTokens: number;
}

async function callLLMWithTools(options: LLMWithToolsOptions): Promise<LLMWithToolsResult>;
```

### 3.4 LLM이 Tool Call을 반환하는 예시

사용자가 "Transformer 관련 논문 찾아줘"라고 입력했을 때:

```
→ LLM 요청:
  system: "당신은 Research Copilot입니다. 사용자의 지식 그래프를 ... [tools 정의]"
  user: "Transformer 관련 논문 찾아줘"

← LLM 응답 (Claude 형식):
  stop_reason: "tool_use"
  content: [
    { type: "text", text: "Transformer 관련 논문을 검색하겠습니다." },
    { type: "tool_use", id: "call_1", name: "search_papers_semantic_scholar",
      input: { query: "Transformer architecture", year: "2020-2026", max_results: 5 } }
  ]

← LLM 응답 (OpenAI 형식):
  finish_reason: "tool_calls"
  message: {
    tool_calls: [
      { id: "call_1", type: "function",
        function: { name: "search_papers_semantic_scholar",
                    arguments: '{"query":"Transformer architecture","year":"2020-2026","max_results":5}' } }
    ]
  }
```

우리 코드는 이 응답을 파싱 → tool 실행 → 결과를 다시 LLM에 주입하는 루프를 반복한다.

---

## 4. 사용자 요청 → 아웃풋 전체 흐름

### 4.1 Agent Loop 상세

```typescript
// lib/agent/runner.ts — 핵심 루프 (간략화 의사코드)

async function* runAgent(messages, graphData, toolContext): AsyncGenerator<AgentEvent> {

  const systemPrompt = buildSystemPrompt(graphData);
  const tools = ALL_TOOLS;
  let conversation = [...messages];
  let iterations = 0;

  while (iterations++ < MAX_ITERATIONS) {       // 최대 10회 반복

    // ── Step 1: LLM 호출 ──
    const response = await callLLMWithTools({
      systemPrompt,
      messages: conversation,
      tools,
    });

    // ── Step 2: 최종 답변이면 종료 ──
    if (response.stopReason === "end_turn") {
      yield { type: "answer", text: response.text };
      return;
    }

    // ── Step 3: Tool call 처리 ──
    for (const toolCall of response.toolCalls) {
      const tool = registry.get(toolCall.name);

      // Step 3a: 승인 필요 여부 확인
      if (tool.requiresApproval) {
        yield { type: "approval_request", toolName: toolCall.name, args: toolCall.arguments };
        const approved = await waitForApproval(toolCall.id);
        if (!approved) {
          conversation.push(toolResult(toolCall.id, "사용자가 거부했습니다."));
          continue;
        }
      }

      // Step 3b: Tool 실행
      yield { type: "tool_start", toolName: toolCall.name };
      const result = await tool.execute(toolCall.arguments, toolContext);
      yield { type: "tool_result", toolName: toolCall.name, result };

      // Step 3c: UI 사이드이펙트
      if (result.uiAction) {
        yield { type: "ui_action", action: result.uiAction };
      }

      // Step 3d: 결과를 대화에 추가 (다음 루프에서 LLM이 참고)
      conversation.push(toolResult(toolCall.id, JSON.stringify(result.data)));
    }
  }

  yield { type: "error", message: "최대 반복 횟수를 초과했습니다." };
}
```

### 4.2 흐름 다이어그램

```
사용자 입력
    │
    ▼
┌──────────────┐
│ System Prompt │◄── 그래프 요약 + 페르소나 + tool 사용 지침
│   + Tools     │
│   + Messages  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     text      ┌──────────────┐
│   LLM 호출   │──────────────►│   최종 답변    │──► 프론트 렌더링
└──────┬───────┘               └──────────────┘
       │ tool_use
       ▼
┌──────────────┐
│ requiresApproval? │
└──┬───────┬───┘
   │ No    │ Yes
   │       ▼
   │  ┌──────────────┐     거부     ┌──────────────┐
   │  │ 프론트에 승인   │───────────►│ "거부됨" 결과  │
   │  │ 카드 표시      │            │  LLM에 전달    │
   │  └──────┬───────┘            └──────┬───────┘
   │         │ 승인                       │
   │         ▼                           │
   │  ┌──────────────┐                   │
   └─►│  Tool 실행    │                   │
      └──────┬───────┘                   │
             │                           │
             ├── data → conversation에 추가 ◄─┘
             │
             ├── uiAction → 프론트에 전달
             │
             └── 다음 루프 → LLM 재호출
                 (결과를 보고 추가 tool 호출 또는 최종 답변)
```

### 4.3 구체적 시나리오 예시

#### 시나리오 A: 단순 질문 (tool 1회)

```
사용자: "내 그래프에 Transformer 관련 논문 몇 개 있어?"

Loop 1:
  LLM → tool_call: query_graph({ action: "search_nodes", query: "transformer", node_type: "paper" })
  실행 → [{ id: "p1", label: "Attention Is All You Need", ... }, ...]
  결과를 LLM에 전달

Loop 2:
  LLM → text: "현재 그래프에 Transformer 관련 논문이 3개 있습니다:
               1. Attention Is All You Need (2017)
               2. BERT (2018)
               3. ..."
  → 최종 답변 반환
```

#### 시나리오 B: 복합 작업 (tool 여러 번 + 승인)

```
사용자: "Diffusion Model 최신 논문 찾아서 그래프에 추가해줘"

Loop 1:
  LLM → tool_call: search_papers_semantic_scholar({ query: "diffusion model", year: "2024-2026" })
  실행 → [{ title: "Flow Matching for...", tldr: "...", ... }, ...]

Loop 2:
  LLM → tool_call: query_graph({ action: "search_nodes", query: "diffusion" })
  실행 → 기존 그래프의 diffusion 관련 노드들

Loop 3:
  LLM → tool_call: add_node({ type: "paper", label: "Flow Matching for...", content: "..." })
  ★ 승인 필요 → 프론트에 카드 표시
  사용자 승인 → 실행 → 노드 추가됨

Loop 4:
  LLM → tool_call: add_edge({ source: "p-new", target: "c3", type: "shared_concept" })
  ★ 승인 필요 → 프론트에 카드 표시
  사용자 승인 → 실행

Loop 5:
  LLM → text: "Flow Matching 논문을 그래프에 추가하고 Diffusion 개념과 연결했습니다."
  → 최종 답변 + UI에서 새 노드로 포커스 이동
```

#### 시나리오 C: 분석 요청

```
사용자: "Attention Is All You Need 논문 분석해줘"

Loop 1:
  LLM → tool_call: query_graph({ action: "search_nodes", query: "Attention Is All You Need" })
  실행 → [{ id: "p1", ... }]

Loop 2:
  LLM → tool_call: analyze_paper({ paper_id: "p1" })
  실행 → SixLayerAnalysis 생성 (내부적으로 LLM 호출)

Loop 3:
  LLM → text: "## Attention Is All You Need 분석\n\n### 선행 연구\n..."
  → 최종 답변 + PaperDetailView 탭 열기
```

### 4.4 System Prompt 구조

```typescript
// lib/agent/prompt.ts

function buildSystemPrompt(graphData: GraphData): string {
  const graphSummary = summarizeGraph(graphData);  // 노드 수가 많으면 요약

  return `
당신은 Deepy Research Copilot입니다.
사용자의 연구를 돕는 에이전트로, 지식 그래프를 관리하고 논문을 분석합니다.

## 사용자의 지식 그래프 현황
${graphSummary}

## 행동 원칙
- 그래프 수정(add_node, add_edge, remove_node, remove_edge)은 반드시 도구를 통해 수행하세요.
- 질문에 답할 때는 먼저 query_graph로 기존 지식을 확인하세요.
- 외부 검색이 필요하면 search_papers_* 또는 web_search를 사용하세요.
- 한국어로 답변하세요.

## 그래프 요약 방식 (노드 수 조절)
- 50개 이하: 전체 노드 목록을 컨텍스트에 포함
- 50~200개: 타입별 요약 + 최근/중요 노드 상위 20개
- 200개 초과: 통계 요약만 포함, 필요시 query_graph로 조회
  `.trim();
}
```

### 4.5 프론트-백엔드 통신 — SSE 이벤트 타입

```typescript
// lib/agent/types.ts

type AgentEvent =
  | { type: "answer";           text: string }                          // 최종 텍스트 답변
  | { type: "thinking";         text: string }                          // LLM 중간 사고 (선택적)
  | { type: "tool_start";       toolName: string }                      // "논문 검색 중..."
  | { type: "tool_result";      toolName: string; data: unknown }       // tool 실행 결과
  | { type: "approval_request"; callId: string;                         // 승인 요청
      toolName: string; args: Record<string, unknown>;
      preview: string }                                                 // 사람이 읽을 수 있는 설명
  | { type: "ui_action";        action: UiAction }                      // UI 조작 명령
  | { type: "error";            message: string }                       // 에러
  | { type: "done" }                                                    // 스트림 종료
```

---

## 5. UI 제어 범위

에이전트가 프론트엔드 UI에서 조작할 수 있는 영역을 명확히 정의한다.

### 5.1 제어 가능 (에이전트가 직접)

| UI 영역 | 동작 | 트리거 |
|---|---|---|
| 그래프 캔버스 — 노드 포커스 | 특정 노드로 카메라 이동 + 선택 | `focus_node` tool |
| 캔버스 탭 — 탭 열기 | PaperDetail, Roadmap 탭 추가 | `analyze_paper`, `generate_roadmap` 결과 |
| 우측 패널 — 채팅 메시지 | 답변 텍스트, 소스 노드, 승인 카드 렌더링 | 모든 AgentEvent |
| 우측 패널 — 로딩 상태 | "논문 검색 중...", "분석 생성 중..." | `tool_start` 이벤트 |

### 5.2 제어 불가 (사용자만 조작)

| UI 영역 | 이유 |
|---|---|
| 레이아웃 변경 (Force/Radial/Tree 등) | 사용자의 시각적 선호 |
| 2D ↔ 3D 전환 | 사용자의 시각적 선호 |
| 필터 on/off (paper, concept 등) | 사용자의 탐색 의도 |
| 엣지 스타일 (curved/linear) | 사용자의 시각적 선호 |
| 연관성 밀도 (compact/default/full) | 사용자의 탐색 의도 |
| 로컬 모드 on/off | 사용자의 탐색 의도 |
| 패널 열기/닫기 | 사용자의 화면 관리 |

### 5.3 간접 제어 (에이전트 제안 → 사용자 승인)

| UI 영역 | 동작 | 메커니즘 |
|---|---|---|
| 그래프 데이터 — 노드 추가/삭제 | 지식 그래프 구조 변경 | 승인 카드 |
| 그래프 데이터 — 엣지 추가/삭제 | 관계 변경 | 승인 카드 |
| 로드맵 — 새 로드맵 생성 | 학습 경로 추가 | 승인 카드 |

### 5.4 승인 카드 UI 스펙

에이전트가 write tool을 호출하면 채팅에 승인 카드가 표시된다:

```
┌─────────────────────────────────────────┐
│  📝 노드 추가 요청                       │
│                                         │
│  타입: paper                            │
│  이름: "Flow Matching for Generative.." │
│  내용: "A unified framework for..."     │
│                                         │
│  [ 승인 ]  [ 거부 ]                      │
└─────────────────────────────────────────┘
```

- 승인: tool 실행 → 결과를 LLM에 전달 → 루프 계속
- 거부: "사용자가 거부함" 메시지를 LLM에 전달 → LLM이 대안을 제시하거나 종료

### 5.5 UI Action 처리 흐름

```typescript
// app/graph/_hooks/useAgent.ts 내부

function handleUiAction(action: UiAction) {
  switch (action.type) {
    case "focus_node":
      selectNode(action.payload.nodeId);     // useGraphData의 selectNode
      break;
    case "open_tab":
      if (action.payload.tabType === "paper-detail") {
        openPaperTab(action.payload.id, action.payload.label);
      } else if (action.payload.tabType === "roadmap-timeline") {
        openRoadmapTab(action.payload.id, action.payload.label);
      }
      break;
    case "update_graph":
      // add_node, add_edge 등의 결과로 그래프 데이터가 변경됨
      // useGraphData의 setData를 통해 반영
      break;
  }
}
```

---

## 부록: 구현 우선순위

### Phase 1 — 핵심 루프 + 기본 도구

| 작업 | 설명 |
|---|---|
| Agent Runner | 기본 루프 (LLM 호출 → tool 실행 → 반복) |
| LLM Client 확장 | tool use 지원 (Claude, OpenAI) |
| `query_graph` | 그래프 조회 |
| `search_papers_openalex` | 기존 코드 tool 래핑 |
| `search_papers_semantic_scholar` | S2 API 연동 |
| `add_node` / `add_edge` | 승인 + 그래프 수정 |
| `focus_node` | 기본 UI 제어 |
| `useAgent` hook | 프론트 통신 |
| 승인 카드 UI | 승인/거부 인터랙션 |

### Phase 2 — 확장 도구

| 작업 | 설명 |
|---|---|
| `web_search` | Tavily 또는 Brave 연동 |
| `parse_pdf` | GROBID + PyMuPDF 기본 추출 |
| `get_paper_details` | 인용 관계 조회 |
| `analyze_paper` | mock → 실제 LLM 분석 전환 |
| `generate_roadmap` | mock → 실제 LLM 생성 전환 |
| `remove_node` / `remove_edge` | 삭제 기능 |

### Phase 3 — 고도화

| 작업 | 설명 |
|---|---|
| 그래프 컨텍스트 압축 | 노드 200개+ 대응, 요약/임베딩 기반 선택 |
| PDF Vision 파싱 | 수식/복잡 레이아웃 대응 |
| 오픈소스 LLM 최적화 | tool call 정확도 튜닝, 프롬프트 최적화 |
| 대화 히스토리 관리 | 세션 저장/복원, 컨텍스트 윈도우 관리 |
