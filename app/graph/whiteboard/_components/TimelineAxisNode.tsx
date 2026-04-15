"use client";

import { memo } from "react";
import { type NodeProps } from "@xyflow/react";

// Timeline 모드 전용: 특정 연도의 tick + 레이블을 렌더.
// 상호작용 없음, 화면에 배경으로만 얹힘.
export interface TimelineAxisData {
  year: number;
  height: number;
}

function TimelineAxisNodeComponent({ data }: NodeProps) {
  const d = data as unknown as TimelineAxisData;
  return (
    <div
      className="relative pointer-events-none"
      style={{ width: 1, height: d.height }}
    >
      <div
        className="absolute top-0 left-0 w-px bg-gray-200"
        style={{ height: d.height }}
      />
      <div className="absolute -top-6 -translate-x-1/2 text-[11px] font-medium text-gray-500 bg-white px-1.5 rounded">
        {d.year}
      </div>
    </div>
  );
}

export default memo(TimelineAxisNodeComponent);
