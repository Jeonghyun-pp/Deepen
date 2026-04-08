"use client";

import { type RefObject } from "react";
import type { CanvasTab, GraphData, GraphNode, RoadmapModule } from "../_data/types";
import type { ViewMode, LayoutId } from "../_hooks/useGraphData";
import GraphCanvasWrapper, { type GraphCanvasHandle } from "./GraphCanvas";
import PaperDetailView from "./PaperDetailView";
import RoadmapTimelineView from "./RoadmapTimelineView";

interface Props {
  activeTab: CanvasTab;
  // Graph props
  graphRef: RefObject<GraphCanvasHandle | null>;
  filteredData: GraphData;
  viewMode: ViewMode;
  layoutId: LayoutId;
  selections: string[];
  actives: string[];
  gapNodeIds?: Set<string>;
  onNodeClick: (id: string) => void;
  onNodeDoubleClick: (id: string) => void;
  onCanvasClick: () => void;
  // Paper detail props
  allNodes: GraphNode[];
  // Roadmap props
  roadmaps: RoadmapModule[];
  onPaperTabOpen: (paperId: string, label: string) => void;
  onNodeSelect: (id: string) => void;
}

export default function CanvasArea({
  activeTab,
  graphRef,
  filteredData,
  viewMode,
  layoutId,
  selections,
  actives,
  gapNodeIds,
  onNodeClick,
  onNodeDoubleClick,
  onCanvasClick,
  allNodes,
  roadmaps,
  onPaperTabOpen,
  onNodeSelect,
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
          selections={selections}
          actives={actives}
          gapNodeIds={gapNodeIds}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onCanvasClick={onCanvasClick}
        />
      </div>

      {/* Paper detail tab */}
      {activeTab.type === "paper-detail" && activeTab.paperId && (
        <PaperDetailView
          paperId={activeTab.paperId}
          node={allNodes.find((n) => n.id === activeTab.paperId) ?? null}
        />
      )}

      {/* Roadmap timeline tab */}
      {activeTab.type === "roadmap-timeline" && activeTab.roadmapId && (() => {
        const rm = roadmaps.find((r) => r.id === activeTab.roadmapId);
        if (!rm) return null;
        return (
          <RoadmapTimelineView
            roadmap={rm}
            nodes={allNodes}
            onPaperClick={onPaperTabOpen}
            onNodeSelect={onNodeSelect}
          />
        );
      })()}
    </div>
  );
}
