# 챗봇 MVP 구현 계획 — 0411 아침 작업

목표: **그래프 컨텍스트 기반 대화 챗봇** (tool use 없음, 추후 확장 가능한 구조)
예상 소요: 4~5시간

---

## 사전 준비 (시작 전 1분)

```bash
# 프로젝트 루트에 .env.local 생성
OPENAI_API_KEY=sk-...
```

---

## 만들 파일 목록

```
lib/agent/
├── types.ts          ← 새로 생성
├── prompt.ts         ← 새로 생성
└── runner.ts         ← 새로 생성 (tool 확장 자리 포함)

lib/clients/
└── openai.ts         ← 기존 파일에 함수 추가

app/api/agent/
└── chat/route.ts     ← 새로 생성

app/graph/
├── _hooks/useAgent.ts              ← 새로 생성
└── _components/ChatPanel.tsx       ← 새로 생성
app/graph/_components/RightPanel.tsx ← 기존 ChatContent 교체
```

---

## Step 1 — 타입 정의 `lib/agent/types.ts`

```typescript
export interface Message {
  role: "user" | "assistant";
  content: string;
}

// SSE 이벤트 — tool use 추가 시 여기에 타입 확장
export type AgentEvent =
  | { type: "text_delta"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string };
```

> **확장 포인트:** `AgentEvent`에 `tool_start`, `batch_approval` 등 추가하면 됨

---

## Step 2 — OpenAI 스트리밍 추가 `lib/clients/openai.ts`

기존 `callOpenAI` 함수는 건드리지 않는다. 파일 하단에 추가.

```typescript
import type { Message } from "../agent/types";

export async function streamOpenAIChat(options: {
  systemPrompt: string;
  messages: Message[];
  maxTokens?: number;
}): Promise<ReadableStream<string>> {
  const stream = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? 2048,
    stream: true,
    messages: [
      { role: "system", content: options.systemPrompt },
      ...options.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) controller.enqueue(delta);
      }
      controller.close();
    },
  });
}
```

> **확장 포인트:** tool use 추가 시 `streamOpenAIChat` 옆에 `callOpenAIWithTools` 추가 (기존 함수 변경 없음)

---

## Step 3 — 시스템 프롬프트 빌더 `lib/agent/prompt.ts`

```typescript
import type { GraphData } from "../../app/graph/_data/types";

const MAX_NEIGHBORS = 10;

export function buildSystemPrompt(graphData: GraphData, userQuery: string): string {
  const stats = getStats(graphData);
  const contextBlock = getRelevantContext(graphData, userQuery);

  return `
당신은 Deepy Research Copilot입니다. 사용자의 연구를 돕는 에이전트입니다.
항상 한국어로 답변하세요.

## 사용자 지식 그래프 현황
${stats}

## 현재 질문과 관련된 노드
${contextBlock}
  `.trim();
}

function getStats(graphData: GraphData): string {
  const byType = graphData.nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeSummary = Object.entries(byType).map(([t, c]) => `${t}:${c}개`).join(", ");
  return `총 ${graphData.nodes.length}개 노드 (${typeSummary}), ${graphData.edges.length}개 엣지`;
}

function getRelevantContext(graphData: GraphData, userQuery: string): string {
  if (graphData.nodes.length === 0) return "그래프가 비어 있습니다.";

  // 키워드 매칭 (placeholder — 추후 개선 가능)
  const stopwords = new Set(["이", "가", "을", "를", "의", "에", "는", "은", "과", "와", "해줘", "알려줘", "설명해줘", "뭐야", "어떻게"]);
  const keywords = userQuery.toLowerCase().split(/\s+/)
    .map((w) => w.replace(/[.,?!]/g, ""))
    .filter((w) => w.length > 1 && !stopwords.has(w));

  const matched = graphData.nodes.filter((n) =>
    keywords.some((k) => n.label.toLowerCase().includes(k) || (n.content ?? "").toLowerCase().includes(k))
  );

  const relevantIds = new Set(matched.map((n) => n.id));
  for (const node of matched) {
    graphData.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .sort((a, b) => (b.weight ?? 0.5) - (a.weight ?? 0.5))
      .slice(0, MAX_NEIGHBORS)
      .forEach((e) => relevantIds.add(e.source === node.id ? e.target : e.source));
  }

  const nodes = graphData.nodes.filter((n) => relevantIds.has(n.id));
  if (nodes.length === 0) return "관련 노드를 찾지 못했습니다.";

  return nodes.map((n) =>
    `[${n.id}] ${n.type} "${n.label}"` +
    (n.meta?.year ? ` (${n.meta.year})` : "") +
    `\n  ${(n.content ?? "").slice(0, 150)}`
  ).join("\n\n");
}
```

---

## Step 4 — Runner `lib/agent/runner.ts`

MVP는 단순 스트리밍 루프. tool use 자리를 주석으로 남겨둔다.

```typescript
import type { Message, AgentEvent } from "./types";
import type { GraphData } from "../../app/graph/_data/types";
import { buildSystemPrompt } from "./prompt";
import { streamOpenAIChat } from "../clients/openai";

export async function* runAgent(
  messages: Message[],
  graphData: GraphData
): AsyncGenerator<AgentEvent> {
  const userQuery = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const systemPrompt = buildSystemPrompt(graphData, userQuery);

  // TODO: tool use 추가 시 여기서 callOpenAIWithTools로 분기
  // if (useTools) { yield* runAgentWithTools(...); return; }

  try {
    const stream = await streamOpenAIChat({ systemPrompt, messages });
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      yield { type: "text_delta", delta: value };
    }

    yield { type: "done" };
  } catch (e) {
    yield { type: "error", message: String(e) };
  }
}
```

---

## Step 5 — API 라우트 `app/api/agent/chat/route.ts`

```typescript
import { runAgent } from "@/lib/agent/runner";
import type { Message } from "@/lib/agent/types";
import type { GraphData } from "@/app/graph/_data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { messages, graphData }: { messages: Message[]; graphData: GraphData } =
    await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of runAgent(messages, graphData)) {
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

---

## Step 6 — useAgent hook `app/graph/_hooks/useAgent.ts`

```typescript
"use client";

import { useState, useCallback } from "react";
import type { Message } from "@/lib/agent/types";
import type { GraphData } from "../_data/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useAgent(graphData: GraphData) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { id: `${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // assistant 메시지 자리 먼저 추가 (스트리밍 누적용)
    const assistantId = `${Date.now() + 1}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const apiMessages: Message[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: text },
    ];

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, graphData }),
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const event = JSON.parse(line.slice(6));

          if (event.type === "text_delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.delta } : m
              )
            );
          }
        }
      }
    } catch (e) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `오류: ${String(e)}` } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [messages, graphData]);

  return { messages, isLoading, sendMessage };
}
```

---

## Step 7 — ChatPanel `app/graph/_components/ChatPanel.tsx`

```typescript
"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "../_hooks/useAgent";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, isLoading, onSend }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-xs text-text-muted text-center mt-8">
            지식 그래프를 기반으로 연구를 도와드립니다.
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-coral flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] text-white font-bold">D</span>
              </div>
            )}
            <div className={`rounded-xl px-3 py-2 max-w-[85%] text-xs leading-relaxed whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-coral text-white rounded-tr-sm"
                : "bg-coral-light/40 text-text-primary rounded-tl-sm"
            }`}>
              {msg.content || (msg.role === "assistant" && isLoading
                ? <Loader2 size={12} className="animate-spin text-coral" />
                : null
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder={isLoading ? "응답 중..." : "질문을 입력하세요..."}
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 h-9 px-3 rounded-xl bg-white border border-border text-sm placeholder:text-text-muted outline-none focus:border-coral transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-coral text-white flex items-center justify-center hover:bg-coral-dark transition-colors disabled:opacity-50"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 8 — RightPanel + GraphShell 연결

### RightPanel.tsx 수정

`ChatContent` 컴포넌트 전체를 제거하고 Props에 agent 관련 항목 추가.

```typescript
// Props에 추가
agentMessages?: ChatMessage[];
agentLoading?: boolean;
onAgentSend?: (text: string) => void;

// ChatContent 렌더링 부분을 교체
{activeTab === "chat" && (
  <ChatPanel
    messages={agentMessages ?? []}
    isLoading={agentLoading ?? false}
    onSend={onAgentSend ?? (() => {})}
  />
)}
```

import 추가: `import ChatPanel from "./ChatPanel";`, `import type { ChatMessage } from "../_hooks/useAgent";`

### GraphShell.tsx 수정

```typescript
// useAgent import 및 호출 추가
import { useAgent } from "../_hooks/useAgent";
const agent = useAgent(gd.graphData);

// RightPanel에 props 추가
agentMessages={agent.messages}
agentLoading={agent.isLoading}
onAgentSend={agent.sendMessage}
```

---

## 완료 기준

브라우저에서:
1. RightPanel 채팅 탭 열기
2. "내 그래프에 뭐 있어?" 입력
3. 스트리밍으로 답변 출력

---

## 이후 확장 경로 (건드리지 않아도 됨)

| 추가 기능 | 건드릴 파일 |
|---|---|
| Tool use (논문 검색, 노드 추가) | `runner.ts`에 분기 추가 + `tools/` 폴더 신설 |
| 승인 카드 (Batch Approval) | `approval.ts` + `ApprovalCard.tsx` + `approve/route.ts` |
| 히스토리 압축 | `history.ts` 신설 후 `runner.ts`에서 호출 |
| 메모 자동 노트화 | `prompt.ts` 행동 원칙 수정 + `add_node` tool 추가 |