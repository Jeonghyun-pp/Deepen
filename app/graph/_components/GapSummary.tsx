"use client";

import { AlertTriangle, PenLine } from "lucide-react";
import type { GraphNode } from "../_data/types";

interface GapNode {
  node: GraphNode;
  connectionCount: number;
  memoCount: number;
}

interface Props {
  gaps: GapNode[];
  onNodeClick: (id: string) => void;
  onWriteMemo: (id: string) => void;
}

export default function GapSummary({ gaps, onNodeClick, onWriteMemo }: Props) {
  if (gaps.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-white/50">지식 갭이 발견되지 않았습니다</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-amber-400" />
        <h4 className="text-xs font-bold text-white">
          이해가 얕은 영역 {gaps.length}개
        </h4>
      </div>
      <div className="flex flex-col gap-2">
        {gaps.map(({ node, connectionCount, memoCount }) => (
          <div
            key={node.id}
            className="p-3 rounded-xl border border-amber-400/30 bg-amber-400/10"
          >
            <button
              onClick={() => onNodeClick(node.id)}
              className="text-xs font-semibold text-white hover:text-[color:var(--v2-green-soft)] transition-colors text-left"
            >
              {node.label}
            </button>
            <p className="text-[10px] text-white/50 mt-1">
              연결 {connectionCount}개 · 메모 {memoCount}개
            </p>
            <button
              onClick={() => onWriteMemo(node.id)}
              className="flex items-center gap-1 mt-2 text-[10px] font-semibold text-[color:var(--v2-green-soft)] hover:underline"
            >
              <PenLine size={10} />
              메모 작성하기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
