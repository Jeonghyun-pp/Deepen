"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { sampleGraphData } from "../_data/sample-data";
import { useGraphData } from "../_hooks/useGraphData";
import { useAgent } from "../_hooks/useAgent";
import type { GraphCanvasHandle, NodeClickEvent, NodeHoverEvent } from "./GraphCanvas";
import LeftSidebar from "./LeftSidebar";
import CanvasTabBar from "./CanvasTabBar";
import CanvasArea from "./CanvasArea";
import RightPanel from "./RightPanel";
import ExportModal from "./ExportModal";
import FloatingMemo from "./FloatingMemo";
import NodePreviewTooltip from "./NodePreviewTooltip";
import RoadmapOverlay from "./RoadmapOverlay";

export default function GraphShell() {
  const [rightTab, setRightTab] = useState("graph");
  const [exportOpen, setExportOpen] = useState(false);
  const [floatingMemo, setFloatingMemo] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [leftOpen, setLeftOpen] = useState(true);
  const graphRef = useRef<GraphCanvasHandle>(null);

  const gd = useGraphData(sampleGraphData);
  const agent = useAgent(gd.fullData, {
    onAddNode: gd.addNode,
    onAddEdge: gd.addEdge,
  });

  // Handle ?focus= and ?roadmap= query params from /search entry
  const searchParams = useSearchParams();
  useEffect(() => {
    const focus = searchParams.get("focus");
    if (focus && gd.fullData.nodes.some((n) => n.id === focus)) {
      gd.selectNode(focus);
      gd.openDocTab(
        focus,
        gd.fullData.nodes.find((n) => n.id === focus)?.label ?? "",
      );
      setTimeout(() => graphRef.current?.centerGraph([focus]), 200);
    }
    const roadmapPrompt = searchParams.get("roadmap");
    if (roadmapPrompt) {
      // Send the roadmap prompt to the agent — it will call find_path
      setRightTab("chat");
      gd.setPanelOpen(true);
      agent.sendMessage(roadmapPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleNodeClick = useCallback(
    (event: NodeClickEvent) => {
      gd.selectNode(event.id);
      setRightTab("graph");

      if (event.shiftKey) {
        // Shift+click → FloatingMemo 생성 (graph 탭 유지)
        if (gd.activeTab.type !== "graph") gd.setActiveTabId("graph");
        graphRef.current?.centerGraph([event.id]);
        setFloatingMemo({ nodeId: event.id, x: event.screenX, y: event.screenY });
      } else {
        // Normal click → DocDetailView 중앙 탭 열기
        setFloatingMemo(null);
        gd.openDocTab(event.id, gd.fullData.nodes.find((n) => n.id === event.id)?.label ?? "");
        graphRef.current?.centerGraph([event.id]);
      }
    },
    [gd]
  );

  const handleNodeDoubleClick = useCallback(
    // No-op: click이 이미 DocDetailView를 열고, shift+click은 memo를 뜨게 함
    () => {},
    []
  );

  const handleCanvasClick = useCallback(() => {
    if (!gd.localMode) gd.selectNode(null);
    setFloatingMemo(null);
    setHoverPreview(null);
  }, [gd]);

  const handleNodeHover = useCallback((event: NodeHoverEvent | null) => {
    if (event) {
      setHoverPreview({ nodeId: event.id, x: event.screenX, y: event.screenY });
    } else {
      setHoverPreview(null);
    }
  }, []);

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
  // path 노드도 actives에 포함시켜 시각적 강조
  const pathIds = gd.roadmapOverlay?.pathNodeIds ?? [];
  const actives =
    pathIds.length > 0
      ? Array.from(new Set([...gd.searchMatchIds, ...pathIds]))
      : gd.searchMatchIds;

  const isGraphTab = gd.activeTab.type === "graph";

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar — collapsible */}
      <div
        className="shrink-0 transition-all duration-200 overflow-hidden"
        style={{ width: leftOpen ? 240 : 0 }}
      >
        <LeftSidebar
        nodes={gd.fullData.nodes}
        searchQuery={gd.searchQuery}
        onSearchChange={gd.setSearchQuery}
        onNodeClick={handleNavigateToNode}
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

          <div className="flex-1 min-w-0">
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

        {/* Canvas Content (Roadmap overlay floats above when active) */}
        {gd.roadmapOverlay && gd.activeTab.type === "graph" && (
          <RoadmapOverlay
            pathNodeIds={gd.roadmapOverlay.pathNodeIds}
            currentIndex={gd.roadmapOverlay.currentIndex}
            nodes={gd.fullData.nodes}
            onAdvance={() => {
              gd.advanceRoadmap();
              const next =
                gd.roadmapOverlay?.pathNodeIds[
                  (gd.roadmapOverlay?.currentIndex ?? 0) + 1
                ];
              if (next) graphRef.current?.centerGraph([next]);
            }}
            onBack={() => {
              gd.backRoadmap();
              const prev =
                gd.roadmapOverlay?.pathNodeIds[
                  (gd.roadmapOverlay?.currentIndex ?? 0) - 1
                ];
              if (prev) graphRef.current?.centerGraph([prev]);
            }}
            onJumpTo={(idx) => {
              gd.jumpRoadmap(idx);
              const target = gd.roadmapOverlay?.pathNodeIds[idx];
              if (target) graphRef.current?.centerGraph([target]);
            }}
            onClear={gd.clearRoadmapOverlay}
          />
        )}
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
          onNodeHover={handleNodeHover}
          allNodes={gd.fullData.nodes}
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
        agentMessages={agent.messages}
        agentLoading={agent.isLoading}
        onAgentSend={agent.sendMessage}
        onAgentApprove={agent.approve}
        onActivateRoadmap={(ids) => {
          gd.activateRoadmapOverlay(ids);
          setRightTab("graph");
          if (gd.activeTab.type !== "graph") gd.setActiveTabId("graph");
          if (ids[0]) graphRef.current?.centerGraph([ids[0]]);
        }}
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

      {/* Floating Memo — shift+click로 생성 */}
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

      {/* Hover Preview Tooltip */}
      {hoverPreview && gd.activeTab.type === "graph" && (() => {
        const node = gd.fullData.nodes.find((n) => n.id === hoverPreview.nodeId);
        if (!node) return null;
        const edgeCount = gd.fullData.edges.filter(
          (e) => e.source === node.id || e.target === node.id,
        ).length;
        return (
          <NodePreviewTooltip
            node={node}
            x={hoverPreview.x}
            y={hoverPreview.y}
            edgeCount={edgeCount}
          />
        );
      })()}
    </div>
  );
}
