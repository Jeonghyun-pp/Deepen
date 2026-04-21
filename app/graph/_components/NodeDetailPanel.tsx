"use client";

import { X, ExternalLink } from "lucide-react";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS, EDGE_TYPE_LABELS } from "../_data/colors";

interface ConnectedNode {
  node: GraphNode;
  edgeType: string;
}

interface Props {
  node: GraphNode | null;
  connections: ConnectedNode[];
  open: boolean;
  onClose: () => void;
  onNodeClick: (id: string) => void;
}

export default function NodeDetailPanel({
  node,
  connections,
  open,
  onClose,
  onNodeClick,
}: Props) {
  return (
    <aside
      className="flex flex-col shrink-0 transition-all duration-200 overflow-hidden bg-[color:var(--v2-ink-soft)]/85 backdrop-blur-md"
      style={{
        width: open ? 380 : 0,
        borderLeft: open ? "1px solid rgba(255,255,255,0.1)" : "none",
      }}
    >
      {node ? (
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-white/10">
            <div className="flex-1 min-w-0">
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                style={{
                  background: NODE_COLORS[node.type] + "1f",
                  color: NODE_COLORS[node.type],
                }}
              >
                {TYPE_LABELS[node.type]}
              </span>
              <h3 className="text-sm font-bold leading-snug text-white">
                {node.label}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-white/50 hover:text-white/80 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Meta */}
          {node.meta && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 py-3 text-xs text-white/75 border-b border-white/10">
              {node.meta.authors && <span>{node.meta.authors}</span>}
              {node.meta.year && <span>{node.meta.year}</span>}
              {node.meta.citations != null && (
                <span>인용 {node.meta.citations.toLocaleString()}</span>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs leading-relaxed text-white/75">
              {node.content}
            </p>
          </div>

          {/* Connections */}
          <div className="px-4 py-3 flex-1">
            <h4 className="text-xs font-bold mb-2 text-white/50">
              연결 ({connections.length})
            </h4>
            <div className="flex flex-col gap-1">
              {connections.map(({ node: cn, edgeType }) => (
                <button
                  key={cn.id + edgeType}
                  onClick={() => onNodeClick(cn.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: NODE_COLORS[cn.type] }}
                  />
                  <span className="text-xs truncate flex-1">{cn.label}</span>
                  <span className="text-[10px] text-white/50">
                    {EDGE_TYPE_LABELS[edgeType as keyof typeof EDGE_TYPE_LABELS] ?? edgeType}
                  </span>
                  <ExternalLink size={10} className="text-white/50" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-xs text-white/50">
            노드를 클릭하면 상세 정보가 표시됩니다
          </p>
        </div>
      )}
    </aside>
  );
}
