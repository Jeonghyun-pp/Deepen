"use client";

import { useMemo } from "react";
import {
  Search,
  Filter,
  AlertTriangle,
  NotebookPen,
  Map as MapIcon,
  X,
} from "lucide-react";
import type { GraphNode, NodeType, NoteDocument, Roadmap } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";
import Link from "next/link";

const NODE_TYPES: NodeType[] = [
  "paper",
  "concept",
  "technique",
  "application",
  "question",
  "memo",
  "document",
];

interface Props {
  nodes: GraphNode[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNodeClick: (id: string) => void;
  // filters
  activeFilters: Set<NodeType>;
  onToggleFilter: (type: NodeType) => void;
  // gap
  gapMode: boolean;
  onGapToggle: () => void;
  gapCount: number;
  // notes
  notes: NoteDocument[];
  onOpenNoteTab: (noteId: string, label: string) => void;
  // roadmaps
  roadmaps: Roadmap[];
  activeRoadmapId?: string;
  onActivateRoadmap: (roadmapId: string) => void;
  onDeleteRoadmap: (roadmapId: string) => void;
  onClearRoadmap: () => void;
}

export default function LeftSidebar({
  nodes,
  searchQuery,
  onSearchChange,
  onNodeClick,
  activeFilters,
  onToggleFilter,
  gapMode,
  onGapToggle,
  gapCount,
  notes,
  onOpenNoteTab,
  roadmaps,
  activeRoadmapId,
  onActivateRoadmap,
  onDeleteRoadmap,
  onClearRoadmap,
}: Props) {
  // 필터·검색 적용된 노드 (그룹화 표시용)
  const visibleNodes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return nodes
      .filter((n) => activeFilters.has(n.type))
      .filter((n) => {
        if (!q) return true;
        return (
          n.label.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
        );
      });
  }, [nodes, activeFilters, searchQuery]);

  const grouped = useMemo(() => {
    const byType = new Map<NodeType, GraphNode[]>();
    for (const n of visibleNodes) {
      const arr = byType.get(n.type) ?? [];
      arr.push(n);
      byType.set(n.type, arr);
    }
    return NODE_TYPES.map((t) => ({
      type: t,
      nodes: (byType.get(t) ?? []).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    })).filter((g) => g.nodes.length > 0);
  }, [visibleNodes]);

  return (
    <aside className="flex flex-col w-[240px] shrink-0 bg-white h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
        <Link href="/" className="text-lg font-extrabold text-coral">
          Deepen
        </Link>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-gray-50 border border-border focus-within:border-coral transition-colors">
          <Search size={13} className="text-text-muted shrink-0" />
          <input
            type="text"
            placeholder="노드 검색..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-transparent outline-none text-xs flex-1 text-text-primary placeholder:text-text-muted"
          />
        </div>
      </div>

      {/* Node type filters */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Filter size={11} className="text-text-muted" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            타입 필터
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {NODE_TYPES.map((type) => {
            const active = activeFilters.has(type);
            const color = NODE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => onToggleFilter(type)}
                className={`flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                  active ? "opacity-100" : "opacity-50"
                }`}
                style={{
                  border: `1px solid ${active ? color + "40" : "#E8E8F0"}`,
                  background: active ? color + "10" : "transparent",
                  color: active ? color : "#8888A0",
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: color, opacity: active ? 1 : 0.3 }}
                />
                {TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Node list grouped by type */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {grouped.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-text-muted text-center">
            검색 결과 없음
          </div>
        )}
        {grouped.map((g) => (
          <div key={g.type} className="mb-3">
            <div className="flex items-center gap-1.5 px-2 mb-1">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: NODE_COLORS[g.type] }}
              />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {TYPE_LABELS[g.type]} · {g.nodes.length}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {g.nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => onNodeClick(node.id)}
                  className="flex items-center gap-2 px-2 py-1 rounded text-left text-[11px] text-text-secondary hover:bg-coral-light/30 hover:text-text-primary transition-colors truncate cursor-pointer"
                >
                  <span className="truncate">{node.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Roadmaps section */}
      {roadmaps.length > 0 && (
        <div className="px-2 py-2 border-t border-border">
          <div className="flex items-center justify-between px-2 mb-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              로드맵
            </p>
            {activeRoadmapId && (
              <button
                onClick={onClearRoadmap}
                className="text-[9px] text-coral hover:underline"
                title="활성 로드맵 해제"
              >
                해제
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {roadmaps.map((rm) => {
              const active = rm.id === activeRoadmapId;
              const sourceColor =
                rm.source === "seed"
                  ? "text-emerald-500"
                  : rm.source === "agent"
                  ? "text-purple-500"
                  : "text-teal-500";
              return (
                <div
                  key={rm.id}
                  className={`group flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                    active
                      ? "bg-coral-light text-coral"
                      : "text-text-secondary hover:bg-coral-light/30 hover:text-text-primary"
                  }`}
                >
                  <button
                    onClick={() => onActivateRoadmap(rm.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <MapIcon size={11} className={`shrink-0 ${active ? "text-coral" : sourceColor}`} />
                    <span className="text-[11px] truncate">{rm.title}</span>
                    <span className="text-[9px] text-text-muted shrink-0">
                      {rm.nodeIds.length}
                    </span>
                  </button>
                  {rm.source !== "seed" && (
                    <button
                      onClick={() => onDeleteRoadmap(rm.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-text-muted hover:text-coral transition-opacity"
                      title="삭제"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes section */}
      {notes.length > 0 && (
        <div className="px-2 py-2 border-t border-border">
          <p className="px-2 text-[10px] font-bold text-text-muted mb-1 uppercase tracking-wider">
            노트
          </p>
          <div className="flex flex-col gap-0.5">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => onOpenNoteTab(note.id, note.title)}
                className="flex items-center gap-2 px-2 py-1 rounded text-left text-[11px] text-text-secondary hover:bg-coral-light/30 hover:text-text-primary transition-colors truncate cursor-pointer"
              >
                <NotebookPen size={11} className="text-amber-500 shrink-0" />
                <span className="truncate">{note.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gap analysis */}
      <div className="px-3 py-2 border-t border-border">
        <button
          onClick={onGapToggle}
          className={`w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-colors border cursor-pointer ${
            gapMode
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "text-text-muted border-border hover:border-amber-200 hover:text-amber-600"
          }`}
        >
          <AlertTriangle size={12} />
          갭 분석 {gapCount > 0 && <span className="text-[10px]">({gapCount})</span>}
        </button>
      </div>
    </aside>
  );
}
