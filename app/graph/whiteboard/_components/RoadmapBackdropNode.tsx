"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";
import { Route } from "lucide-react";

// Roadmap 활성화 시 멤버 노드들의 bounding box를 감싸는 배경 영역.
// 카드·섹션보다 훨씬 낮은 zIndex로 렌더되어 시각 힌트만 제공, 상호작용 없음.

export type RoadmapBackdropData = {
  title?: string;
  color: string;
  width: number;
  height: number;
};

function RoadmapBackdropNodeComponent({ data }: NodeProps) {
  const d = data as RoadmapBackdropData;
  return (
    <div
      className="rounded-2xl pointer-events-none"
      style={{
        width: d.width,
        height: d.height,
        // 옅은 배경 + 점선 — Section(실선·진한 색)과 구분
        background: `${d.color}0D`, // 5% opacity
        border: `1.5px dashed ${d.color}66`,
      }}
    >
      {d.title && (
        <div
          className="absolute -top-3 left-4 px-2 py-0.5 rounded-full bg-white border flex items-center gap-1 text-[10px] font-medium tracking-wide"
          style={{ color: d.color, borderColor: `${d.color}66` }}
        >
          <Route size={10} />
          {d.title}
        </div>
      )}
    </div>
  );
}

export default memo(RoadmapBackdropNodeComponent);
