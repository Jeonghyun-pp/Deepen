"use client";

import { useState } from "react";
import { X, BookOpen, PenLine, MessageCircle, Upload, Send, Download, type LucideIcon } from "lucide-react";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS, EDGE_TYPE_LABELS } from "../_data/colors";
import ConceptTimeline from "./ConceptTimeline";
import GapSummary from "./GapSummary";

interface ConnectedNode {
  node: GraphNode;
  edgeType: string;
  edgeLabel?: string;
}

interface GapNodeInfo {
  node: GraphNode;
  connectionCount: number;
  memoCount: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  sources?: GraphNode[];
}

interface Props {
  activeTab: string;
  node: GraphNode | null;
  connections: ConnectedNode[];
  open: boolean;
  onClose: () => void;
  onNodeClick: (id: string) => void;
  onTabChange: (tab: string) => void;
  // edge label editing
  onEdgeLabelUpdate?: (edgeId: string, label: string) => void;
  allEdges?: { id: string; source: string; target: string; label?: string }[];
  // gap mode
  gapMode?: boolean;
  gapNodes?: GapNodeInfo[];
  // Q&A
  onSearchKnowledge?: (query: string) => { answer: string; sources: GraphNode[] };
  // export
  onExport?: () => void;
}

const TAB_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  graph: { icon: BookOpen, label: "노드 상세" },
  editor: { icon: PenLine, label: "메모 에디터" },
  chat: { icon: MessageCircle, label: "내 지식 Q&A" },
  upload: { icon: Upload, label: "파일 업로드" },
};

function EditableLabel({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        onBlur={() => { onSave(draft); setEditing(false); }}
        className="text-[10px] px-1.5 py-0.5 rounded border border-coral outline-none bg-white w-full"
      />
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-text-muted truncate">
        {value || "관계 미정의"}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="text-[9px] text-coral hover:underline shrink-0"
      >
        편집
      </button>
    </div>
  );
}

function NodeDetailContent({
  node,
  connections,
  onNodeClick,
  onEdgeLabelUpdate,
  allEdges,
}: {
  node: GraphNode | null;
  connections: ConnectedNode[];
  onNodeClick: (id: string) => void;
  onEdgeLabelUpdate?: (edgeId: string, label: string) => void;
  allEdges?: { id: string; source: string; target: string; label?: string }[];
}) {
  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="w-12 h-12 rounded-2xl bg-coral-light flex items-center justify-center">
          <BookOpen size={20} className="text-coral" />
        </div>
        <p className="text-xs text-text-muted text-center leading-relaxed">
          그래프에서 노드를 클릭하면<br />상세 정보가 표시됩니다
        </p>
      </div>
    );
  }

  // Find edge between selected node and connected node
  const findEdge = (connectedNodeId: string) => {
    if (!allEdges) return null;
    return allEdges.find(
      (e) =>
        (e.source === node.id && e.target === connectedNodeId) ||
        (e.target === node.id && e.source === connectedNodeId)
    );
  };

  return (
    <div className="flex flex-col">
      {/* Node Header */}
      <div className="px-4 py-4 border-b border-border">
        <span
          className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
          style={{
            background: NODE_COLORS[node.type] + "15",
            color: NODE_COLORS[node.type],
          }}
        >
          {TYPE_LABELS[node.type]}
        </span>
        <h3 className="text-sm font-bold leading-snug text-text-primary">
          {node.label}
        </h3>
      </div>

      {/* Meta */}
      {node.meta && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-xs text-text-secondary border-b border-border">
          {node.meta.authors && <span>{node.meta.authors}</span>}
          {node.meta.year && <span>{node.meta.year}</span>}
          {node.meta.citations != null && (
            <span>인용 {node.meta.citations.toLocaleString()}</span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs leading-relaxed text-text-secondary">
          {node.content}
        </p>
      </div>

      {/* Concept Evolution (concept 노드만) */}
      {node.type === "concept" && node.meta?.contexts && node.meta.contexts.length > 0 && (
        <div className="px-4 py-3 border-b border-border">
          <h4 className="text-xs font-bold mb-2 text-text-muted">개념 진화</h4>
          <ConceptTimeline
            entries={node.meta.contexts}
            onPaperClick={onNodeClick}
          />
        </div>
      )}

      {/* Connections with editable labels */}
      <div className="px-4 py-3">
        <h4 className="text-xs font-bold mb-2 text-text-muted">
          연결 ({connections.length})
        </h4>
        <div className="flex flex-col gap-1">
          {connections.map(({ node: cn, edgeType }) => {
            const edge = findEdge(cn.id);
            return (
              <div key={cn.id + edgeType} className="px-3 py-2 rounded-xl bg-coral-light/30">
                <button
                  onClick={() => onNodeClick(cn.id)}
                  className="flex items-center gap-2 text-left text-text-primary hover:text-coral transition-colors w-full"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: NODE_COLORS[cn.type] }}
                  />
                  <span className="text-xs truncate flex-1">{cn.label}</span>
                  <span className="text-[10px] text-text-muted shrink-0">
                    {EDGE_TYPE_LABELS[edgeType as keyof typeof EDGE_TYPE_LABELS] ?? edgeType}
                  </span>
                </button>
                {edge && onEdgeLabelUpdate && (
                  <div className="ml-4 mt-1">
                    <EditableLabel
                      value={edge.label ?? ""}
                      onSave={(v) => onEdgeLabelUpdate(edge.id, v)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditorContent() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs text-text-muted">선택한 노드에 대한 메모를 작성하세요</p>
      </div>
      <div className="flex-1 p-4">
        <textarea
          placeholder="여기에 메모를 입력..."
          className="w-full h-full min-h-[200px] bg-coral-light/20 rounded-xl p-3 text-sm text-text-primary placeholder:text-text-muted outline-none border border-border focus:border-coral transition-colors resize-none"
        />
      </div>
      <div className="px-4 py-3 border-t border-border">
        <button className="w-full px-4 py-2 rounded-xl bg-coral text-white text-sm font-bold hover:bg-coral-dark transition-colors">
          메모 저장
        </button>
      </div>
    </div>
  );
}

function ChatContent({
  onSearchKnowledge,
  onNodeClick,
}: {
  onSearchKnowledge?: (query: string) => { answer: string; sources: GraphNode[] };
  onNodeClick: (id: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "내 지식 그래프를 기반으로 질문에 답해드립니다. 논문 간의 관계, 개념 설명 등을 물어보세요.",
    },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || !onSearchKnowledge) return;
    const userMsg: ChatMessage = { role: "user", text: input };
    const result = onSearchKnowledge(input);
    const assistantMsg: ChatMessage = {
      role: "assistant",
      text: result.answer,
      sources: result.sources,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-coral flex items-center justify-center shrink-0">
                <span className="text-[10px] text-white font-bold">D</span>
              </div>
            )}
            <div
              className={`rounded-xl px-3 py-2 max-w-[85%] ${
                msg.role === "user"
                  ? "bg-coral text-white rounded-tr-sm"
                  : "bg-coral-light/40 rounded-tl-sm"
              }`}
            >
              <p className="text-xs leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-[10px] font-semibold text-text-muted">출처 노드:</p>
                  {msg.sources.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onNodeClick(s.id)}
                      className="text-left text-[10px] px-2 py-1.5 rounded-lg border border-border bg-white hover:border-coral/40 transition-colors"
                    >
                      <span className="font-semibold text-text-primary">{s.label}</span>
                      <span className="text-text-muted ml-1">({TYPE_LABELS[s.type]})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="질문을 입력하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 h-9 px-3 rounded-xl bg-white border border-border text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-coral transition-colors"
          />
          <button
            onClick={handleSend}
            className="w-9 h-9 rounded-xl bg-coral text-white flex items-center justify-center hover:bg-coral-dark transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function UploadContent() {
  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-1 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-2xl hover:border-coral/40 transition-colors cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-coral-light flex items-center justify-center">
          <Upload size={20} className="text-coral" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary">파일을 드래그하거나 클릭</p>
          <p className="text-xs text-text-muted mt-1">PDF, TXT, MD 파일 지원</p>
        </div>
      </div>
      <button className="w-full px-4 py-2.5 rounded-xl bg-coral text-white text-sm font-bold hover:bg-coral-dark transition-colors">
        그래프에 추가
      </button>
    </div>
  );
}

export default function RightPanel({
  activeTab,
  node,
  connections,
  open,
  onClose,
  onNodeClick,
  onTabChange,
  onEdgeLabelUpdate,
  allEdges,
  gapMode,
  gapNodes,
  onSearchKnowledge,
  onExport,
}: Props) {

  return (
    <aside
      className="flex flex-col shrink-0 transition-all duration-200 overflow-hidden bg-white"
      style={{
        width: open ? 380 : 0,
        borderLeft: open ? "1px solid var(--border)" : "none",
      }}
    >
      {/* Tab Header */}
      <div className="flex items-center justify-between px-2 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-0.5">
          {Object.entries(TAB_CONFIG).map(([key, { icon: TabIcon, label }]) => (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              title={label}
              className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === key
                  ? "bg-coral-light text-coral"
                  : "text-text-muted hover:text-text-secondary hover:bg-coral-light/30"
              }`}
            >
              <TabIcon size={13} />
              {activeTab === key && <span>{label}</span>}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-xl text-text-muted hover:text-text-secondary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "graph" && (
          <>
            {gapMode && gapNodes ? (
              <GapSummary
                gaps={gapNodes}
                onNodeClick={onNodeClick}
                onWriteMemo={(id) => {
                  onNodeClick(id);
                  onTabChange("editor");
                }}
              />
            ) : (
              <NodeDetailContent
                node={node}
                connections={connections}
                onNodeClick={onNodeClick}
                onEdgeLabelUpdate={onEdgeLabelUpdate}
                allEdges={allEdges}
              />
            )}
          </>
        )}
        {activeTab === "editor" && <EditorContent />}
        {activeTab === "chat" && (
          <ChatContent onSearchKnowledge={onSearchKnowledge} onNodeClick={onNodeClick} />
        )}
        {activeTab === "upload" && <UploadContent />}
      </div>

      {/* Export button */}
      {onExport && (
        <div className="px-4 py-3 border-t border-border shrink-0">
          <button
            onClick={onExport}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:border-coral hover:text-coral transition-colors"
          >
            <Download size={13} />
            내보내기
          </button>
        </div>
      )}
    </aside>
  );
}
