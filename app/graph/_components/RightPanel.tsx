"use client";

import { X, BookOpen, PenLine, MessageCircle, Upload, Send, type LucideIcon } from "lucide-react";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS, EDGE_TYPE_LABELS } from "../_data/colors";

interface ConnectedNode {
  node: GraphNode;
  edgeType: string;
}

interface Props {
  activeTab: string;
  node: GraphNode | null;
  connections: ConnectedNode[];
  open: boolean;
  onClose: () => void;
  onNodeClick: (id: string) => void;
  onTabChange: (tab: string) => void;
}

const TAB_CONFIG: Record<string, { icon: LucideIcon; label: string }> = {
  graph: { icon: BookOpen, label: "노드 상세" },
  editor: { icon: PenLine, label: "메모 에디터" },
  chat: { icon: MessageCircle, label: "AI 어시스턴트" },
  upload: { icon: Upload, label: "파일 업로드" },
};

function NodeDetailContent({
  node,
  connections,
  onNodeClick,
}: {
  node: GraphNode | null;
  connections: ConnectedNode[];
  onNodeClick: (id: string) => void;
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

      {/* Connections */}
      <div className="px-4 py-3">
        <h4 className="text-xs font-bold mb-2 text-text-muted">
          연결 ({connections.length})
        </h4>
        <div className="flex flex-col gap-1">
          {connections.map(({ node: cn, edgeType }) => (
            <button
              key={cn.id + edgeType}
              onClick={() => onNodeClick(cn.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-text-primary bg-coral-light/30 hover:bg-coral-light transition-colors"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: NODE_COLORS[cn.type] }}
              />
              <span className="text-xs truncate flex-1">{cn.label}</span>
              <span className="text-[10px] text-text-muted">
                {EDGE_TYPE_LABELS[edgeType as keyof typeof EDGE_TYPE_LABELS] ?? edgeType}
              </span>
            </button>
          ))}
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

function ChatContent() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
        {/* Sample AI message */}
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-coral flex items-center justify-center shrink-0">
            <span className="text-[10px] text-white font-bold">D</span>
          </div>
          <div className="bg-coral-light/40 rounded-xl rounded-tl-sm px-3 py-2 max-w-[85%]">
            <p className="text-xs text-text-primary leading-relaxed">
              안녕하세요! 지식 그래프에 대해 궁금한 점을 물어보세요. 논문 간의 관계, 개념 설명, 연구 방향 추천 등을 도와드릴 수 있습니다.
            </p>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="질문을 입력하세요..."
            className="flex-1 h-9 px-3 rounded-xl bg-white border border-border text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-coral transition-colors"
          />
          <button className="w-9 h-9 rounded-xl bg-coral text-white flex items-center justify-center hover:bg-coral-dark transition-colors">
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
          <NodeDetailContent node={node} connections={connections} onNodeClick={onNodeClick} />
        )}
        {activeTab === "editor" && <EditorContent />}
        {activeTab === "chat" && <ChatContent />}
        {activeTab === "upload" && <UploadContent />}
      </div>
    </aside>
  );
}
