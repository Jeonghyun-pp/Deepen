import { useState, useMemo, useCallback } from "react";
import type {
  GraphNode,
  GraphEdge,
  GraphData,
  NodeType,
  CanvasTab,
  NoteDocument,
  NoteBlock,
  RoadmapOverlayState,
  Roadmap,
} from "../_data/types";
import { buildRoadmapFromTarget, SEED_ROADMAPS } from "../_data/roadmap";

export type ViewMode = "2d" | "3d";
export type EdgeStyle = "curved" | "linear";
export type RelevanceDensity = "compact" | "default" | "full";

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
    () => new Set(["paper", "concept", "technique", "application", "question", "memo", "document"])
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewModeRaw] = useState<ViewMode>("2d");
  const [layoutId, setLayoutIdRaw] = useState<LayoutId>("forceDirected");
  const [localMode, setLocalMode] = useState(false);
  const [gapMode, setGapMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("linear");
  const [relevanceDensity, setRelevanceDensity] = useState<RelevanceDensity>("compact");

  // --- Roadmaps (일급 객체) + 활성 overlay ---
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>(SEED_ROADMAPS);
  const [roadmapOverlay, setRoadmapOverlay] =
    useState<RoadmapOverlayState | null>(null);

  // --- Canvas tabs ---
  const [tabs, setTabs] = useState<CanvasTab[]>([GRAPH_TAB]);
  const [activeTabId, setActiveTabId] = useState("graph");

  // --- Notes ---
  const [notes, setNotes] = useState<NoteDocument[]>([]);

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

  // ==================== Roadmap overlay ====================

  const activateRoadmapOverlay = useCallback(
    (pathNodeIds: string[], title?: string) => {
      if (pathNodeIds.length === 0) return;
      setRoadmapOverlay({ pathNodeIds, currentIndex: 0, title });
    },
    [],
  );

  const activateRoadmapById = useCallback(
    (roadmapId: string) => {
      const rm = roadmaps.find((r) => r.id === roadmapId);
      if (!rm || rm.nodeIds.length === 0) return;
      setRoadmapOverlay({
        pathNodeIds: rm.nodeIds,
        currentIndex: 0,
        title: rm.title,
        roadmapId: rm.id,
      });
    },
    [roadmaps],
  );

  // target 노드의 prereq closure를 BFS로 산출 → 새 Roadmap 저장 + 활성화
  const createRoadmapFromTarget = useCallback(
    (targetNodeId: string) => {
      const targetNode = data.nodes.find((n) => n.id === targetNodeId);
      if (!targetNode) return;
      const nodeIds = buildRoadmapFromTarget(data, targetNodeId, 3);
      if (nodeIds.length === 0) return;
      const id = `rm-${Date.now()}`;
      const newRoadmap: Roadmap = {
        id,
        title: `${targetNode.label} 학습 경로`,
        nodeIds,
        source: "user",
        description: `${targetNode.label}을 이해하기 위한 자동 생성 prereq chain`,
        createdAt: new Date().toISOString(),
      };
      setRoadmaps((prev) => [...prev, newRoadmap]);
      setRoadmapOverlay({
        pathNodeIds: nodeIds,
        currentIndex: 0,
        title: newRoadmap.title,
        roadmapId: id,
      });
    },
    [data],
  );

  const deleteRoadmap = useCallback((roadmapId: string) => {
    setRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));
    setRoadmapOverlay((prev) =>
      prev?.roadmapId === roadmapId ? null : prev,
    );
  }, []);

  const advanceRoadmap = useCallback(() => {
    setRoadmapOverlay((prev) =>
      prev && prev.currentIndex < prev.pathNodeIds.length - 1
        ? { ...prev, currentIndex: prev.currentIndex + 1 }
        : prev,
    );
  }, []);

  const backRoadmap = useCallback(() => {
    setRoadmapOverlay((prev) =>
      prev && prev.currentIndex > 0
        ? { ...prev, currentIndex: prev.currentIndex - 1 }
        : prev,
    );
  }, []);

  const jumpRoadmap = useCallback((index: number) => {
    setRoadmapOverlay((prev) => {
      if (!prev) return prev;
      const clamped = Math.max(0, Math.min(prev.pathNodeIds.length - 1, index));
      return { ...prev, currentIndex: clamped };
    });
  }, []);

  const clearRoadmapOverlay = useCallback(() => setRoadmapOverlay(null), []);

  // ==================== Graph mutation (agent tool 결과) ====================

  const addNode = useCallback((node: GraphNode) => {
    setData((prev) => {
      if (prev.nodes.some((n) => n.id === node.id)) return prev;
      return { ...prev, nodes: [...prev.nodes, node] };
    });
  }, []);

  const addEdge = useCallback((edge: GraphEdge) => {
    setData((prev) => {
      if (prev.edges.some((e) => e.id === edge.id)) return prev;
      return { ...prev, edges: [...prev.edges, edge] };
    });
  }, []);

  // ==================== Canvas Tabs ====================

  const openDocTab = useCallback((nodeId: string, label: string) => {
    const tabId = `doc-${nodeId}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "doc", label, closeable: true, nodeId }];
    });
    setActiveTabId(tabId);
  }, []);

  const openNoteTab = useCallback((noteId: string, label: string) => {
    const tabId = `note-${noteId}`;
    setTabs((prev) => {
      if (prev.some((t) => t.id === tabId)) return prev;
      return [...prev, { id: tabId, type: "note", label, closeable: true, noteId }];
    });
    setActiveTabId(tabId);
  }, []);

  const importNote = useCallback((title: string, blocks: NoteBlock[]) => {
    const id = `note-${Date.now()}`;
    const now = new Date().toISOString();
    const note: NoteDocument = {
      id,
      title,
      blocks: blocks.length > 0 ? blocks : [{ type: "paragraph", text: "" }],
      references: [],
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [...prev, note]);
    setData((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { id, label: title, type: "memo" as const, content: "" },
      ],
    }));
    openNoteTab(id, title);
    return id;
  }, [openNoteTab]);

  const createNote = useCallback((title?: string) => {
    const id = `note-${Date.now()}`;
    const now = new Date().toISOString();
    const noteTitle = title || "새 노트";
    const note: NoteDocument = {
      id,
      title: noteTitle,
      blocks: [{ type: "paragraph", text: "" }],
      references: [],
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [...prev, note]);
    // Create corresponding memo node in graph
    setData((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { id, label: noteTitle, type: "memo" as const, content: "" },
      ],
    }));
    openNoteTab(id, noteTitle);
    return id;
  }, [openNoteTab]);

  const updateNote = useCallback((noteId: string, updates: Partial<Pick<NoteDocument, "title" | "blocks" | "references">>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        const updated = { ...n, ...updates, updatedAt: new Date().toISOString() };
        return updated;
      })
    );
    // Sync title to memo node label
    if (updates.title) {
      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((nd) =>
          nd.id === noteId ? { ...nd, label: updates.title! } : nd
        ),
      }));
      // Update tab label
      setTabs((prev) =>
        prev.map((t) => (t.noteId === noteId ? { ...t, label: updates.title! } : t))
      );
    }
    // Sync references → graph edges
    if (updates.references) {
      setData((prev) => {
        // Remove old reference edges from this note
        const edges = prev.edges.filter(
          (e) => !(e.source === noteId && e.type === "manual")
        );
        // Add new reference edges
        const newEdges = updates.references!.map((refId) => ({
          id: `${noteId}-ref-${refId}`,
          source: noteId,
          target: refId,
          type: "manual" as const,
          label: "참조",
          weight: 0.6,
        }));
        return { ...prev, edges: [...edges, ...newEdges] };
      });
    }
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

  const filteredData = useMemo<GraphData>(() => {
    let nodes = data.nodes.filter((n) => activeFilters.has(n.type));
    if (localNodeIds) {
      nodes = nodes.filter((n) => localNodeIds.has(n.id));
    }
    // 로드맵 활성화 시 모듈화: path 노드만 표시.
    // 이때 weight threshold도 무시해 path 사이 약한 엣지가 사라지지 않게 한다.
    if (roadmapOverlay) {
      const pathSet = new Set(roadmapOverlay.pathNodeIds);
      nodes = nodes.filter((n) => pathSet.has(n.id));
    }
    const nodeIds = new Set(nodes.map((n) => n.id));

    const threshold = roadmapOverlay
      ? 0
      : relevanceDensity === "compact" ? 0.7
      : relevanceDensity === "default" ? 0.4
      : 0;

    const edges = data.edges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
        && (e.weight ?? 0.5) >= threshold
    );
    return { nodes, edges };
  }, [data, activeFilters, localNodeIds, relevanceDensity, roadmapOverlay]);

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

  // ==================== Quick memo ====================

  const addQuickMemo = useCallback((targetNodeId: string, memo: string) => {
    const memoId = `memo-quick-${Date.now()}`;
    setData((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { id: memoId, label: memo.slice(0, 40), type: "memo" as const, content: memo },
      ],
      edges: [
        ...prev.edges,
        { id: `${memoId}-ref-${targetNodeId}`, source: memoId, target: targetNodeId, type: "manual" as const, label: "메모", weight: 0.6 },
      ],
    }));
  }, []);

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
    // quick memo
    addQuickMemo,
    // edge
    edgeStyle,
    setEdgeStyle,
    updateEdgeLabel,
    // relevance
    relevanceDensity,
    setRelevanceDensity,
    // Q&A
    searchKnowledge,
    // export
    exportMarkdown,
    // roadmap overlay
    roadmapOverlay,
    activateRoadmapOverlay,
    advanceRoadmap,
    backRoadmap,
    jumpRoadmap,
    clearRoadmapOverlay,
    // roadmaps (일급 객체)
    roadmaps,
    activateRoadmapById,
    createRoadmapFromTarget,
    deleteRoadmap,
    // mutation
    addNode,
    addEdge,
    // tabs
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openDocTab,
    openNoteTab,
    closeTab,
    // notes
    notes,
    createNote,
    importNote,
    updateNote,
  };
}
