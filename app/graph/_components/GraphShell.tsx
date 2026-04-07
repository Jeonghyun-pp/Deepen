"use client";

import { useRef, useState, useCallback } from "react";
import { sampleGraphData } from "../_data/sample-data";
import { useGraphData } from "../_hooks/useGraphData";
import GraphCanvasWrapper, { type GraphCanvasHandle } from "./GraphCanvas";
import SidebarNav from "./SidebarNav";
import GraphToolbar from "./GraphToolbar";
import FilterBar from "./FilterBar";
import RightPanel from "./RightPanel";

export default function GraphShell() {
  const [activeTab, setActiveTab] = useState("graph");
  const graphRef = useRef<GraphCanvasHandle>(null);

  const {
    filteredData,
    activeFilters,
    toggleFilter,
    selectedNode,
    selectNode,
    searchQuery,
    setSearchQuery,
    searchMatchIds,
    viewMode,
    setViewMode,
    layoutId,
    setLayoutId,
    localMode,
    toggleLocalMode,
    panelOpen,
    setPanelOpen,
    getConnectedNodes,
  } = useGraphData(sampleGraphData);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (activeTab === tab && panelOpen) {
        setPanelOpen(false);
      } else {
        setActiveTab(tab);
        setPanelOpen(true);
      }
    },
    [activeTab, panelOpen, setPanelOpen]
  );

  const handleNodeClick = useCallback(
    (id: string) => {
      selectNode(id);
      setActiveTab("graph");
      setPanelOpen(true);
      graphRef.current?.centerGraph([id]);
    },
    [selectNode, setPanelOpen]
  );

  const handleCanvasClick = useCallback(() => {
    if (!localMode) selectNode(null);
  }, [localMode, selectNode]);

  const handleFit = useCallback(() => {
    graphRef.current?.fitView();
  }, []);

  const connections = selectedNode
    ? getConnectedNodes(selectedNode.id)
    : [];

  const selections = selectedNode ? [selectedNode.id] : [];
  const actives = searchMatchIds.length > 0 ? searchMatchIds : [];

  return (
    <div className="flex h-full w-full">
      <SidebarNav activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex-1 relative overflow-hidden h-full">
        <GraphToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          layoutId={layoutId}
          onLayoutChange={setLayoutId}
          localMode={localMode}
          onLocalToggle={toggleLocalMode}
          onFit={handleFit}
        />
        <FilterBar activeFilters={activeFilters} onToggle={toggleFilter} />

        <GraphCanvasWrapper
          ref={graphRef}
          data={filteredData}
          viewMode={viewMode}
          layoutId={layoutId}
          selections={selections}
          actives={actives}
          onNodeClick={handleNodeClick}
          onCanvasClick={handleCanvasClick}
        />
      </div>

      <RightPanel
        activeTab={activeTab}
        node={selectedNode}
        connections={connections}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onNodeClick={handleNodeClick}
        onTabChange={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}
