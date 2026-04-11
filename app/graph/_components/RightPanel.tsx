"use client";

import { useState } from "react";
import { X, BookOpen, PenLine, MessageCircle, Upload, Download, ExternalLink, Map, type LucideIcon } from "lucide-react";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS, EDGE_TYPE_LABELS } from "../_data/colors";
import ConceptTimeline from "./ConceptTimeline";
import GapSummary from "./GapSummary";
import ChatPanel from "./ChatPanel";
import type { ChatMessage } from "../_hooks/useAgent";

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
  // agent chat
  agentMessages?: ChatMessage[];
  agentLoading?: boolean;
  onAgentSend?: (text: string) => void;
  onAgentApprove?: (decisions: Record<string, boolean>) => Promise<void> | void;
  onActivateRoadmap?: (pathNodeIds: string[]) => void;
  // export
  onExport?: () => void;
  // open in tab
  onOpenDocTab?: (nodeId: string, label: string) => void;
  onOpenNoteTab?: (noteId: string, label: string) => void;
  hasNote?: (nodeId: string) => boolean;
  // create roadmap from this node
  onCreateRoadmapFromNode?: (nodeId: string) => void;
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
  onOpenDocTab,
  onOpenNoteTab,
  hasNote,
  onCreateRoadmapFromNode,
}: {
  node: GraphNode | null;
  connections: ConnectedNode[];
  onNodeClick: (id: string) => void;
  onEdgeLabelUpdate?: (edgeId: string, label: string) => void;
  allEdges?: { id: string; source: string; target: string; label?: string }[];
  onOpenDocTab?: (nodeId: string, label: string) => void;
  onOpenNoteTab?: (noteId: string, label: string) => void;
  hasNote?: (nodeId: string) => boolean;
  onCreateRoadmapFromNode?: (nodeId: string) => void;
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

      {/* Action buttons */}
      <div className="px-4 py-2 border-b border-border flex flex-col gap-1.5">
        {(node.type === "paper" || node.type === "document" || (node.type === "memo" && hasNote?.(node.id))) && (
          <button
            onClick={() => {
              if (node.type === "paper" || node.type === "document") {
                onOpenDocTab?.(node.id, node.label);
              } else if (node.type === "memo") {
                onOpenNoteTab?.(node.id, node.label);
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl border border-coral/30 text-xs font-semibold text-coral hover:bg-coral-light transition-colors"
          >
            <ExternalLink size={12} />
            탭에서 열기
          </button>
        )}
        {onCreateRoadmapFromNode && (
          <button
            onClick={() => onCreateRoadmapFromNode(node.id)}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl border border-blue-300 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            title="이 노드를 이해하기 위한 prereq chain 자동 생성"
          >
            <Map size={12} />
            이 노드 학습 경로 만들기
          </button>
        )}
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
  agentMessages,
  agentLoading,
  onAgentSend,
  onAgentApprove,
  onActivateRoadmap,
  onExport,
  onOpenDocTab,
  onOpenNoteTab,
  hasNote,
  onCreateRoadmapFromNode,
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
                onOpenDocTab={onOpenDocTab}
                onOpenNoteTab={onOpenNoteTab}
                hasNote={hasNote}
                onCreateRoadmapFromNode={onCreateRoadmapFromNode}
              />
            )}
          </>
        )}
        {activeTab === "editor" && <EditorContent />}
        {activeTab === "chat" && (
          <ChatPanel
            messages={agentMessages ?? []}
            isLoading={agentLoading ?? false}
            onSend={onAgentSend ?? (() => {})}
            onApprove={onAgentApprove ?? (async () => {})}
            onActivateRoadmap={onActivateRoadmap}
            onNavigateToNode={onNodeClick}
          />
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
