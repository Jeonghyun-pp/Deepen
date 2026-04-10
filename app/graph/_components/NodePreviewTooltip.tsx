"use client";

import { createPortal } from "react-dom";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";

interface Props {
  node: GraphNode;
  x: number;
  y: number;
  edgeCount?: number;
}

const TOOLTIP_W = 260;
const TOOLTIP_H_EST = 110;
const OFFSET = 14;

export default function NodePreviewTooltip({ node, x, y, edgeCount }: Props) {
  if (typeof window === "undefined") return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = x + OFFSET;
  let top = y + OFFSET;
  if (left + TOOLTIP_W > vw - 8) left = x - TOOLTIP_W - OFFSET;
  if (top + TOOLTIP_H_EST > vh - 8) top = y - TOOLTIP_H_EST - OFFSET;

  const color = NODE_COLORS[node.type];
  const typeLabel = TYPE_LABELS[node.type];

  return createPortal(
    <div
      className="fixed z-[9998] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left,
        top,
        width: TOOLTIP_W,
      }}
    >
      <div className="rounded-xl border border-border bg-white/95 backdrop-blur shadow-lg px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: color }}
          />
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: color + "18", color }}
          >
            {typeLabel}
          </span>
          {node.meta?.year && (
            <span className="text-[10px] text-text-muted font-semibold">
              {node.meta.year}
            </span>
          )}
          {edgeCount != null && (
            <span className="text-[10px] text-text-muted ml-auto">
              · {edgeCount} 연결
            </span>
          )}
        </div>
        <div className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
          {node.label}
        </div>
        {(node.tldr || node.content) && (
          <p className="text-[11px] text-text-secondary leading-snug mt-1 line-clamp-2">
            {node.tldr ?? node.content}
          </p>
        )}
        <div className="mt-2 pt-1.5 border-t border-border text-[9px] text-text-muted">
          click: 상세 · shift+click: 메모
        </div>
      </div>
    </div>,
    document.body,
  );
}
