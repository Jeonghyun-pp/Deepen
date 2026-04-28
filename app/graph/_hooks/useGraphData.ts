import { useState, useMemo, useCallback, useEffect } from "react";
import type {
  GraphNode,
  GraphEdge,
  GraphData,
  NodeType,
  CanvasTab,
  NoteDocument,
  NoteBlock,
} from "../_data/types";
import { useGraphStore } from "../_store/graphStore";
import {
  computeFilteredData,
  computeGapNodes,
  computeLocalNodeIds,
  exportMarkdown as buildMarkdownSnapshot,
  searchKnowledge as runKnowledgeSearch,
  type GapNode,
} from "./graphSelectors";

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

const GRAPH_TAB: CanvasTab = { id: "graph", type: "graph", label: "그래프", closeable: false };

/**
 * 그래프 뷰 상태 어댑터.
 * - 공유 상태(nodes/edges/selection/filters/roadmap): useGraphStore
 * - 뷰 전용 상태(tabs/notes/viewMode/layout/edgeStyle 등): 여기 useState
 * 반환 shape은 이관 전과 동일 — GraphShell 등 소비자는 수정 불필요.
 */
export function useGraphData(initialData: GraphData) {
  // ============================================================
  // 공유 store 바인딩
  // ============================================================
  const data = useGraphStore((s) => s.data);
  const initData = useGraphStore((s) => s.initData);
  const storeAddNode = useGraphStore((s) => s.addNode);
  const storeAddEdge = useGraphStore((s) => s.addEdge);
  const storeUpdateEdgeLabel = useGraphStore((s) => s.updateEdgeLabel);
  const setData = useGraphStore((s) => s.setData);

  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const storeSelectNode = useGraphStore((s) => s.selectNode);

  const activeFilters = useGraphStore((s) => s.activeFilters);
  const toggleFilter = useGraphStore((s) => s.toggleFilter);

  const roadmaps = useGraphStore((s) => s.roadmaps);
  const roadmapOverlay = useGraphStore((s) => s.roadmapOverlay);
  const activateRoadmapOverlay = useGraphStore((s) => s.activateRoadmapOverlay);
  const activateRoadmapById = useGraphStore((s) => s.activateRoadmapById);
  const createRoadmapFromTarget = useGraphStore((s) => s.createRoadmapFromTarget);
  const deleteRoadmap = useGraphStore((s) => s.deleteRoadmap);
  const advanceRoadmap = useGraphStore((s) => s.advanceRoadmap);
  const backRoadmap = useGraphStore((s) => s.backRoadmap);
  const jumpRoadmap = useGraphStore((s) => s.jumpRoadmap);
  const clearRoadmapOverlay = useGraphStore((s) => s.clearRoadmapOverlay);

  // store 초기화 (최초 1회, 비어있을 때만)
  useEffect(() => {
    initData(initialData);
  }, [initData, initialData]);

  // ============================================================
  // 뷰 전용 로컬 상태
  // ============================================================
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewModeRaw] = useState<ViewMode>("2d");
  const [layoutId, setLayoutIdRaw] = useState<LayoutId>("forceDirected");
  const [localMode, setLocalMode] = useState(false);
  const [gapMode, setGapMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [edgeStyle, setEdgeStyle] = useState<EdgeStyle>("linear");
  const [relevanceDensity, setRelevanceDensity] = useState<RelevanceDensity>("compact");

  const [tabs, setTabs] = useState<CanvasTab[]>([GRAPH_TAB]);
  const [activeTabId, setActiveTabId] = useState("graph");
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

  // ==================== Selection ====================

  const selectNode = useCallback((id: string | null) => {
    storeSelectNode(id);
    if (id) setPanelOpen(true);
  }, [storeSelectNode]);

  const toggleLocalMode = useCallback(() => setLocalMode((prev) => !prev), []);

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
  }, [openNoteTab, setData]);

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
    setData((prev) => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        { id, label: noteTitle, type: "memo" as const, content: "" },
      ],
    }));
    openNoteTab(id, noteTitle);
    return id;
  }, [openNoteTab, setData]);

  const updateNote = useCallback((noteId: string, updates: Partial<Pick<NoteDocument, "title" | "blocks" | "references">>) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== noteId) return n;
        return { ...n, ...updates, updatedAt: new Date().toISOString() };
      })
    );
    if (updates.title) {
      setData((prev) => ({
        ...prev,
        nodes: prev.nodes.map((nd) =>
          nd.id === noteId ? { ...nd, label: updates.title! } : nd
        ),
      }));
      setTabs((prev) =>
        prev.map((t) => (t.noteId === noteId ? { ...t, label: updates.title! } : t))
      );
    }
    if (updates.references) {
      setData((prev) => {
        const edges = prev.edges.filter(
          (e) => !(e.source === noteId && e.type === "relatedTo")
        );
        const newEdges = updates.references!.map((refId) => ({
          id: `${noteId}-ref-${refId}`,
          source: noteId,
          target: refId,
          type: "relatedTo" as const,
          label: "참조",
          weight: 0.6,
        }));
        return { ...prev, edges: [...edges, ...newEdges] };
      });
    }
  }, [setData]);

  const closeTab = useCallback((tabId: string) => {
    setTabs((prev) => prev.filter((t) => t.id !== tabId));
    setActiveTabId((prevActive) => (prevActive === tabId ? "graph" : prevActive));
  }, []);

  // ==================== Computed ====================

  const localNodeIds = useMemo(
    () => computeLocalNodeIds(data, selectedNodeId, localMode),
    [data, selectedNodeId, localMode],
  );

  const filteredData = useMemo<GraphData>(
    () =>
      computeFilteredData({
        data,
        activeFilters,
        localNodeIds,
        relevanceDensity,
        roadmapOverlay,
      }),
    [data, activeFilters, localNodeIds, relevanceDensity, roadmapOverlay],
  );

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

  const gapNodes = useMemo<GapNode[]>(() => computeGapNodes(data), [data]);

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
        { id: `${memoId}-ref-${targetNodeId}`, source: memoId, target: targetNodeId, type: "relatedTo" as const, label: "메모", weight: 0.6 },
      ],
    }));
  }, [setData]);

  // ==================== Edge editing ====================

  const updateEdgeLabel = useCallback(
    (edgeId: string, label: string) => storeUpdateEdgeLabel(edgeId, label),
    [storeUpdateEdgeLabel],
  );

  // ==================== Q&A ====================

  const searchKnowledge = useCallback(
    (query: string) => runKnowledgeSearch(data, query),
    [data],
  );

  // ==================== Export ====================

  const exportMarkdown = useCallback(
    () => buildMarkdownSnapshot(filteredData),
    [filteredData],
  );

  // ==================== Graph mutation wrappers (store delegation) ====================
  const addNode = useCallback((node: GraphNode) => storeAddNode(node), [storeAddNode]);
  const addEdge = useCallback((edge: GraphEdge) => storeAddEdge(edge), [storeAddEdge]);

  // 로컬 store 에서 노드 + 그 노드와 연결된 엣지 모두 제거.
  // API DELETE 성공 후 호출 — 서버 cascade 결과를 클라에 반영.
  const removeNode = useCallback(
    (id: string) => {
      setData((prev) => ({
        nodes: prev.nodes.filter((n) => n.id !== id),
        edges: prev.edges.filter((e) => e.source !== id && e.target !== id),
      }));
      if (selectedNodeId === id) storeSelectNode(null);
    },
    [setData, selectedNodeId, storeSelectNode],
  );

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
    gapMode,
    toggleGapMode,
    gapNodes,
    gapNodeIds,
    addQuickMemo,
    edgeStyle,
    setEdgeStyle,
    updateEdgeLabel,
    relevanceDensity,
    setRelevanceDensity,
    searchKnowledge,
    exportMarkdown,
    roadmapOverlay,
    activateRoadmapOverlay,
    advanceRoadmap,
    backRoadmap,
    jumpRoadmap,
    clearRoadmapOverlay,
    roadmaps,
    activateRoadmapById,
    createRoadmapFromTarget,
    deleteRoadmap,
    addNode,
    addEdge,
    removeNode,
    tabs,
    activeTab,
    activeTabId,
    setActiveTabId,
    openDocTab,
    openNoteTab,
    closeTab,
    notes,
    createNote,
    importNote,
    updateNote,
  };
}
