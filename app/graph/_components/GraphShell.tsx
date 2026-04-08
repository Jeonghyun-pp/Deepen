"use client";

import { useRef, useState, useCallback } from "react";
import { sampleGraphData } from "../_data/sample-data";
import { useGraphData } from "../_hooks/useGraphData";
import type { GraphCanvasHandle } from "./GraphCanvas";
import LeftSidebar from "./LeftSidebar";
import CanvasTabBar from "./CanvasTabBar";
import CanvasArea from "./CanvasArea";
import GraphStatusBar from "./GraphStatusBar";
import RightPanel from "./RightPanel";
import ExportModal from "./ExportModal";

export default function GraphShell() {
  const [rightTab, setRightTab] = useState("graph");
  const [exportOpen, setExportOpen] = useState(false);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const gd = useGraphData(sampleGraphData);

  const handleNodeClick = useCallback(
    (id: string) => {
      gd.selectNode(id);
      setRightTab("graph");
      gd.setPanelOpen(true);
      if (gd.activeTab.type !== "graph") {
        gd.setActiveTabId("graph");
      }
      graphRef.current?.centerGraph([id]);
    },
    [gd]
  );

  const handleNodeDoubleClick = useCallback(
    (id: string) => {
      const node = gd.fullData.nodes.find((n) => n.id === id);
      if (node && node.type === "paper") {
        gd.openPaperTab(id, node.label);
      }
    },
    [gd]
  );

  const handleCanvasClick = useCallback(() => {
    if (!gd.localMode) gd.selectNode(null);
  }, [gd]);

  const handleFit = useCallback(() => {
    graphRef.current?.fitView();
  }, []);

  const handleSidebarNodeClick = useCallback(
    (id: string) => {
      gd.selectNode(id);
      gd.setActiveTabId("graph");
      setRightTab("graph");
      gd.setPanelOpen(true);
      setTimeout(() => graphRef.current?.centerGraph([id]), 100);
    },
    [gd]
  );

  const handleNodeSelectFromTab = useCallback(
    (id: string) => {
      gd.selectNode(id);
      gd.setActiveTabId("graph");
      setRightTab("graph");
      gd.setPanelOpen(true);
      setTimeout(() => graphRef.current?.centerGraph([id]), 100);
    },
    [gd]
  );

  const connections = gd.selectedNode
    ? gd.getConnectedNodes(gd.selectedNode.id)
    : [];

  const selections = gd.selectedNode ? [gd.selectedNode.id] : [];
  const actives = gd.searchMatchIds.length > 0 ? gd.searchMatchIds : [];

  const isGraphTab = gd.activeTab.type === "graph";

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar */}
      <LeftSidebar
        roadmaps={gd.fullData.roadmaps}
        nodes={gd.fullData.nodes}
        activeRoadmapId={gd.activeRoadmapId}
        searchQuery={gd.searchQuery}
        onSearchChange={gd.setSearchQuery}
        onRoadmapClick={gd.setActiveRoadmapId}
        onNodeClick={handleSidebarNodeClick}
        onAddRoadmap={gd.addRoadmap}
        onRemoveRoadmap={gd.removeRoadmap}
        onOpenRoadmapTab={gd.openRoadmapTab}
        activeFilters={gd.activeFilters}
        onToggleFilter={gd.toggleFilter}
        gapMode={gd.gapMode}
        onGapToggle={gd.toggleGapMode}
        gapCount={gd.gapNodes.length}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Tab Bar */}
        <CanvasTabBar
          tabs={gd.tabs}
          activeTabId={gd.activeTabId}
          onTabClick={gd.setActiveTabId}
          onTabClose={gd.closeTab}
        />

        {/* Canvas Content */}
        <CanvasArea
          activeTab={gd.activeTab}
          graphRef={graphRef}
          filteredData={gd.filteredData}
          viewMode={gd.viewMode}
          layoutId={gd.layoutId}
          edgeStyle={gd.edgeStyle}
          selections={selections}
          actives={actives}
          gapNodeIds={gd.gapMode ? gd.gapNodeIds : undefined}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onCanvasClick={handleCanvasClick}
          allNodes={gd.fullData.nodes}
          roadmaps={gd.fullData.roadmaps}
          onPaperTabOpen={gd.openPaperTab}
          onNodeSelect={handleNodeSelectFromTab}
        />

        {/* Status Bar (only when graph tab is active) */}
        {isGraphTab && (
          <GraphStatusBar
            viewMode={gd.viewMode}
            onViewModeChange={gd.setViewMode}
            layoutId={gd.layoutId}
            onLayoutChange={gd.setLayoutId}
            edgeStyle={gd.edgeStyle}
            onEdgeStyleChange={gd.setEdgeStyle}
            relevanceDensity={gd.relevanceDensity}
            onRelevanceDensityChange={gd.setRelevanceDensity}
            localMode={gd.localMode}
            onLocalToggle={gd.toggleLocalMode}
            onFit={handleFit}
            nodeCount={gd.filteredData.nodes.length}
            edgeCount={gd.filteredData.edges.length}
          />
        )}
      </div>

      {/* Right Panel */}
      <RightPanel
        activeTab={rightTab}
        node={gd.selectedNode}
        connections={connections}
        open={gd.panelOpen}
        onClose={() => gd.setPanelOpen(false)}
        onNodeClick={handleNodeClick}
        onTabChange={(tab) => setRightTab(tab)}
        onEdgeLabelUpdate={gd.updateEdgeLabel}
        allEdges={gd.fullData.edges}
        gapMode={gd.gapMode}
        gapNodes={gd.gapNodes}
        onSearchKnowledge={gd.searchKnowledge}
        onExport={() => setExportOpen(true)}
      />

      {/* Export Modal */}
      <ExportModal
        data={gd.filteredData}
        fullData={gd.fullData}
        selectedNodeId={gd.selectedNode?.id ?? null}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
