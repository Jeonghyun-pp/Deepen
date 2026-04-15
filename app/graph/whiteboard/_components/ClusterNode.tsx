"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Route } from "lucide-react";

// Semantic Zoom: 줌아웃 레벨에서 Roadmap 전체를 단일 노드로 축약해 보여준다.
// 내부 카드·엣지는 숨기고 이 노드로 대체.

export interface ClusterNodeData {
  title: string;
  color: string;
  count: number;
}

function ClusterNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as ClusterNodeData;
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center text-center shadow-md"
      style={{
        width: 220,
        height: 120,
        background: `${d.color}1A`,
        border: `2px solid ${d.color}`,
        outline: selected ? `3px solid ${d.color}55` : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0 }}
      />
      <div
        className="flex items-center gap-1.5 text-xs font-semibold tracking-wide"
        style={{ color: d.color }}
      >
        <Route size={14} />
        {d.title}
      </div>
      <div className="mt-1 text-[11px] text-gray-500">
        {d.count}개 카드
      </div>
      <div className="mt-2 text-[10px] text-gray-400">
        줌인하면 펼쳐집니다
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0 }}
      />
    </div>
  );
}

export default memo(ClusterNodeComponent);
