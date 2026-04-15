import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Section } from "../_data/types";

// Whiteboard 전용 상태. reagraph는 사용하지 않음.
// Phase 1에서 공통 store로 확장 예정 (nodes/edges/selection/roadmap 등 이관).
// localStorage 영속화 — 드래그로 옮긴 위치·펼침 상태·섹션이 새로고침 후에도 유지.
interface WhiteboardState {
  // node.id → 위치
  positions: Record<string, { x: number; y: number }>;
  // node.id → 카드 펼침 여부
  expanded: Record<string, boolean>;
  // Section(그룹 박스) 목록
  sections: Section[];

  // positions
  setPosition: (nodeId: string, pos: { x: number; y: number }) => void;
  setPositions: (entries: Record<string, { x: number; y: number }>) => void;
  clearPositions: () => void;

  // expanded
  toggleExpanded: (nodeId: string) => void;
  setExpanded: (nodeId: string, value: boolean) => void;

  // sections
  addSection: (section: Section) => void;
  updateSection: (id: string, patch: Partial<Section>) => void;
  removeSection: (id: string) => void;
  assignNodeToSection: (nodeId: string, sectionId: string | null) => void;
}

export const useWhiteboardStore = create<WhiteboardState>()(
  persist(
    (set) => ({
      positions: {},
      expanded: {},
      sections: [],

      setPosition: (nodeId, pos) =>
        set((s) => ({ positions: { ...s.positions, [nodeId]: pos } })),

      setPositions: (entries) =>
        set((s) => ({ positions: { ...s.positions, ...entries } })),

      clearPositions: () => set({ positions: {} }),

      toggleExpanded: (nodeId) =>
        set((s) => ({
          expanded: { ...s.expanded, [nodeId]: !s.expanded[nodeId] },
        })),

      setExpanded: (nodeId, value) =>
        set((s) => ({ expanded: { ...s.expanded, [nodeId]: value } })),

      addSection: (section) =>
        set((s) => ({ sections: [...s.sections, section] })),

      updateSection: (id, patch) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, ...patch } : sec,
          ),
        })),

      removeSection: (id) =>
        set((s) => ({ sections: s.sections.filter((sec) => sec.id !== id) })),

      assignNodeToSection: (nodeId, sectionId) =>
        set((s) => ({
          sections: s.sections.map((sec) => {
            const has = sec.nodeIds.includes(nodeId);
            if (sec.id === sectionId && !has) {
              return { ...sec, nodeIds: [...sec.nodeIds, nodeId] };
            }
            if (sec.id !== sectionId && has) {
              return { ...sec, nodeIds: sec.nodeIds.filter((id) => id !== nodeId) };
            }
            return sec;
          }),
        })),
    }),
    {
      name: "deepen-whiteboard-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
