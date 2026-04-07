import { useState, useMemo, useCallback } from "react";
import type { GraphNode, GraphData, NodeType } from "../_data/types";

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

// Reagraph layoutType 문자열로 변환
export function toReagraphLayoutType(layoutId: LayoutId, viewMode: ViewMode): string {
  if (layoutId === "forceatlas2") return "forceatlas2";
  if (layoutId === "hierarchicalTd") return "hierarchicalTd";
  return `${layoutId}${viewMode === "3d" ? "3d" : "2d"}`;
}

interface UseGraphDataReturn {
  filteredData: GraphData;
  activeFilters: Set<NodeType>;
  toggleFilter: (type: NodeType) => void;
  selectedNode: GraphNode | null;
  selectNode: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchMatchIds: string[];
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  layoutId: LayoutId;
  setLayoutId: (id: LayoutId) => void;
  localMode: boolean;
  toggleLocalMode: () => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  getConnectedNodes: (nodeId: string) => { node: GraphNode; edgeType: string }[];
}

export function useGraphData(data: GraphData): UseGraphDataReturn {
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(
    () => new Set(["paper", "concept", "memo", "document"])
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewModeRaw] = useState<ViewMode>("2d");
  const [layoutId, setLayoutIdRaw] = useState<LayoutId>("forceDirected");
  const [localMode, setLocalMode] = useState(false);

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
    if (opt?.dim === "2d") {
      setViewModeRaw("2d");
    }
  }, []);
  const [panelOpen, setPanelOpen] = useState(true);

  const toggleFilter = useCallback((type: NodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const selectNode = useCallback(
    (id: string | null) => {
      setSelectedNodeId(id);
      if (id) setPanelOpen(true);
    },
    []
  );

  const toggleLocalMode = useCallback(() => {
    setLocalMode((prev) => !prev);
  }, []);

  // 2-hop neighborhood for local mode
  const localNodeIds = useMemo(() => {
    if (!localMode || !selectedNodeId) return null;
    const ids = new Set<string>([selectedNodeId]);
    // 1-hop
    for (const e of data.edges) {
      if (e.source === selectedNodeId) ids.add(e.target);
      if (e.target === selectedNodeId) ids.add(e.source);
    }
    // 2-hop
    const hop1 = new Set(ids);
    for (const e of data.edges) {
      if (hop1.has(e.source)) ids.add(e.target);
      if (hop1.has(e.target)) ids.add(e.source);
    }
    return ids;
  }, [localMode, selectedNodeId, data.edges]);

  const filteredData = useMemo(() => {
    let nodes = data.nodes.filter((n) => activeFilters.has(n.type));
    if (localNodeIds) {
      nodes = nodes.filter((n) => localNodeIds.has(n.id));
    }
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    return { nodes, edges };
  }, [data, activeFilters, localNodeIds]);

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

  const getConnectedNodes = useCallback(
    (nodeId: string) => {
      const results: { node: GraphNode; edgeType: string }[] = [];
      for (const e of data.edges) {
        if (e.source === nodeId) {
          const node = data.nodes.find((n) => n.id === e.target);
          if (node) results.push({ node, edgeType: e.type });
        } else if (e.target === nodeId) {
          const node = data.nodes.find((n) => n.id === e.source);
          if (node) results.push({ node, edgeType: e.type });
        }
      }
      return results;
    },
    [data]
  );

  return {
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
  };
}
