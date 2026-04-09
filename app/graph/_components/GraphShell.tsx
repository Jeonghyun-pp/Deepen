"use client";

import { useRef, useState, useCallback } from "react";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { sampleGraphData } from "../_data/sample-data";
import { useGraphData } from "../_hooks/useGraphData";
import type { GraphCanvasHandle, NodeClickEvent } from "./GraphCanvas";
import LeftSidebar from "./LeftSidebar";
import CanvasTabBar from "./CanvasTabBar";
import CanvasArea from "./CanvasArea";
import RightPanel from "./RightPanel";
import ExportModal from "./ExportModal";
import FloatingMemo from "./FloatingMemo";

export default function GraphShell() {
  const [rightTab, setRightTab] = useState("graph");
  const [exportOpen, setExportOpen] = useState(false);
  const [floatingMemo, setFloatingMemo] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const gd = useGraphData(sampleGraphData);

  const handleNodeClick = useCallback(
    (event: NodeClickEvent) => {
      gd.selectNode(event.id);
      setRightTab("graph");
      if (gd.activeTab.type !== "graph") {
        gd.setActiveTabId("graph");
      }
      graphRef.current?.centerGraph([event.id]);
      // Show floating memo near click position
      setFloatingMemo({ nodeId: event.id, x: event.screenX, y: event.screenY });
    },
    [gd]
  );

  const handleNodeDoubleClick = useCallback(
    // No-op: Doc 열기는 플로팅 메모의 "문서 열기" 버튼으로 통일
    () => {},
    []
  );

  const handleCanvasClick = useCallback(() => {
    if (!gd.localMode) gd.selectNode(null);
    setFloatingMemo(null);
  }, [gd]);

  const handleMemoSave = useCallback(
    (nodeId: string, memo: string) => {
      gd.addQuickMemo(nodeId, memo);
    },
    [gd]
  );

  const handleFit = useCallback(() => {
    graphRef.current?.fitView();
  }, []);

  // For clicks from sidebar / right panel / other tab views (no screen coords)
  const handleNavigateToNode = useCallback(
    (id: string) => {
      gd.selectNode(id);
      gd.setActiveTabId("graph");
      setRightTab("graph");
      gd.setPanelOpen(true);
      setFloatingMemo(null);
      setTimeout(() => graphRef.current?.centerGraph([id]), 100);
    },
    [gd]
  );

  // Alias for handleNavigateToNode (same behavior)
  const handleNodeSelectFromTab = handleNavigateToNode;

  const connections = gd.selectedNode
    ? gd.getConnectedNodes(gd.selectedNode.id)
    : [];

  const selections = gd.selectedNode ? [gd.selectedNode.id] : [];
  const actives = gd.searchMatchIds.length > 0 ? gd.searchMatchIds : [];

  const isGraphTab = gd.activeTab.type === "graph";

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar — collapsible */}
      <div
        className="shrink-0 transition-all duration-200 overflow-hidden"
        style={{ width: leftOpen ? 240 : 0 }}
      >
        <LeftSidebar
        roadmaps={gd.fullData.roadmaps}
        nodes={gd.fullData.nodes}
        activeRoadmapId={gd.activeRoadmapId}
        searchQuery={gd.searchQuery}
        onSearchChange={gd.setSearchQuery}
        onRoadmapClick={gd.setActiveRoadmapId}
        onNodeClick={handleNavigateToNode}
        onAddRoadmap={gd.addRoadmap}
        onRemoveRoadmap={gd.removeRoadmap}
        onOpenRoadmapTab={gd.openRoadmapTab}
        activeFilters={gd.activeFilters}
        onToggleFilter={gd.toggleFilter}
        gapMode={gd.gapMode}
        onGapToggle={gd.toggleGapMode}
        gapCount={gd.gapNodes.length}
        notes={gd.notes}
        onOpenNoteTab={gd.openNoteTab}
      />
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        {/* Tab Bar — z-20 so dropdown floats above canvas */}
        <div className="relative z-20 shrink-0 flex items-center h-9 border-b border-border bg-gray-50">
          {/* Left panel toggle */}
          <button
            onClick={() => setLeftOpen((p) => !p)}
            className={`flex items-center justify-center w-9 h-full border-r border-border transition-colors ${
              leftOpen ? "text-text-muted hover:text-text-secondary" : "text-coral bg-coral-light/30"
            }`}
            title={leftOpen ? "사이드바 숨기기" : "사이드바 보기"}
          >
            <PanelLeftOpen size={14} />
          </button>

          <div className="flex-1 overflow-x-auto">
            <CanvasTabBar
              tabs={gd.tabs}
              activeTabId={gd.activeTabId}
              onTabClick={gd.setActiveTabId}
              onTabClose={gd.closeTab}
              onCreateNote={() => gd.createNote()}
            />
          </div>

          {/* Right panel toggle */}
          <button
            onClick={() => gd.setPanelOpen(!gd.panelOpen)}
            className={`flex items-center justify-center w-9 h-full border-l border-border transition-colors ${
              gd.panelOpen ? "text-text-muted hover:text-text-secondary" : "text-coral bg-coral-light/30"
            }`}
            title={gd.panelOpen ? "패널 숨기기" : "패널 보기"}
          >
            <PanelRightOpen size={14} />
          </button>
        </div>

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
          onDocTabOpen={gd.openDocTab}
          notes={gd.notes}
          onNoteUpdate={gd.updateNote}
          onNodeSelect={handleNodeSelectFromTab}
          statusBar={{
            viewMode: gd.viewMode,
            onViewModeChange: gd.setViewMode,
            layoutId: gd.layoutId,
            onLayoutChange: gd.setLayoutId,
            edgeStyle: gd.edgeStyle,
            onEdgeStyleChange: gd.setEdgeStyle,
            relevanceDensity: gd.relevanceDensity,
            onRelevanceDensityChange: gd.setRelevanceDensity,
            localMode: gd.localMode,
            onLocalToggle: gd.toggleLocalMode,
            onFit: handleFit,
            nodeCount: gd.filteredData.nodes.length,
            edgeCount: gd.filteredData.edges.length,
          }}
        />
      </div>

      {/* Right Panel */}
      <RightPanel
        activeTab={rightTab}
        node={gd.selectedNode}
        connections={connections}
        open={gd.panelOpen}
        onClose={() => gd.setPanelOpen(false)}
        onNodeClick={handleNavigateToNode}
        onTabChange={(tab) => setRightTab(tab)}
        onEdgeLabelUpdate={gd.updateEdgeLabel}
        allEdges={gd.fullData.edges}
        gapMode={gd.gapMode}
        gapNodes={gd.gapNodes}
        onSearchKnowledge={gd.searchKnowledge}
        onExport={() => setExportOpen(true)}
        onOpenDocTab={gd.openDocTab}
        onOpenNoteTab={gd.openNoteTab}
        hasNote={(id) => gd.notes.some((n) => n.id === id)}
      />

      {/* Export Modal */}
      <ExportModal
        data={gd.filteredData}
        fullData={gd.fullData}
        selectedNodeId={gd.selectedNode?.id ?? null}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {/* Floating Memo */}
      {floatingMemo && gd.activeTab.type === "graph" && (() => {
        const node = gd.fullData.nodes.find((n) => n.id === floatingMemo.nodeId);
        if (!node) return null;
        return (
          <FloatingMemo
            node={node}
            screenX={floatingMemo.x}
            screenY={floatingMemo.y}
            onClose={() => setFloatingMemo(null)}
            onSave={handleMemoSave}
            onOpenDoc={gd.openDocTab}
          />
        );
      })()}
    </div>
  );
}
