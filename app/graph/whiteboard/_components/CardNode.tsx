"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import type { GraphNode } from "../../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../../_data/colors";
import { useWhiteboardStore } from "../../_store/whiteboardStore";

// Whiteboard 카드 노드. 내용을 인라인으로 보여주고, 펼침/접힘 토글 지원.
// Phase 4에서 펼침 상태는 whiteboardStore.expanded에 영속됨.

export type CardNodeData = {
  node: GraphNode;
};

function CardNodeComponent({ id, data, selected }: NodeProps) {
  const node = (data as CardNodeData).node;
  const expanded = useWhiteboardStore((s) => !!s.expanded[id]);
  const toggleExpanded = useWhiteboardStore((s) => s.toggleExpanded);
  const sections = useWhiteboardStore((s) => s.sections);
  const assignNodeToSection = useWhiteboardStore((s) => s.assignNodeToSection);
  const [menuOpen, setMenuOpen] = useState(false);

  const typeColor = NODE_COLORS[node.type];
  const typeLabel = TYPE_LABELS[node.type];
  const currentSection = sections.find((s) => s.nodeIds.includes(id));

  return (
    <div
      className="rounded-lg border bg-white transition-shadow"
      style={{
        width: expanded ? 320 : 240,
        borderColor: selected ? "#2563eb" : "#e5e7eb",
        boxShadow: selected
          ? "0 0 0 3px rgba(37,99,235,0.15)"
          : "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {/* Handles: 4방향 (Phase 7 엣지 라우팅에서 활용) */}
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />

      {/* Header strip */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border/60 text-[10px] font-medium uppercase tracking-wide"
        style={{ color: typeColor }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: typeColor }}
        />
        <span>{typeLabel}</span>
        {currentSection && (
          <span
            className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-normal normal-case tracking-normal"
            style={{
              background: `${currentSection.color}26`,
              color: currentSection.color,
            }}
            title={`섹션: ${currentSection.title}`}
          >
            {currentSection.title}
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5 relative">
          {sections.length > 0 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 text-gray-500"
                title="섹션에 추가/제거"
              >
                <FolderPlus size={12} />
              </button>
              {menuOpen && (
                <div className="absolute top-6 right-0 min-w-[140px] bg-white border border-border rounded shadow-lg py-1 z-50 text-text">
                  {sections.map((sec) => {
                    const isIn = sec.nodeIds.includes(id);
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          assignNodeToSection(id, isIn ? null : sec.id);
                          setMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1 text-[11px] normal-case tracking-normal font-normal hover:bg-gray-50 flex items-center gap-1.5"
                      >
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: sec.color }}
                        />
                        <span className="flex-1 truncate">{sec.title}</span>
                        {isIn && <span className="text-[9px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(id);
            }}
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 text-gray-500"
            aria-label={expanded ? "접기" : "펼치기"}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="px-3 pt-2 pb-1">
        <div className="text-sm font-semibold text-text leading-snug line-clamp-2">
          {node.label}
        </div>
      </div>

      {/* tldr preview (when collapsed) */}
      {!expanded && node.tldr && (
        <div className="px-3 pb-2 text-[11px] text-text-muted leading-relaxed line-clamp-2">
          {node.tldr}
        </div>
      )}

      {/* Meta (paper) — collapsed mode */}
      {!expanded && node.meta && (
        <div className="px-3 pb-2 text-[10px] text-text-muted flex items-center gap-1.5 flex-wrap">
          {node.meta.authors && <span>{node.meta.authors}</span>}
          {node.meta.year && <span>· {node.meta.year}</span>}
          {typeof node.meta.citations === "number" && (
            <span>· {node.meta.citations}회 인용</span>
          )}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3">
          {node.tldr && (
            <div className="text-[11px] text-text-muted italic mb-2 leading-relaxed">
              {node.tldr}
            </div>
          )}
          {node.content && (
            <div className="text-[12px] text-text leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto">
              {node.content}
            </div>
          )}
          {node.meta && (
            <div className="mt-2 pt-2 border-t border-border/60 text-[10px] text-text-muted space-y-0.5">
              {node.meta.authors && (
                <div>
                  <span className="font-medium">저자:</span> {node.meta.authors}
                </div>
              )}
              {node.meta.year && (
                <div>
                  <span className="font-medium">연도:</span> {node.meta.year}
                </div>
              )}
              {typeof node.meta.citations === "number" && (
                <div>
                  <span className="font-medium">인용:</span>{" "}
                  {node.meta.citations}회
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(CardNodeComponent);
