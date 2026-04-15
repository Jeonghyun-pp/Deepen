import type { GraphData, NodeType } from "../../_data/types";

// Timeline View — node.meta.year를 기반으로 x 좌표를 연도 축에 배치.
// - x: (year - minYear) * PX_PER_YEAR
// - y: type별 레인으로 분리 (가독성)
// - year 없는 노드: 하단 unknown 레인에 순서대로 배치
//
// 반환값은 whiteboardStore에 쓰지 않고 뷰에서만 override로 사용한다.

const PX_PER_YEAR = 320;
const LANE_HEIGHT = 170;
const LEFT_MARGIN = 120;
const TOP_MARGIN = 80;

const LANE_ORDER: NodeType[] = [
  "paper",
  "concept",
  "technique",
  "application",
  "question",
  "memo",
  "document",
];

export interface TimelineLayoutResult {
  positions: Record<string, { x: number; y: number }>;
  yearRange: { min: number; max: number } | null;
  unknownCount: number;
}

export function computeTimelineLayout(data: GraphData): TimelineLayoutResult {
  const years = data.nodes
    .map((n) => n.meta?.year)
    .filter((y): y is number => typeof y === "number");
  const hasYears = years.length > 0;
  const minYear = hasYears ? Math.min(...years) : 0;
  const maxYear = hasYears ? Math.max(...years) : 0;

  // 같은 (year, type) 버킷에 여러 노드가 떨어지면 세로로 살짝 겹치지 않게 stagger
  const bucketCount: Record<string, number> = {};
  const positions: Record<string, { x: number; y: number }> = {};
  const laneIndex = (t: NodeType) => {
    const i = LANE_ORDER.indexOf(t);
    return i < 0 ? LANE_ORDER.length : i;
  };
  const unknownLaneY = TOP_MARGIN + (LANE_ORDER.length + 1) * LANE_HEIGHT;
  let unknownIdx = 0;

  for (const n of data.nodes) {
    const year = n.meta?.year;
    if (typeof year === "number" && hasYears) {
      const x = LEFT_MARGIN + (year - minYear) * PX_PER_YEAR;
      const lane = laneIndex(n.type);
      const key = `${year}|${n.type}`;
      const k = bucketCount[key] ?? 0;
      bucketCount[key] = k + 1;
      const y = TOP_MARGIN + lane * LANE_HEIGHT + k * 28;
      positions[n.id] = { x, y };
    } else {
      positions[n.id] = {
        x: LEFT_MARGIN + unknownIdx * 260,
        y: unknownLaneY,
      };
      unknownIdx += 1;
    }
  }

  return {
    positions,
    yearRange: hasYears ? { min: minYear, max: maxYear } : null,
    unknownCount: unknownIdx,
  };
}

// 연도 축에 그릴 tick 좌표 (연도, x) 배열
export function computeTimelineTicks(
  yearRange: { min: number; max: number } | null,
): { year: number; x: number }[] {
  if (!yearRange) return [];
  const { min, max } = yearRange;
  const ticks: { year: number; x: number }[] = [];
  for (let y = min; y <= max; y++) {
    ticks.push({ year: y, x: LEFT_MARGIN + (y - min) * PX_PER_YEAR });
  }
  return ticks;
}

export const TIMELINE_CONSTANTS = {
  PX_PER_YEAR,
  LANE_HEIGHT,
  LEFT_MARGIN,
  TOP_MARGIN,
  LANE_ORDER,
};
