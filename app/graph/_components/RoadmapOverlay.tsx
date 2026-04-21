"use client";

import { ChevronLeft, ChevronRight, X, MapPin } from "lucide-react";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";

interface Props {
  pathNodeIds: string[];
  currentIndex: number;
  nodes: GraphNode[];
  onAdvance: () => void;
  onBack: () => void;
  onJumpTo: (index: number) => void;
  onClear: () => void;
}

export default function RoadmapOverlay({
  pathNodeIds,
  currentIndex,
  nodes,
  onAdvance,
  onBack,
  onJumpTo,
  onClear,
}: Props) {
  if (pathNodeIds.length === 0) return null;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const currentId = pathNodeIds[currentIndex];
  const currentNode = nodeById.get(currentId);
  if (!currentNode) return null;

  const currentColor = NODE_COLORS[currentNode.type];
  const canAdvance = currentIndex < pathNodeIds.length - 1;
  const canBack = currentIndex > 0;

  return (
    <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-20 w-[min(640px,90%)]">
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[color:var(--v2-ink-soft)]/90 backdrop-blur-md px-4 py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: currentColor + "22", color: currentColor }}
          >
            <MapPin size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold text-white/50 tracking-wider">
              ROADMAP · Step {currentIndex + 1} / {pathNodeIds.length}
            </div>
            <div className="text-sm font-bold text-white truncate">
              {currentNode.label}
            </div>
          </div>
          <button
            onClick={onClear}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            title="로드맵 종료"
          >
            <X size={14} />
          </button>
        </div>

        {/* Dot track */}
        <div className="flex items-center gap-1 mb-2.5">
          {pathNodeIds.map((id, idx) => {
            const node = nodeById.get(id);
            const color = node ? NODE_COLORS[node.type] : "#9ca3af";
            const active = idx === currentIndex;
            const passed = idx < currentIndex;
            return (
              <button
                key={id + idx}
                onClick={() => onJumpTo(idx)}
                className="flex-1 h-1.5 rounded-full transition-all cursor-pointer"
                style={{
                  background: active
                    ? color
                    : passed
                      ? color + "80"
                      : "rgba(255,255,255,0.1)",
                }}
                title={node ? `${node.label} (${TYPE_LABELS[node.type]})` : id}
              />
            );
          })}
        </div>

        {/* Nav row */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            disabled={!canBack}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-white/75 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            <ChevronLeft size={12} />
            이전
          </button>
          <div className="flex-1 text-center text-[11px] text-white/50">
            {currentNode.tldr ?? "다음 단계로 진행하세요"}
          </div>
          <button
            onClick={onAdvance}
            disabled={!canAdvance}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-black disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
            style={{ background: canAdvance ? "#4ADE80" : "#374151" }}
          >
            다음
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
