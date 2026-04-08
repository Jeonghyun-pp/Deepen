"use client";

import { useState } from "react";
import { Search, Plus, ChevronRight, Trash2, Eye, FolderOpen, AlertTriangle } from "lucide-react";
import type { GraphNode, RoadmapModule, NodeType } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";
import Link from "next/link";

const NODE_TYPES: NodeType[] = ["paper", "concept", "memo", "document"];

interface Props {
  roadmaps: RoadmapModule[];
  nodes: GraphNode[];
  activeRoadmapId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRoadmapClick: (id: string) => void;
  onNodeClick: (id: string) => void;
  onAddRoadmap: (name: string) => void;
  onRemoveRoadmap: (id: string) => void;
  onOpenRoadmapTab: (id: string, name: string) => void;
  // filters
  activeFilters: Set<NodeType>;
  onToggleFilter: (type: NodeType) => void;
  // gap
  gapMode: boolean;
  onGapToggle: () => void;
  gapCount: number;
}

export default function LeftSidebar({
  roadmaps,
  nodes,
  activeRoadmapId,
  searchQuery,
  onSearchChange,
  onRoadmapClick,
  onNodeClick,
  onAddRoadmap,
  onRemoveRoadmap,
  onOpenRoadmapTab,
  activeFilters,
  onToggleFilter,
  gapMode,
  onGapToggle,
  gapCount,
}: Props) {
  const [newRoadmapName, setNewRoadmapName] = useState("");
  const [showAddInput, setShowAddInput] = useState(false);
  const [expandedRoadmaps, setExpandedRoadmaps] = useState<Set<string>>(
    () => new Set(roadmaps.map((r) => r.id))
  );

  const toggleExpand = (id: string) => {
    setExpandedRoadmaps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddRoadmap = () => {
    if (!newRoadmapName.trim()) return;
    onAddRoadmap(newRoadmapName.trim());
    setNewRoadmapName("");
    setShowAddInput(false);
  };

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <aside className="flex flex-col w-[240px] shrink-0 bg-white border-r border-border h-full">
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
        <div className="flex flex-wrap gap-1">
          {NODE_TYPES.map((type) => {
            const active = activeFilters.has(type);
            const color = NODE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => onToggleFilter(type)}
                className={`flex items-center gap-1 h-6 px-2 rounded-full text-[10px] font-semibold transition-all ${
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

      {/* "전체" button */}
      <div className="px-3 py-2 border-b border-border">
        <button
          onClick={() => onRoadmapClick("")}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeRoadmapId === null
              ? "bg-coral-light text-coral"
              : "text-text-secondary hover:bg-gray-50"
          }`}
        >
          <FolderOpen size={13} />
          전체 보기
        </button>
      </div>

      {/* Roadmap list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {roadmaps.map((rm) => {
          const isActive = activeRoadmapId === rm.id;
          const isExpanded = expandedRoadmaps.has(rm.id);

          return (
            <div key={rm.id} className="mb-1">
              {/* Roadmap header */}
              <div
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg group cursor-pointer transition-colors ${
                  isActive ? "bg-coral-light/60" : "hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => toggleExpand(rm.id)}
                  className="text-text-muted hover:text-text-secondary p-0.5"
                >
                  <ChevronRight
                    size={12}
                    className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>
                <button
                  onClick={() => onRoadmapClick(rm.id)}
                  className={`flex-1 text-left text-xs font-semibold truncate ${
                    isActive ? "text-coral" : "text-text-primary"
                  }`}
                >
                  {rm.name}
                </button>
                <span className="text-[10px] text-text-muted">{rm.entries.length}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenRoadmapTab(rm.id, rm.name); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-coral transition-all"
                  title="로드맵 보기"
                >
                  <Eye size={11} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveRoadmap(rm.id); }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-red-500 transition-all"
                  title="삭제"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Node list */}
              {isExpanded && (
                <div className="ml-5 mt-0.5 flex flex-col gap-0.5">
                  {rm.entries.map((entry) => {
                    const node = getNodeById(entry.nodeId);
                    if (!node) return null;
                    return (
                      <button
                        key={entry.nodeId}
                        onClick={() => onNodeClick(entry.nodeId)}
                        className="flex items-center gap-2 px-2 py-1 rounded text-left text-[11px] text-text-secondary hover:bg-coral-light/30 hover:text-text-primary transition-colors truncate"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: NODE_COLORS[node.type] }}
                        />
                        <span className="truncate">{node.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Gap analysis + Add roadmap */}
      <div className="px-3 py-2 border-t border-border flex flex-col gap-2">
        {/* Gap toggle */}
        <button
          onClick={onGapToggle}
          className={`w-full flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-colors border ${
            gapMode
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "text-text-muted border-border hover:border-amber-200 hover:text-amber-600"
          }`}
        >
          <AlertTriangle size={12} />
          갭 분석 {gapCount > 0 && <span className="text-[10px]">({gapCount})</span>}
        </button>

        {/* Add roadmap */}
        {showAddInput ? (
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={newRoadmapName}
              onChange={(e) => setNewRoadmapName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddRoadmap();
                if (e.key === "Escape") setShowAddInput(false);
              }}
              placeholder="로드맵 이름..."
              className="flex-1 h-7 px-2 text-xs rounded-lg border border-border outline-none focus:border-coral"
            />
            <button
              onClick={handleAddRoadmap}
              className="px-2 h-7 text-xs font-semibold rounded-lg bg-coral text-white hover:bg-coral-dark"
            >
              추가
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddInput(true)}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-border text-xs font-semibold text-text-muted hover:border-coral hover:text-coral transition-colors"
          >
            <Plus size={13} />
            새 로드맵
          </button>
        )}
      </div>
    </aside>
  );
}
