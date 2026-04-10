"use client";

import { useRef, useEffect, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import type { ChatMessage } from "../_hooks/useAgent";
import ToolCallCard from "./chat/ToolCallCard";
import ApprovalCard from "./chat/ApprovalCard";

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onApprove: (decisions: Record<string, boolean>) => Promise<void> | void;
  onActivateRoadmap?: (pathNodeIds: string[]) => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export default function ChatPanel({
  messages,
  isLoading,
  onSend,
  onApprove,
  onActivateRoadmap,
  onNavigateToNode,
}: Props) {
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
          <div className="text-xs text-text-muted text-center mt-8 space-y-2">
            <p>지식 그래프를 기반으로 연구를 도와드립니다.</p>
            <p className="text-[10px] text-text-muted/70">
              예시: &quot;Transformer 핵심 개념?&quot;, &quot;RNN에서 ViT까지 경로 만들어줘&quot;
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${
              msg.role === "user" ? "flex-row-reverse" : ""
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-coral flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] text-white font-bold">D</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5 max-w-[85%] min-w-0">
              {/* text bubble */}
              {(msg.content || msg.role === "user") && (
                <div
                  className={`rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-coral text-white rounded-tr-sm self-end"
                      : "bg-coral-light/40 text-text-primary rounded-tl-sm"
                  }`}
                >
                  {msg.content ||
                    (msg.role === "assistant" && isLoading ? (
                      <Loader2 size={12} className="animate-spin text-coral" />
                    ) : null)}
                </div>
              )}

              {/* tool entries */}
              {msg.toolEntries && msg.toolEntries.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {msg.toolEntries.map((entry) => (
                    <ToolCallCard
                      key={entry.call.id}
                      entry={entry}
                      onActivateRoadmap={onActivateRoadmap}
                      onNavigateToNode={onNavigateToNode}
                    />
                  ))}
                </div>
              )}

              {/* approval */}
              {msg.pendingApproval && msg.pendingApproval.length > 0 && (
                <ApprovalCard
                  items={msg.pendingApproval}
                  onResolve={onApprove}
                />
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
            className="w-9 h-9 rounded-xl bg-coral text-white flex items-center justify-center hover:bg-coral-dark transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
