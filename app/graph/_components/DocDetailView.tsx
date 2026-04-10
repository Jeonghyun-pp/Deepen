"use client";

import { useMemo } from "react";
import type { GraphData, GraphNode } from "../_data/types";
import { getPaperSubgraph, DEFAULT_SECTION_ORDER } from "../_data/projection";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";
import ProjectionSection from "./doc/ProjectionSection";

interface Props {
  nodeId: string;
  node?: GraphNode | null;
  graphData: GraphData;
  onNavigateToNode: (id: string) => void;
}

export default function DocDetailView({
  nodeId,
  node,
  graphData,
  onNavigateToNode,
}: Props) {
  const subgraph = useMemo(
    () => getPaperSubgraph(graphData, nodeId, DEFAULT_SECTION_ORDER),
    [graphData, nodeId],
  );

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center text-text-muted text-sm">
        노드를 찾을 수 없습니다.
      </div>
    );
  }

  const nodeColor = NODE_COLORS[node.type];
  const typeLabel = TYPE_LABELS[node.type];
  const hasAnySection =
    subgraph?.sections.some((s) => s.items.length > 0) ?? false;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* ==================== Header ==================== */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: nodeColor + "18", color: nodeColor }}
          >
            {typeLabel}
          </span>
          {node.meta?.year && (
            <span className="text-[11px] text-text-muted font-semibold">
              {node.meta.year}
            </span>
          )}
        </div>
        <h1 className="text-xl font-extrabold text-text-primary leading-snug mb-2">
          {node.label}
        </h1>
        {node.meta?.authors && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary mb-4">
            <span>{node.meta.authors}</span>
            {node.meta?.citations != null && (
              <span>· {node.meta.citations.toLocaleString()} citations</span>
            )}
          </div>
        )}

        {/* TLDR */}
        {node.tldr && (
          <div className="p-4 rounded-xl bg-coral-light/30 border border-coral/20 mb-4">
            <h3 className="text-[10px] font-bold text-coral mb-1 tracking-wider">
              TLDR
            </h3>
            <p className="text-sm text-text-primary leading-relaxed">
              {node.tldr}
            </p>
          </div>
        )}

        {/* Content / Description */}
        {node.content && (
          <div className="p-4 rounded-xl bg-gray-50 border border-border mb-6">
            <p className="text-sm text-text-secondary leading-relaxed">
              {node.content}
            </p>
          </div>
        )}

        {/* ==================== Graph Projection Sections ==================== */}
        {subgraph && hasAnySection ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[10px] font-bold text-text-muted tracking-wider">
                GRAPH 연결
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {subgraph.sections.map((section) => (
              <ProjectionSection
                key={section.relationType}
                section={section}
                onItemClick={onNavigateToNode}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-text-muted">
            이 노드와 연결된 관계 정보가 아직 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
