import { useState, useMemo, useCallback } from "react";
import type { GraphNode, GraphData, NodeType, CanvasTab } from "../_data/types";

export type ViewMode = "2d" | "3d";

export type LayoutId =
  | "forceDirected"
  | "forceatlas2"
  | "radialOut"
  | "treeTd"
  | "treeLr"
  | "hierarchicalTd"
  | "circular"
  | "concentric";

export const LAYOUT_OPTIONS: { id: LayoutId; label: string; dim: "2d" | "both" }[] = [
  { id: "forceDirected", label: "Force Directed", dim: "both" },
  { id: "forceatlas2", label: "ForceAtlas2", dim: "2d" },
  { id: "radialOut", label: "방사형", dim: "both" },
  { id: "treeTd", label: "트리 (↓)", dim: "both" },
  { id: "treeLr", label: "트리 (→)", dim: "both" },
  { id: "hierarchicalTd", label: "계층형 (↓)", dim: "2d" },
  { id: "circular", label: "원형", dim: "2d" },
  { id: "concentric", label: "동심원", dim: "both" },
];

export function toReagraphLayoutType(layoutId: LayoutId, viewMode: ViewMode): string {
  if (layoutId === "forceatlas2") return "forceatlas2";
  if (layoutId === "hierarchicalTd") return "hierarchicalTd";
  return `${layoutId}${viewMode === "3d" ? "3d" : "2d"}`;
}

interface GapNode {
  node: GraphNode;
  connectionCount: number;
  memoCount: number;
}

const GRAPH_TAB: CanvasTab = { id: "graph", type: "graph", label: "그래프", closeable: false };

export function useGraphData(initialData: GraphData) {
  const [data, setData] = useState<GraphData>(initialData);

  // --- Filters & view ---
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(
    () => new Set(["paper", "concept", "memo", "document"])
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewModeRaw] = useState<ViewMode>("2d");
  const [layoutId, setLayoutIdRaw] = useState<LayoutId>("forceDirected");
  const [localMode, setLocalMode] = useState(false);
  const [gapMode, setGapMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // --- Roadmap ---
  const [activeRoadmapId, setActiveRoadmapIdRaw] = useState<string | null>(null);

  // --- Canvas tabs ---
  const [tabs, setTabs] = useState<CanvasTab[]>([GRAPH_TAB]);
  const [activeTabId, setActiveTabId] = useState("graph");

  // ==================== View mode / layout ====================

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeRaw(mode);
    const current = LAYOUT_OPTIONS.find((l) => l.id === layoutId);
    if (mode === "3d" && current?.dim === "2d") {
      setLayoutIdRaw("forceDirected");
    }
  }, [layoutId]);

  const setLayoutId = useCallback((id: LayoutId) => {
    setLayoutIdRaw(id);
    const opt = LAYOUT_OPTIONS.find((l) => l.id === id);
    if (opt?.dim === "2d") setViewModeRaw("2d");
  }, []);

  // ==================== Filters ====================

  const toggleFilter = useCallback((type: NodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
    if (id) setPanelOpen(true);
  }, []);

  const toggleLocalMode = useCallback(() => setLocalMode((prev) => !prev), []);

  // ==================== Roadmap ====================

  const setActiveRoadmapId = useCallback((id: string | null) => {
    setActiveRoadmapIdRaw((prev) => (prev === id ? null : id));
  }, []);

  const addRoadmap = useCallback((name: string) => {
    const id = `rm-${Date.now()}`;
    setData((prev) => ({
      ...prev,
      roadmaps: [...prev.roadmaps, { id, name, entries: [] }],
    }));
    return id;
  }, []);

  const removeRoadmap = useCallback((roadmapId: string) => {
    setData((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.filter((r) => r.id !== roadmapId),
    }));
    setActiveRoadmapIdRaw((prev) => (prev === roadmapId ? null : prev));
    // Close any open roadmap tab for this roadmap
    setTabs((prev) => prev.filter((t) => t.roadmapId !== roadmapId));
  }, []);

  const addNodeToRoadmap = useCallback((roadmapId: string, nodeId: string) => {
    setData((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.map((r) => {
        if (r.id !== roadmapId) return r;
        if (r.entries.some((e) => e.nodeId === nodeId)) return r;
        return { ...r, entries: [...r.entries, { nodeId, order: r.entries.length + 1 }] };
      }),
    }));
  }, []);

  const removeNodeFromRoadmap = useCallback((roadmapId: string, nodeId: string) => {
    setData((prev) => ({
      ...prev,
      roadmaps: prev.roadmaps.map((r) => {
        if (r.id !== roadmapId) return r;
        const entries = r.entries
          .filter((e) => e.nodeId !== nodeId)
          .map((e, i) => ({ ...e, order: i + 1 }));
        return { ...r, entries };
      }),
    }));
  }, []);

  // ==================== Canvas Tabs ====================

  const openPaperTab = useCallback((paperId: string, label: string) => {
    const tabId = `paper-${paperId}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "paper-detail", label, closeable: true, paperId }];
    });
    setActiveTabId(tabId);
  }, []);

  const openRoadmapTab = useCallback((roadmapId: string, label: string) => {
    const tabId = `roadmap-${roadmapId}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "roadmap-timeline", label, closeable: true, roadmapId }];
    });
    setActiveTabId(tabId);
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setActiveTabId((prevActive) => (prevActive === tabId ? "graph" : prevActive));
  }, []);

  // ==================== Computed data ====================

  // 2-hop neighborhood for local mode
  const localNodeIds = useMemo(() => {
    if (!localMode || !selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    for (const e of data.edges) {
      if (e.source === selectedNodeId) ids.add(e.target);
      if (e.target === selectedNodeId) ids.add(e.source);
    }
    const hop1 = new Set(ids);
    for (const e of data.edges) {
      if (hop1.has(e.source)) ids.add(e.target);
      if (hop1.has(e.target)) ids.add(e.source);
    }
    return ids;
  }, [localMode, selectedNodeId, data.edges]);

  // Active roadmap node IDs
  const activeRoadmapNodeIds = useMemo(() => {
    if (!activeRoadmapId) return null;
    const rm = data.roadmaps.find((r) => r.id === activeRoadmapId);
    if (!rm) return null;
    return new Set(rm.entries.map((e) => e.nodeId));
  }, [activeRoadmapId, data.roadmaps]);

  const filteredData = useMemo(() => {
    let nodes = data.nodes.filter((n) => activeFilters.has(n.type));
    // Roadmap filter: only show nodes in active roadmap
    if (activeRoadmapNodeIds) {
      nodes = nodes.filter((n) => activeRoadmapNodeIds.has(n.id));
    }
    if (localNodeIds) {
      nodes = nodes.filter((n) => localNodeIds.has(n.id));
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    return { nodes, edges, roadmaps: data.roadmaps };
  }, [data, activeFilters, activeRoadmapNodeIds, localNodeIds]);

  const selectedNode = useMemo(
    () => data.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [data.nodes, selectedNodeId]
  );

  const searchMatchIds = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return data.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q)
      )
      .map((n) => n.id);
  }, [data.nodes, searchQuery]);

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? GRAPH_TAB,
    [tabs, activeTabId]
  );

  // ==================== Node helpers ====================

  const getConnectedNodes = useCallback(
    (nodeId: string) => {
      const results: { node: GraphNode; edgeType: string; edgeLabel?: string }[] = [];
      for (const e of data.edges) {
        if (e.source === nodeId) {
          const node = data.nodes.find((n) => n.id === e.target);
          if (node) results.push({ node, edgeType: e.type, edgeLabel: e.label });
        } else if (e.target === nodeId) {
          const node = data.nodes.find((n) => n.id === e.source);
          if (node) results.push({ node, edgeType: e.type, edgeLabel: e.label });
        }
      }
      return results;
    },
    [data]
  );

  // ==================== Gap detection ====================

  const toggleGapMode = useCallback(() => setGapMode((prev) => !prev), []);

  const gapNodes = useMemo<GapNode[]>(() => {
    return data.nodes
      .filter((n) => n.type === "paper" || n.type === "concept")
      .map((n) => {
        const connections = data.edges.filter((e) => e.source === n.id || e.target === n.id);
        const memoConnections = connections.filter((e) => {
          const otherId = e.source === n.id ? e.target : e.source;
          const other = data.nodes.find((nd) => nd.id === otherId);
          return other?.type === "memo";
        });
        return { node: n, connectionCount: connections.length, memoCount: memoConnections.length };
      })
      .filter((g) => g.memoCount === 0 && g.connectionCount < 3);
  }, [data]);

  const gapNodeIds = useMemo(() => new Set(gapNodes.map((g) => g.node.id)), [gapNodes]);

  // ==================== Edge editing ====================

  const updateEdgeLabel = useCallback((edgeId: string, label: string) => {
    setData((prev) => ({
      ...prev,
      edges: prev.edges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
    }));
  }, []);

  // ==================== Q&A ====================

  const searchKnowledge = useCallback(
    (query: string) => {
      const q = query.toLowerCase();
      const matched = data.nodes.filter(
        (n) => n.label.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
      );
      if (matched.length === 0) {
        return { answer: "관련된 지식을 찾을 수 없습니다. 그래프에 더 많은 논문과 메모를 추가해보세요.", sources: [] as GraphNode[] };
      }
      const snippets = matched
        .slice(0, 3)
        .map((n) => `"${n.label}: ${n.content.slice(0, 80)}..."`)
        .join("\n\n");
      return {
        answer: `당신의 지식에 따르면:\n\n${snippets}`,
        sources: matched.slice(0, 5),
      };
    },
    [data]
  );

  // ==================== Export ====================

  const exportMarkdown = useCallback(() => {
    const now = new Date().toISOString().split("T")[0];
    const concepts = filteredData.nodes.filter((n) => n.type === "concept");
    const papers = filteredData.nodes.filter((n) => n.type === "paper");
    const memos = filteredData.nodes.filter((n) => n.type === "memo");
    let md = `# 지식 스냅샷\n*${now} 생성*\n\n`;
    if (concepts.length) {
      md += `## 핵심 개념 (${concepts.length})\n`;
      concepts.forEach((c) => (md += `- **${c.label}**: ${c.content}\n`));
      md += "\n";
    }
    if (papers.length) {
      md += `## 논문 (${papers.length})\n`;
      papers.forEach((p) => (md += `- **${p.label}** (${p.meta?.year ?? "?"})\n`));
      md += "\n";
    }
    if (memos.length) {
      md += `## 내 메모 (${memos.length})\n`;
      memos.forEach((m) => (md += `- ${m.label}: ${m.content}\n`));
    }
    return md;
  }, [filteredData]);

  // ==================== Return ====================

  return {
    fullData: data,
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
    // gap
    gapMode,
    toggleGapMode,
    gapNodes,
    gapNodeIds,
    // edge
    updateEdgeLabel,
    // Q&A
    searchKnowledge,
    // export
    exportMarkdown,
    // roadmap
    activeRoadmapId,
    setActiveRoadmapId,
    addRoadmap,
    removeRoadmap,
    addNodeToRoadmap,
    removeNodeFromRoadmap,
    // tabs
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openPaperTab,
    openRoadmapTab,
    closeTab,
  };
}
