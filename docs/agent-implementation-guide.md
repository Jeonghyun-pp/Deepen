# Deepy Agent — 프로토타입 구현 가이드

피드백이 반영된 결정사항 기반. 원본 설계: `docs/agent-architecture.md`, 리뷰: `docs/agent-architecture-review.md`

---

## 1. 결정사항 요약

### 확정 (5건)

| # | 항목 | 결정 |
|---|---|---|
| 1 | Batch Approval | 같은 턴의 모든 approval tool call을 한 카드로 묶음. 개별 체크박스로 부분 승인/거부 |
| 2 | 그래프 컨텍스트 압축 | 질문 기반 키워드 매칭 + 1-hop 이웃으로 관련 노드만 시스템 프롬프트에 주입 |
| 3 | analyze_paper | 데이터 수집 tool로 변경. 에이전트가 직접 분석 텍스트 생성 (LLM-in-LLM 제거) |
| 4 | 대화 히스토리 | 중요도 기반 정리(type별 규칙) + Sliding Window 2단계. 대화 요약 노트화도 Phase 1 |
| 5 | LLM Provider | OpenAI 단일 타겟. 인터페이스만 추상화 |

### 미결 (2건)

| # | 항목 | 상태 |
|---|---|---|
| 의논2 | 키워드 추출 방식 (LLM vs 규칙 vs 사전 인덱싱) | 추후 논의. 프로토타입은 `string.includes()` placeholder |
| 의논3 | 1-hop 상한선 수치 | 옵시디언 연구 후 결정. 프로토타입은 임의값(15개) |

---

## 2. 현재 프로젝트에 이미 있는 것

구현 시 새로 만들지 않고 활용할 수 있는 기존 코드:

| 기존 코드 | 경로 | 에이전트에서의 역할 |
|---|---|---|
| OpenAI SDK 클라이언트 | `lib/clients/openai.ts` | tool use 지원으로 확장 |
| LLM 라우터 | `lib/clients/llm.ts` | OpenAI 단일이므로 직접 사용 또는 확장 |
| OpenAlex 클라이언트 | `lib/clients/openalex.ts` | `search_papers_openalex` tool이 래핑 |
| Semantic Scholar 클라이언트 | `lib/clients/semantic-scholar.ts` | `search_papers_semantic_scholar` tool이 래핑 |
| 그래프 타입 정의 | `app/graph/_data/types.ts` | `GraphNode`, `GraphEdge`, `GraphData` 그대로 사용 |
| 그래프 상태 관리 | `app/graph/_hooks/useGraphData.ts` | tool의 `ToolContext`로 연결 |
| 그래프 UI (RightPanel) | `app/graph/_components/RightPanel.tsx` | 채팅 UI가 여기에 들어감 |
| Mock 분석 데이터 | `lib/mock/analysis.ts` | `SixLayerAnalysis` 타입 재사용 |
| 인메모리 캐시 | `lib/utils/cache.ts` | 검색 결과 캐싱에 활용 가능 |

**없는 것** (새로 만들어야 하는 것):
- `lib/agent/` — 에이전트 핵심 로직 전체
- `app/api/agent/` — 에이전트 API 라우트
- `app/graph/_hooks/useAgent.ts` — 프론트 통신 hook
- 채팅 UI 컴포넌트 (메시지 스트림, 승인 카드)

---

## 3. 파일 구조

```
lib/agent/
├── runner.ts              # Agent loop (핵심)
├── registry.ts            # Tool 등록 + OpenAI 스키마 변환
├── types.ts               # AgentEvent, Message, ToolDefinition 등
├── prompt.ts              # System prompt 빌더 (질문 기반 컨텍스트 필터링)
├── history.ts             # 대화 히스토리 관리 (중요도 정리 + sliding window)
├── approval.ts            # Batch approval 매니저
└── tools/
    ├── types.ts           # ToolDefinition, ToolContext, ToolResult
    ├── query-graph.ts     # 그래프 조회 (search_nodes, get_neighbors 등)
    ├── search-openalex.ts # OpenAlex 래핑
    ├── search-semantic-scholar.ts  # S2 래핑
    ├── add-node.ts        # 노드 추가 (승인 필요)
    ├── add-edge.ts        # 엣지 추가 (승인 필요)
    ├── analyze-paper.ts   # 데이터 수집만 (LLM 호출 없음)
    └── focus-node.ts      # UI 포커스 이동

lib/clients/
├── openai.ts              # 기존 + tool use 지원 확장
└── llm.ts                 # 기존 유지

app/api/agent/
├── chat/route.ts          # SSE 스트리밍 엔드포인트
└── approve/route.ts       # Batch 승인/거부 수신

app/graph/
├── _hooks/useAgent.ts     # 에이전트 통신 hook
└── _components/
    ├── ChatPanel.tsx      # 채팅 메시지 렌더링
    └── ApprovalCard.tsx   # Batch 승인 카드 UI
```

---

## 4. 구현 상세

### 4.1 타입 정의 — `lib/agent/types.ts`

```typescript
// ── 메시지 ──

interface Message {
  role: "user" | "assistant" | "tool";
  content: string;
  toolCallId?: string;     // role=tool일 때
  toolCalls?: ToolCall[];   // role=assistant, stopReason=tool_use일 때
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ── SSE 이벤트 ──

type AgentEvent =
  | { type: "answer";           text: string }
  | { type: "tool_start";       toolName: string }
  | { type: "tool_result";      toolName: string; summary: string; data: unknown }
  | { type: "batch_approval";   callId: string; items: ApprovalItem[] }
  | { type: "ui_action";        action: UiAction }
  | { type: "note_suggestion";  content: string; relatedNodeIds: string[] }
  | { type: "error";            message: string }
  | { type: "done" };

interface ApprovalItem {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  preview: string;           // 사람이 읽을 수 있는 한 줄 설명
}

// ── LLM 응답 ──

interface LLMWithToolsResult {
  stopReason: "end_turn" | "tool_use";
  text?: string;
  toolCalls?: ToolCall[];
  inputTokens: number;
  outputTokens: number;
}
```

### 4.2 Tool 정의 — `lib/agent/tools/types.ts`

```typescript
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
  summary: string;           // 히스토리 정리용 한 줄 요약
  uiAction?: UiAction;
}
```

### 4.3 OpenAI Tool Use 확장 — `lib/clients/openai.ts`

기존 `callOpenAI`는 structured output용. 새로 `callOpenAIWithTools`를 추가.

```typescript
// 기존 callOpenAI 유지 (structured output용)

// 새로 추가: tool use 지원
export async function callOpenAIWithTools(
  options: {
    systemPrompt: string;
    messages: Message[];
    tools: ToolDefinition[];
    maxTokens?: number;
  }
): Promise<LLMWithToolsResult> {
  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 4096,
    messages: [
      { role: "system", content: options.systemPrompt },
      ...toOpenAIMessages(options.messages),
    ],
    tools: toOpenAITools(options.tools),
  });

  // finish_reason: "tool_calls" → tool call 파싱
  // finish_reason: "stop" → 텍스트 반환
}

// ToolDefinition → OpenAI function schema 변환
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

### 4.4 시스템 프롬프트 빌더 — `lib/agent/prompt.ts`

피드백 2 반영: 질문 기반 컨텍스트 필터링.

```typescript
export async function buildSystemPrompt(
  graphData: GraphData,
  userQuery: string
): Promise<string> {

  // Step 1: 키워드 추출 (프로토타입: string.includes placeholder)
  const keywords = extractKeywords(userQuery);

  // Step 2: 관련 노드 검색
  const matchedNodes = graphData.nodes.filter(n =>
    keywords.some(k =>
      n.label.toLowerCase().includes(k) ||
      n.content.toLowerCase().includes(k)
    )
  );

  // Step 3: 1-hop 이웃 확장 (edge weight top-K, 상한선 15개)
  const MAX_NEIGHBORS = 15;
  const relevantIds = new Set(matchedNodes.map(n => n.id));

  for (const node of matchedNodes) {
    const neighbors = graphData.edges
      .filter(e => e.source === node.id || e.target === node.id)
      .sort((a, b) => (b.weight ?? 0.5) - (a.weight ?? 0.5))
      .slice(0, MAX_NEIGHBORS);

    for (const edge of neighbors) {
      relevantIds.add(edge.source === node.id ? edge.target : edge.source);
    }
  }

  // Step 4: 관련 노드만 포맷
  const relevantNodes = graphData.nodes.filter(n => relevantIds.has(n.id));
  const contextBlock = formatNodesForPrompt(relevantNodes);

  // Step 5: 전체 통계 (항상 포함)
  const stats = getGraphStats(graphData);

  return `
당신은 Deepy Research Copilot입니다.
사용자의 연구를 돕는 에이전트로, 지식 그래프를 관리하고 논문을 분석합니다.

## 사용자의 지식 그래프 현황
${stats}

## 현재 질문과 관련된 노드
${contextBlock}

## 행동 원칙
- 그래프 수정(add_node, add_edge)은 반드시 도구를 통해 수행하세요.
- 질문에 답할 때는 먼저 query_graph로 기존 지식을 확인하세요.
- 외부 검색이 필요하면 search_papers_* 를 사용하세요.
- 대화가 끝나면, 핵심 내용을 메모 노드로 저장할지 제안하세요.
- 한국어로 답변하세요.
  `.trim();
}

function extractKeywords(query: string): string[] {
  // 프로토타입: 단순 공백 분리 + 불용어 제거
  // TODO: 의논2 확정 후 LLM 기반 또는 사전 인덱싱으로 교체
  const stopwords = new Set(["이", "가", "을", "를", "의", "에", "는", "은", "과", "와", "해줘", "알려줘", "설명해줘"]);
  return query.toLowerCase().split(/\s+/).filter(w => w.length > 1 && !stopwords.has(w));
}
```

### 4.5 대화 히스토리 관리 — `lib/agent/history.ts`

피드백 4 반영: 중요도 기반 정리 + Sliding Window 2단계.

```typescript
const MAX_TOKENS_ESTIMATE = 30000;  // 모델 한계 대비 여유
const TOKENS_PER_CHAR = 0.4;       // 한국어 근사치

export function compactHistory(messages: Message[]): Message[] {
  // ── 1단계: 중요도 기반 정리 ──
  const compacted = messages.map(msg => {
    // tool_result → 한 줄 요약으로 교체
    if (msg.role === "tool" && msg.content.length > 200) {
      return { ...msg, content: msg.summary ?? "[tool 결과 요약됨]" };
    }
    return msg;
  }).filter(msg => {
    // tool_start, ui_action, approval 완료분 삭제
    // (실제로는 이들이 Message로 들어오지 않을 수 있음 — SSE 이벤트와 분리)
    return true;
  });

  // ── 2단계: Sliding Window ──
  let totalChars = compacted.reduce((sum, m) => sum + m.content.length, 0);
  const maxChars = MAX_TOKENS_ESTIMATE / TOKENS_PER_CHAR;

  if (totalChars <= maxChars) return compacted;

  // 오래된 턴부터 제거 (user + assistant 쌍 단위)
  const result = [...compacted];
  while (result.length > 2 && totalChars > maxChars) {
    const removed = result.shift()!;
    totalChars -= removed.content.length;
  }

  return result;
}
```

### 4.6 Batch Approval 매니저 — `lib/agent/approval.ts`

피드백 1 반영: 동일 턴의 approval tool call을 묶어서 처리.

```typescript
interface BatchApprovalRequest {
  callId: string;
  items: ApprovalItem[];
}

interface BatchApprovalResponse {
  approvedIds: string[];     // 승인된 toolCallId 목록
  rejectedIds: string[];     // 거부된 toolCallId 목록
}

// Agent Runner에서 사용:
// 1. 한 턴의 toolCalls에서 requiresApproval인 것들을 모음
// 2. batch_approval 이벤트로 프론트에 전송
// 3. approve 엔드포인트에서 BatchApprovalResponse 수신
// 4. approvedIds만 실행, rejectedIds는 "거부됨" 결과로 LLM에 전달
```

### 4.7 Agent Runner — `lib/agent/runner.ts`

모든 피드백이 반영된 핵심 루프.

```typescript
export async function* runAgent(
  messages: Message[],
  graphData: GraphData,
  toolContext: ToolContext
): AsyncGenerator<AgentEvent> {

  const systemPrompt = await buildSystemPrompt(graphData, getLastUserMessage(messages));
  const tools = getAllTools();
  let conversation = compactHistory([...messages]);  // 피드백 4: 히스토리 정리
  let iterations = 0;

  while (iterations++ < 10) {

    // ── Step 1: LLM 호출 ──
    const response = await callOpenAIWithTools({
      systemPrompt,
      messages: conversation,
      tools,
    });

    // ── Step 2: 최종 답변이면 종료 ──
    if (response.stopReason === "end_turn") {
      yield { type: "answer", text: response.text! };
      yield { type: "done" };
      return;
    }

    // ── Step 3: Tool call 분류 ──
    const toolCalls = response.toolCalls ?? [];
    const needsApproval = toolCalls.filter(tc => {
      const tool = registry.get(tc.name);
      return tool?.requiresApproval;
    });
    const autoExecute = toolCalls.filter(tc => {
      const tool = registry.get(tc.name);
      return !tool?.requiresApproval;
    });

    // ── Step 4: 승인 불필요 tool → 바로 실행 ──
    for (const tc of autoExecute) {
      yield { type: "tool_start", toolName: tc.name };
      const tool = registry.get(tc.name)!;
      const result = await tool.execute(tc.arguments, toolContext);
      yield { type: "tool_result", toolName: tc.name, summary: result.summary, data: result.data };
      if (result.uiAction) yield { type: "ui_action", action: result.uiAction };
      conversation.push({ role: "tool", content: JSON.stringify(result.data), toolCallId: tc.id, summary: result.summary });
    }

    // ── Step 5: 승인 필요 tool → Batch Approval (피드백 1) ──
    if (needsApproval.length > 0) {
      const items: ApprovalItem[] = needsApproval.map(tc => ({
        toolCallId: tc.id,
        toolName: tc.name,
        args: tc.arguments,
        preview: generatePreview(tc),
      }));

      const callId = `batch-${Date.now()}`;
      yield { type: "batch_approval", callId, items };

      // 프론트에서 승인/거부 응답 대기
      const response = await waitForBatchApproval(callId);

      // 승인된 것만 실행
      for (const tc of needsApproval) {
        if (response.approvedIds.includes(tc.toolCallId)) {
          const tool = registry.get(tc.name)!;
          const result = await tool.execute(tc.arguments, toolContext);
          yield { type: "tool_result", toolName: tc.name, summary: result.summary, data: result.data };
          if (result.uiAction) yield { type: "ui_action", action: result.uiAction };
          conversation.push({ role: "tool", content: JSON.stringify(result.data), toolCallId: tc.id, summary: result.summary });
        } else {
          // 거부된 것은 LLM에 알림
          conversation.push({ role: "tool", content: "사용자가 이 작업을 거부했습니다.", toolCallId: tc.id });
        }
      }
    }

    // ── Step 6: 히스토리 정리 (피드백 4) ──
    conversation = compactHistory(conversation);
  }

  yield { type: "error", message: "최대 반복 횟수를 초과했습니다." };
}
```

### 4.8 Tool 구현 예시

#### `query_graph` — 그래프 조회

```typescript
// lib/agent/tools/query-graph.ts

export const queryGraphTool: ToolDefinition = {
  name: "query_graph",
  description: "사용자의 지식 그래프에서 노드를 검색하거나 이웃을 조회한다.",
  parameters: {
    action: { type: "string", description: "수행할 작업", required: true, enum: ["search_nodes", "get_neighbors", "get_stats"] },
    query: { type: "string", description: "검색어 (search_nodes용)" },
    node_id: { type: "string", description: "기준 노드 ID (get_neighbors용)" },
    node_type: { type: "string", description: "타입 필터", enum: ["paper", "concept", "memo", "document"] },
  },
  requiresApproval: false,
  async execute(args, ctx) {
    const { action, query, node_id, node_type } = args as Record<string, string>;

    if (action === "search_nodes") {
      const q = (query ?? "").toLowerCase();
      const results = ctx.graphData.nodes.filter(n =>
        (!node_type || n.type === node_type) &&
        (n.label.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
      );
      return { success: true, data: results, summary: `${results.length}개 노드 검색됨` };
    }

    if (action === "get_neighbors") {
      const neighbors = ctx.graphData.edges
        .filter(e => e.source === node_id || e.target === node_id)
        .map(e => {
          const otherId = e.source === node_id ? e.target : e.source;
          const node = ctx.graphData.nodes.find(n => n.id === otherId);
          return node ? { node, edgeType: e.type, edgeLabel: e.label } : null;
        })
        .filter(Boolean);
      return { success: true, data: neighbors, summary: `${neighbors.length}개 이웃 노드` };
    }

    if (action === "get_stats") {
      const byType = ctx.graphData.nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      return { success: true, data: { totalNodes: ctx.graphData.nodes.length, totalEdges: ctx.graphData.edges.length, byType }, summary: "그래프 통계 조회" };
    }

    return { success: false, data: null, summary: "알 수 없는 action" };
  },
};
```

#### `add_node` — 노드 추가 (승인 필요)

```typescript
// lib/agent/tools/add-node.ts

export const addNodeTool: ToolDefinition = {
  name: "add_node",
  description: "지식 그래프에 새 노드를 추가한다. 사용자 승인 필요.",
  parameters: {
    type: { type: "string", description: "노드 타입", required: true, enum: ["paper", "concept", "memo", "document"] },
    label: { type: "string", description: "노드 이름", required: true },
    content: { type: "string", description: "노드 내용", required: true },
    authors: { type: "string", description: "저자 (paper용)" },
    year: { type: "number", description: "발행 연도 (paper용)" },
  },
  requiresApproval: true,
  async execute(args, ctx) {
    const { type, label, content, authors, year } = args as Record<string, unknown>;
    const id = `${type}-${Date.now()}`;
    const newNode: GraphNode = {
      id,
      label: label as string,
      type: type as NodeType,
      content: content as string,
      meta: { authors: authors as string, year: year as number },
    };

    ctx.setGraphData({
      ...ctx.graphData,
      nodes: [...ctx.graphData.nodes, newNode],
    });

    return {
      success: true,
      data: { id, label },
      summary: `${type} 노드 "${label}" 추가됨`,
      uiAction: { type: "focus_node", payload: { nodeId: id } },
    };
  },
};
```

#### `analyze_paper` — 데이터 수집 (피드백 3 반영)

```typescript
// lib/agent/tools/analyze-paper.ts
// LLM 호출 없음. 에이전트가 이 데이터를 보고 직접 분석 생성.

export const analyzePaperTool: ToolDefinition = {
  name: "analyze_paper",
  description: "논문의 데이터, 이웃 노드, 관련 개념을 모아서 반환한다. 이 데이터를 바탕으로 6-Layer 분석을 직접 생성하세요.",
  parameters: {
    paper_id: { type: "string", description: "그래프 내 논문 노드 ID", required: true },
  },
  requiresApproval: false,
  async execute(args, ctx) {
    const paperId = args.paper_id as string;
    const paper = ctx.graphData.nodes.find(n => n.id === paperId);
    if (!paper) return { success: false, data: null, summary: "논문을 찾을 수 없음" };

    // 이웃 노드 수집
    const neighbors = ctx.graphData.edges
      .filter(e => e.source === paperId || e.target === paperId)
      .map(e => {
        const otherId = e.source === paperId ? e.target : e.source;
        const node = ctx.graphData.nodes.find(n => n.id === otherId);
        return { node, edgeType: e.type, edgeLabel: e.label, weight: e.weight };
      })
      .filter(item => item.node);

    // 인용 관계
    const citations = neighbors.filter(n => n.edgeType === "citation");
    const concepts = neighbors.filter(n => n.edgeType === "contains");
    const memos = neighbors.filter(n => n.node?.type === "memo");

    return {
      success: true,
      data: { paper, citations, concepts, memos, allNeighbors: neighbors },
      summary: `"${paper.label}" 데이터 수집 완료 (이웃 ${neighbors.length}개)`,
    };
  },
};
```

### 4.9 API 라우트

#### `POST /api/agent/chat` — SSE 스트리밍

```typescript
// app/api/agent/chat/route.ts

export async function POST(req: Request) {
  const { messages, graphData } = await req.json();

  const toolContext: ToolContext = {
    graphData,
    setGraphData: (data) => { /* 클라이언트에 업데이트 이벤트로 전달 */ },
    selectedNodeId: null,
    uiActions: { focusNode: () => {}, openPaperTab: () => {} },
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      for await (const event of runAgent(messages, graphData, toolContext)) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

#### `POST /api/agent/approve` — Batch 승인

```typescript
// app/api/agent/approve/route.ts

export async function POST(req: Request) {
  const { callId, approvedIds, rejectedIds } = await req.json();
  // approval 큐에 응답 전달 (runner의 waitForBatchApproval이 받음)
  resolveApproval(callId, { approvedIds, rejectedIds });
  return Response.json({ ok: true });
}
```

### 4.10 프론트엔드 — `useAgent` hook

```typescript
// app/graph/_hooks/useAgent.ts

export function useAgent(graphData: GraphData) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingApproval, setPendingApproval] = useState<BatchApprovalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: text }]);

    const res = await fetch("/api/agent/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [...messages, { role: "user", content: text }], graphData }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const event: AgentEvent = JSON.parse(line.slice(6));

        switch (event.type) {
          case "answer":
            setMessages(prev => [...prev, { role: "assistant", content: event.text }]);
            break;
          case "batch_approval":
            setPendingApproval(event);
            break;
          case "tool_start":
            // 로딩 표시
            break;
          case "done":
            setIsLoading(false);
            break;
        }
      }
    }
  }, [messages, graphData]);

  const respondApproval = useCallback(async (callId: string, approvedIds: string[], rejectedIds: string[]) => {
    await fetch("/api/agent/approve", {
      method: "POST",
      body: JSON.stringify({ callId, approvedIds, rejectedIds }),
    });
    setPendingApproval(null);
  }, []);

  return { messages, isLoading, pendingApproval, sendMessage, respondApproval };
}
```

### 4.11 Batch 승인 카드 UI — `ApprovalCard.tsx`

```typescript
// app/graph/_components/ApprovalCard.tsx

export function ApprovalCard({ approval, onRespond }: {
  approval: BatchApprovalRequest;
  onRespond: (approvedIds: string[], rejectedIds: string[]) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(
    new Set(approval.items.map(i => i.toolCallId))  // 기본 전체 선택
  );

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const submit = () => {
    const approved = approval.items.filter(i => checked.has(i.toolCallId)).map(i => i.toolCallId);
    const rejected = approval.items.filter(i => !checked.has(i.toolCallId)).map(i => i.toolCallId);
    onRespond(approved, rejected);
  };

  return (
    <div>
      <h4>작업 승인 요청 ({approval.items.length}건)</h4>
      {approval.items.map(item => (
        <label key={item.toolCallId}>
          <input
            type="checkbox"
            checked={checked.has(item.toolCallId)}
            onChange={() => toggle(item.toolCallId)}
          />
          [{item.toolName}] {item.preview}
        </label>
      ))}
      <button onClick={submit}>선택 승인</button>
      <button onClick={() => onRespond([], approval.items.map(i => i.toolCallId))}>전체 거부</button>
    </div>
  );
}
```

---

## 5. 대화 요약 노트화

피드백 4 + 팀 피드백(한원석) 반영. Phase 1 포함.

에이전트의 시스템 프롬프트에 다음 지침이 포함됨:
> "대화가 끝나면, 핵심 내용을 메모 노드로 저장할지 제안하세요."

에이전트가 대화 종료 시 자발적으로:
1. 대화에서 나온 분석/정리 내용을 요약
2. `add_node`(type: "memo") + `add_edge`(관련 논문 연결)를 tool call로 제안
3. Batch 승인 카드로 사용자에게 표시
4. 승인 시 그래프에 메모 노드로 영속 저장

별도 구현 불필요 — 기존 `add_node` + `add_edge` tool과 승인 프로세스를 그대로 사용.

---

## 6. 전체 흐름 다이어그램

```
사용자 입력
    │
    ▼
키워드 추출 (placeholder: string.includes)
    │
    ▼
관련 노드 + 1-hop 이웃 (edge weight top-K, 상한 15개)
    │
    ▼
시스템 프롬프트 빌드
    │
    ▼
┌→ OpenAI API 호출 (tool use)
│      │
│      ├── text → 최종 답변 → SSE 전송 → 끝
│      │
│      └── tool_calls ↓
│              │
│              ├── 승인 불필요 → 바로 실행 → 결과를 conversation에 추가
│              │
│              └── 승인 필요 → Batch 카드 표시 → 사용자 응답 대기
│                      │
│                      ├── 승인된 것 → 실행
│                      └── 거부된 것 → "거부됨" 결과로 LLM에 전달
│              │
│              ▼
│      히스토리 정리 (1단계: type 기반, 2단계: sliding window)
│              │
└──────────────┘ (다음 루프)
```

---

## 7. 프로토타입에서 placeholder로 두는 것

| 항목 | placeholder | 확정 후 교체 대상 |
|---|---|---|
| 키워드 추출 (의논2) | `string.includes()` 단순 매칭 | `extractKeywords()` in `prompt.ts` |
| 1-hop 상한선 (의논3) | 노드당 15개 고정 | `MAX_NEIGHBORS` in `prompt.ts` |
| 토큰 카운팅 | `content.length * 0.4` 근사치 | tiktoken 등 정확한 토크나이저 |
| 대화 요약 노트화 시점 | 에이전트 프롬프트 지시에 의존 | 명시적 트리거 로직 |
