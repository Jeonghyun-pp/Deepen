import { create } from "zustand";
import type {
  GraphNode,
  GraphEdge,
  GraphData,
  NodeType,
  Roadmap,
  RoadmapOverlayState,
} from "../_data/types";
import { buildRoadmapFromTarget, SEED_ROADMAPS } from "../_data/roadmap";

// 두 뷰(Reagraph, Whiteboard)가 공유해야 하는 "진실의 단일 원천" store.
// - nodes/edges: 그래프 데이터 자체
// - selectedNodeId: 어떤 노드를 선택했는지
// - activeFilters: 어떤 타입을 보고 있는지
// - roadmaps/roadmapOverlay: 학습 경로 상태
// 뷰 전용 상태(tabs/notes/viewMode/layout/edgeStyle 등)는 useGraphData에 남겨둠.
interface GraphState {
  // data
  data: GraphData;
  initData: (data: GraphData) => void;
  addNode: (node: GraphNode) => void;
  addEdge: (edge: GraphEdge) => void;
  removeEdges: (ids: string[]) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  upsertNode: (
    id: string,
    patch: Partial<GraphNode> | ((prev: GraphNode) => GraphNode),
  ) => void;
  setData: (next: GraphData | ((prev: GraphData) => GraphData)) => void;

  // selection
  selectedNodeId: string | null;
  selectNode: (id: string | null) => void;

  // filters
  activeFilters: Set<NodeType>;
  toggleFilter: (type: NodeType) => void;
  setActiveFilters: (filters: Set<NodeType>) => void;

  // roadmaps
  roadmaps: Roadmap[];
  roadmapOverlay: RoadmapOverlayState | null;
  activateRoadmapOverlay: (pathNodeIds: string[], title?: string) => void;
  activateRoadmapById: (roadmapId: string) => void;
  createRoadmapFromTarget: (targetNodeId: string) => void;
  deleteRoadmap: (roadmapId: string) => void;
  advanceRoadmap: () => void;
  backRoadmap: () => void;
  jumpRoadmap: (index: number) => void;
  clearRoadmapOverlay: () => void;
  addRoadmap: (roadmap: Roadmap) => void;
}

const DEFAULT_FILTERS: NodeType[] = [
  "paper",
  "concept",
  "technique",
  "application",
  "question",
  "memo",
  "document",
];

export const useGraphStore = create<GraphState>((set, get) => ({
  // ---------- data ----------
  data: { nodes: [], edges: [] },

  initData: (data) => {
    // 최초 한 번만 초기화 (이미 데이터가 있으면 덮어쓰지 않음 — HMR/재마운트 안전).
    if (get().data.nodes.length === 0) set({ data });
  },

  setData: (next) =>
    set((s) => ({ data: typeof next === "function" ? next(s.data) : next })),

  addNode: (node) =>
    set((s) => {
      if (s.data.nodes.some((n) => n.id === node.id)) return s;
      return { data: { ...s.data, nodes: [...s.data.nodes, node] } };
    }),

  addEdge: (edge) =>
    set((s) => {
      if (s.data.edges.some((e) => e.id === edge.id)) return s;
      return { data: { ...s.data, edges: [...s.data.edges, edge] } };
    }),

  removeEdges: (ids) =>
    set((s) => {
      const idSet = new Set(ids);
      return {
        data: {
          ...s.data,
          edges: s.data.edges.filter((e) => !idSet.has(e.id)),
        },
      };
    }),

  updateEdgeLabel: (edgeId, label) =>
    set((s) => ({
      data: {
        ...s.data,
        edges: s.data.edges.map((e) => (e.id === edgeId ? { ...e, label } : e)),
      },
    })),

  upsertNode: (id, patch) =>
    set((s) => ({
      data: {
        ...s.data,
        nodes: s.data.nodes.map((n) => {
          if (n.id !== id) return n;
          return typeof patch === "function" ? patch(n) : { ...n, ...patch };
        }),
      },
    })),

  // ---------- selection ----------
  selectedNodeId: null,
  selectNode: (id) => set({ selectedNodeId: id }),

  // ---------- filters ----------
  activeFilters: new Set(DEFAULT_FILTERS),
  toggleFilter: (type) =>
    set((s) => {
      const next = new Set(s.activeFilters);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return { activeFilters: next };
    }),
  setActiveFilters: (filters) => set({ activeFilters: filters }),

  // ---------- roadmaps ----------
  roadmaps: SEED_ROADMAPS,
  roadmapOverlay: null,

  activateRoadmapOverlay: (pathNodeIds, title) => {
    if (pathNodeIds.length === 0) return;
    set({ roadmapOverlay: { pathNodeIds, currentIndex: 0, title } });
  },

  activateRoadmapById: (roadmapId) => {
    const rm = get().roadmaps.find((r) => r.id === roadmapId);
    if (!rm || rm.nodeIds.length === 0) return;
    set({
      roadmapOverlay: {
        pathNodeIds: rm.nodeIds,
        currentIndex: 0,
        title: rm.title,
        roadmapId: rm.id,
      },
    });
  },

  createRoadmapFromTarget: (targetNodeId) => {
    const { data } = get();
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
    set((s) => ({
      roadmaps: [...s.roadmaps, newRoadmap],
      roadmapOverlay: {
        pathNodeIds: nodeIds,
        currentIndex: 0,
        title: newRoadmap.title,
        roadmapId: id,
      },
    }));
  },

  deleteRoadmap: (roadmapId) =>
    set((s) => ({
      roadmaps: s.roadmaps.filter((r) => r.id !== roadmapId),
      roadmapOverlay:
        s.roadmapOverlay?.roadmapId === roadmapId ? null : s.roadmapOverlay,
    })),

  advanceRoadmap: () =>
    set((s) => ({
      roadmapOverlay:
        s.roadmapOverlay &&
        s.roadmapOverlay.currentIndex < s.roadmapOverlay.pathNodeIds.length - 1
          ? { ...s.roadmapOverlay, currentIndex: s.roadmapOverlay.currentIndex + 1 }
          : s.roadmapOverlay,
    })),

  backRoadmap: () =>
    set((s) => ({
      roadmapOverlay:
        s.roadmapOverlay && s.roadmapOverlay.currentIndex > 0
          ? { ...s.roadmapOverlay, currentIndex: s.roadmapOverlay.currentIndex - 1 }
          : s.roadmapOverlay,
    })),

  jumpRoadmap: (index) =>
    set((s) => {
      if (!s.roadmapOverlay) return s;
      const clamped = Math.max(
        0,
        Math.min(s.roadmapOverlay.pathNodeIds.length - 1, index),
      );
      return { roadmapOverlay: { ...s.roadmapOverlay, currentIndex: clamped } };
    }),

  clearRoadmapOverlay: () => set({ roadmapOverlay: null }),

  addRoadmap: (roadmap) =>
    set((s) => ({ roadmaps: [...s.roadmaps, roadmap] })),
}));
