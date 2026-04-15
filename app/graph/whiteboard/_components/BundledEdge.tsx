"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";

// 공통 제어점(control)을 지나는 Quadratic Bezier 엣지.
// data.control: { x, y } (flow 좌표계)
// data.groupSize: 같은 (src→dst) 그룹에 묶인 엣지 수. 굵기 가중치로 사용.
// data.color: stroke 색
// data.dashed: 점선 여부 (reference 계열)

export interface BundledEdgeData {
  control: { x: number; y: number };
  groupSize: number;
  color: string;
  dashed?: boolean;
  labelText?: string;
}

function BundledEdgeComponent(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    markerEnd,
  } = props;
  const d = data as unknown as BundledEdgeData;
  const ctrl = d?.control ?? {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2,
  };

  const path = `M ${sourceX},${sourceY} Q ${ctrl.x},${ctrl.y} ${targetX},${targetY}`;

  // 굵기: 최소 1.25, 그룹이 커질수록 약간 두꺼워짐. 과하지 않게 log 스케일.
  const width = 1.25 + Math.min(2.5, Math.log2(Math.max(1, d?.groupSize ?? 1)) * 0.9);

  // 라벨 위치: 제어점 근처
  const labelX = ctrl.x;
  const labelY = ctrl.y;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: d?.color ?? "#9ca3af",
          strokeWidth: width,
          strokeDasharray: d?.dashed ? "4 3" : undefined,
          opacity: 0.85,
          fill: "none",
        }}
      />
      {d?.labelText && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-none text-[10px] text-gray-500 bg-white/85 rounded px-1"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {d.labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(BundledEdgeComponent);
