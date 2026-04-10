"use client";

import { type RefObject } from "react";
import type { CanvasTab, GraphData, GraphNode, NoteDocument } from "../_data/types";
import type { ViewMode, LayoutId, EdgeStyle, RelevanceDensity } from "../_hooks/useGraphData";
import GraphCanvasWrapper, { type GraphCanvasHandle, type NodeClickEvent, type NodeHoverEvent } from "./GraphCanvas";
import DocDetailView from "./DocDetailView";
import NoteCanvasView from "./NoteCanvasView";
import GraphStatusBar from "./GraphStatusBar";

interface Props {
  activeTab: CanvasTab;
  // Graph props
  graphRef: RefObject<GraphCanvasHandle | null>;
  filteredData: GraphData;
  viewMode: ViewMode;
  layoutId: LayoutId;
  edgeStyle: EdgeStyle;
  selections: string[];
  actives: string[];
  gapNodeIds?: Set<string>;
  onNodeClick: (event: NodeClickEvent) => void;
  onNodeDoubleClick: (id: string) => void;
  onCanvasClick: () => void;
  onNodeHover?: (event: NodeHoverEvent | null) => void;
  // Paper detail props
  allNodes: GraphNode[];
  onNodeSelect: (id: string) => void;
  // Note props
  notes: NoteDocument[];
  onNoteUpdate: (noteId: string, updates: Partial<Pick<NoteDocument, "title" | "blocks" | "references">>) => void;
  // Status bar props
  statusBar: {
    viewMode: ViewMode;
    onViewModeChange: (mode: ViewMode) => void;
    layoutId: LayoutId;
    onLayoutChange: (id: LayoutId) => void;
    edgeStyle: EdgeStyle;
    onEdgeStyleChange: (style: EdgeStyle) => void;
    relevanceDensity: RelevanceDensity;
    onRelevanceDensityChange: (d: RelevanceDensity) => void;
    localMode: boolean;
    onLocalToggle: () => void;
    onFit: () => void;
    nodeCount: number;
    edgeCount: number;
  };
}

export default function CanvasArea({
  activeTab,
  graphRef,
  filteredData,
  viewMode,
  layoutId,
  edgeStyle,
  selections,
  actives,
  gapNodeIds,
  onNodeClick,
  onNodeDoubleClick,
  onCanvasClick,
  onNodeHover,
  allNodes,
  onNodeSelect,
  notes,
  onNoteUpdate,
  statusBar,
}: Props) {
  // Graph is always mounted but hidden when not active (preserve layout state)
  const isGraphActive = activeTab.type === "graph";

  return (
    <div className="flex-1 relative overflow-hidden">
      {/* Graph canvas — always mounted, visibility toggled */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          visibility: isGraphActive ? "visible" : "hidden",
          pointerEvents: isGraphActive ? "auto" : "none",
        }}
      >
        <GraphCanvasWrapper
          ref={graphRef}
          data={filteredData}
          viewMode={viewMode}
          layoutId={layoutId}
          edgeStyle={edgeStyle}
          selections={selections}
          actives={actives}
          gapNodeIds={gapNodeIds}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onCanvasClick={onCanvasClick}
          onNodeHover={onNodeHover}
        />
        {/* Floating status bar */}
        {isGraphActive && <GraphStatusBar {...statusBar} />}
      </div>

      {/* Document detail tab */}
      {activeTab.type === "doc" && activeTab.nodeId && (
        <DocDetailView
          nodeId={activeTab.nodeId}
          node={allNodes.find((n) => n.id === activeTab.nodeId) ?? null}
          graphData={filteredData}
          onNavigateToNode={onNodeSelect}
        />
      )}

      {/* Note canvas tab */}
      {activeTab.type === "note" && activeTab.noteId && (() => {
        const note = notes.find((n) => n.id === activeTab.noteId);
        if (!note) return null;
        return (
          <NoteCanvasView
            note={note}
            allNodes={allNodes}
            onUpdate={(updates) => onNoteUpdate(activeTab.noteId!, updates)}
            onNodeClick={onNodeSelect}
          />
        );
      })()}
    </div>
  );
}
