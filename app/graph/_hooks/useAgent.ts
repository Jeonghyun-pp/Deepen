"use client";

import { useState, useCallback, useRef } from "react";
import type {
  Message,
  ToolCall,
  ToolResult,
  ApprovalItem,
} from "@/lib/agent/types";
import type { GraphData, GraphNode, GraphEdge } from "../_data/types";

export interface ChatMessageToolEntry {
  call: ToolCall;
  result?: ToolResult;
  status: "running" | "done" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolEntries?: ChatMessageToolEntry[];
  pendingApproval?: ApprovalItem[];
}

type AgentHandlers = {
  onAddNode?: (node: GraphNode) => void;
  onAddEdge?: (edge: GraphEdge) => void;
};

function newSessionId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAgent(graphData: GraphData, handlers: AgentHandlers = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const sessionRef = useRef<string>(newSessionId());

  const appendToAssistant = useCallback(
    (id: string, updater: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? updater(m) : m)),
      );
    },
    [],
  );

  const approve = useCallback(
    async (decisions: Record<string, boolean>) => {
      await fetch("/api/agent/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionRef.current, decisions }),
      });
    },
    [],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      const assistantId = `a-${Date.now() + 1}`;

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "", toolEntries: [] },
      ]);
      setIsLoading(true);

      const apiMessages: Message[] = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            graphData,
            sessionId: sessionRef.current,
          }),
        });

        if (!res.body) throw new Error("응답 본문이 없습니다");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case "text_delta":
                appendToAssistant(assistantId, (m) => ({
                  ...m,
                  content: m.content + event.delta,
                }));
                break;

              case "tool_call_start":
                appendToAssistant(assistantId, (m) => ({
                  ...m,
                  toolEntries: [
                    ...(m.toolEntries ?? []),
                    { call: event.call, status: "running" },
                  ],
                }));
                break;

              case "tool_result":
                appendToAssistant(assistantId, (m) => {
                  const entries = m.toolEntries ?? [];
                  const idx = entries.findIndex(
                    (e) => e.call.id === event.result.id,
                  );
                  const status: ChatMessageToolEntry["status"] = event.result.ok
                    ? "done"
                    : "error";
                  if (idx >= 0) {
                    const next = [...entries];
                    next[idx] = { ...next[idx], result: event.result, status };
                    return { ...m, toolEntries: next };
                  }
                  // approval 필요 tool은 tool_call_start 없이 바로 tool_result가 옴
                  return {
                    ...m,
                    toolEntries: [
                      ...entries,
                      {
                        call: {
                          id: event.result.id,
                          name: event.result.name,
                          args: {},
                        },
                        result: event.result,
                        status,
                      },
                    ],
                  };
                });

                // mutation 성공 시 client-side graph 반영
                if (event.result.ok && event.result.data) {
                  const data = event.result.data as {
                    node?: GraphNode;
                    edge?: GraphEdge;
                  };
                  if (event.result.name === "add_node" && data.node) {
                    handlers.onAddNode?.(data.node);
                  } else if (event.result.name === "add_edge" && data.edge) {
                    handlers.onAddEdge?.(data.edge);
                  }
                }
                break;

              case "batch_approval":
                appendToAssistant(assistantId, (m) => ({
                  ...m,
                  pendingApproval: event.items,
                }));
                break;

              case "approval_resolved":
                appendToAssistant(assistantId, (m) => ({
                  ...m,
                  pendingApproval: (m.pendingApproval ?? []).filter(
                    (it) => it.callId !== event.callId,
                  ),
                }));
                break;

              case "error":
                appendToAssistant(assistantId, (m) => ({
                  ...m,
                  content: m.content + `\n\n오류: ${event.message}`,
                }));
                break;
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        appendToAssistant(assistantId, (m) => ({
          ...m,
          content: m.content + `\n\n오류: ${msg}`,
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [messages, graphData, handlers, appendToAssistant],
  );

  return { messages, isLoading, sendMessage, approve };
}
