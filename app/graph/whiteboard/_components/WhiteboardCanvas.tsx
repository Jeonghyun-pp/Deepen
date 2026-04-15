"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
  type NodeTypes,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RotateCcw, Plus, AlignVerticalJustifyCenter } from "lucide-react";
import { useGraphStore } from "../../_store/graphStore";
import { useWhiteboardStore } from "../../_store/whiteboardStore";
import { computeDagreLayout } from "../_utils/layout";
import { toRFEdge } from "../_utils/edgeStyle";
import CardNode from "./CardNode";
import SectionNode from "./SectionNode";

const nodeTypes: NodeTypes = { card: CardNode, section: SectionNode };

// 섹션 기본 색상 팔레트 (Heptabase 스타일 파스텔 톤)
const SECTION_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#14b8a6", // teal
];

function fallbackGrid(index: number): { x: number; y: number } {
  const COLS = 4;
  return { x: (index % COLS) * 280, y: Math.floor(index / COLS) * 180 };
}

// 신규 노드의 배치 앵커: 이 노드와 엣지로 연결된 이웃 중 위치가 있는 것을 찾음.
function findAnchorPosition(
  nodeId: string,
  edges: { source: string; target: string }[],
  existing: Record<string, { x: number; y: number }>,
  pending: Record<string, { x: number; y: number }>,
): { x: number; y: number } | null {
  const pool = { ...existing, ...pending };
  for (const e of edges) {
    if (e.source === nodeId && pool[e.target]) return pool[e.target];
    if (e.target === nodeId && pool[e.source]) return pool[e.source];
  }
  return null;
}

// 기존 카드들과 겹치지 않는 빈 공간 찾기 (단순 휴리스틱).
function findFreeSpace(
  existing: Record<string, { x: number; y: number }>,
  pending: Record<string, { x: number; y: number }>,
): { x: number; y: number } {
  const all = [...Object.values(existing), ...Object.values(pending)];
  if (all.length === 0) return { x: 100, y: 100 };
  const maxX = Math.max(...all.map((p) => p.x));
  const avgY =
    all.reduce((sum, p) => sum + p.y, 0) / all.length;
  return { x: maxX + 320, y: avgY };
}

export default function WhiteboardCanvas() {
  const data = useGraphStore((s) => s.data);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const positions = useWhiteboardStore((s) => s.positions);
  const setPosition = useWhiteboardStore((s) => s.setPosition);
  const setPositions = useWhiteboardStore((s) => s.setPositions);
  const clearPositions = useWhiteboardStore((s) => s.clearPositions);
  const sections = useWhiteboardStore((s) => s.sections);
  const addSection = useWhiteboardStore((s) => s.addSection);
  const updateSection = useWhiteboardStore((s) => s.updateSection);

  // 위치가 없는 노드에 대한 자동 배치.
  // - 초기(positions 거의 비어있음): dagre로 일괄 계층 레이아웃
  // - 증분(에이전트가 노드 1~2개 추가): 연결된 이웃 옆에 오프셋 배치
  const didInitRef = useRef(false);
  useEffect(() => {
    if (data.nodes.length === 0) return;
    const missing = data.nodes.filter((n) => !positions[n.id]);
    if (missing.length === 0) {
      didInitRef.current = true;
      return;
    }

    const isInitialBulk = !didInitRef.current;
    const entries: Record<string, { x: number; y: number }> = {};

    if (isInitialBulk) {
      try {
        const layout = computeDagreLayout(data, "TB");
        for (const n of missing) {
          entries[n.id] = layout[n.id] ?? fallbackGrid(data.nodes.indexOf(n));
        }
      } catch {
        for (const n of missing) {
          entries[n.id] = fallbackGrid(data.nodes.indexOf(n));
        }
      }
      didInitRef.current = true;
    } else {
      // 증분 추가: 각 신규 노드를 연결된 이웃 옆에 살짝 오프셋
      for (const n of missing) {
        const anchor = findAnchorPosition(n.id, data.edges, positions, entries);
        if (anchor) {
          entries[n.id] = {
            x: anchor.x + 280 + Math.random() * 40,
            y: anchor.y + (Math.random() * 80 - 40),
          };
        } else {
          // 완전히 고립된 신규 노드 — 캔버스 빈 영역으로
          entries[n.id] = findFreeSpace(positions, entries);
        }
      }
    }

    setPositions(entries);
  }, [data, positions, setPositions]);

  // 섹션 노드 + 카드 노드를 합쳐서 React Flow에 전달.
  // 섹션은 낮은 zIndex로 카드 뒤에 배치.
  const nodes = useMemo<RFNode[]>(() => {
    const sectionNodes: RFNode[] = sections.map((sec) => ({
      id: sec.id,
      type: "section",
      position: { x: sec.bounds?.x ?? 0, y: sec.bounds?.y ?? 0 },
      data: { section: sec },
      draggable: true,
      selectable: true,
      zIndex: 0,
    }));
    const cardNodes: RFNode[] = data.nodes.map((n, i) => ({
      id: n.id,
      type: "card",
      position: positions[n.id] ?? fallbackGrid(i),
      data: { node: n },
      selected: n.id === selectedNodeId,
      zIndex: 1,
    }));
    return [...sectionNodes, ...cardNodes];
  }, [data.nodes, positions, selectedNodeId, sections]);

  const edges = useMemo<RFEdge[]>(
    () => data.edges.map(toRFEdge),
    [data.edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) {
        if (c.type === "select") {
          // 섹션 노드는 selectNode에서 제외 (graphStore selection은 GraphNode만)
          const isSection = sections.some((s) => s.id === c.id);
          if (isSection) continue;
          selectNode(c.selected ? c.id : null);
        }
      }
    },
    [selectNode, sections],
  );

  // 섹션 드래그 시 소속 카드들도 같은 델타로 이동 + 섹션 bounds 업데이트.
  const onNodeDragStop = useCallback(
    (_: unknown, node: RFNode) => {
      const section = sections.find((s) => s.id === node.id);
      if (section) {
        const prevX = section.bounds?.x ?? 0;
        const prevY = section.bounds?.y ?? 0;
        const dx = node.position.x - prevX;
        const dy = node.position.y - prevY;
        // 섹션 bounds 업데이트
        updateSection(section.id, {
          bounds: {
            x: node.position.x,
            y: node.position.y,
            w: section.bounds?.w ?? 400,
            h: section.bounds?.h ?? 300,
          },
        });
        // 멤버 카드들 일괄 이동
        if ((dx !== 0 || dy !== 0) && section.nodeIds.length > 0) {
          const updates: Record<string, { x: number; y: number }> = {};
          for (const nid of section.nodeIds) {
            const pos = positions[nid];
            if (!pos) continue;
            updates[nid] = { x: pos.x + dx, y: pos.y + dy };
          }
          setPositions(updates);
        }
        return;
      }
      // 일반 카드 드래그
      setPosition(node.id, { x: node.position.x, y: node.position.y });
    },
    [sections, positions, setPosition, setPositions, updateSection],
  );

  // Context carry-over: mount 시점에 selectedNodeId가 있으면 그 카드로 센터.
  // onInit은 ReactFlow가 렌더 준비됐을 때 한 번 호출됨.
  const handleInit = useCallback(
    (instance: ReactFlowInstance) => {
      if (!selectedNodeId) return;
      const pos = positions[selectedNodeId];
      if (!pos) return;
      // 카드 중심으로 센터 (CardNode 기본 너비/높이 고려)
      instance.setCenter(pos.x + 120, pos.y + 80, { zoom: 1, duration: 400 });
    },
    // mount 시 1회만 실행 — selectedNodeId 바뀔 때마다 점프 방지
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleResetLayout = useCallback(() => {
    if (!confirm("배치를 초기화합니다. 저장된 모든 위치가 사라져요.")) return;
    clearPositions();
    didInitRef.current = false;
  }, [clearPositions]);

  // 모든 카드 위치를 dagre 결과로 덮어씀. 섹션 멤버도 포함 — 사용자 배치 손실 경고.
  const handleDagreAlign = useCallback(() => {
    if (
      !confirm(
        "선수관계 기반으로 위→아래 정렬합니다. 직접 배치한 위치는 덮어써져요.",
      )
    )
      return;
    try {
      const layout = computeDagreLayout(data, "TB");
      if (Object.keys(layout).length > 0) {
        setPositions(layout);
      }
    } catch {
      alert("정렬에 실패했습니다.");
    }
  }, [data, setPositions]);

  const handleCreateSection = useCallback(() => {
    const title = prompt("섹션 이름을 입력하세요", "새 섹션");
    if (!title) return;
    const color =
      SECTION_COLORS[sections.length % SECTION_COLORS.length];
    // 선택된 카드가 있으면 그 주변에 섹션 생성, 없으면 뷰포트 중앙
    let x = 100;
    let y = 100;
    if (selectedNodeId && positions[selectedNodeId]) {
      x = positions[selectedNodeId].x - 60;
      y = positions[selectedNodeId].y - 60;
    }
    const id = `sec-${Date.now()}`;
    addSection({
      id,
      title,
      color,
      nodeIds: selectedNodeId ? [selectedNodeId] : [],
      roadmapId: "default", // Phase 5 MVP는 default roadmap. Phase 6/7에서 Roadmap 선택 UI.
      bounds: { x, y, w: 420, h: 320 },
      createdAt: new Date().toISOString(),
    });
  }, [selectedNodeId, positions, sections.length, addSection]);

  return (
    <div className="w-full h-full relative">
      {/* 툴바 */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={handleCreateSection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text hover:bg-gray-50 shadow-sm"
          title="선택한 카드를 포함한 새 섹션 만들기"
        >
          <Plus size={12} />
          새 섹션
        </button>
        <button
          type="button"
          onClick={handleDagreAlign}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text hover:bg-gray-50 shadow-sm"
          title="선수관계 기반 DAG 정렬 (위→아래)"
        >
          <AlignVerticalJustifyCenter size={12} />
          DAG 정렬
        </button>
        <button
          type="button"
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-white/90 backdrop-blur text-xs text-text-muted hover:text-text shadow-sm"
          title="저장된 배치를 지우고 자동 정렬"
        >
          <RotateCcw size={12} />
          배치 초기화
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onPaneClick={() => selectNode(null)}
        onNodeDragStop={onNodeDragStop}
        onInit={handleInit}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
