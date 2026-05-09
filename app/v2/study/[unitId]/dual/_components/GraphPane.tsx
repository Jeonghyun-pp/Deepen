"use client"

/**
 * 듀얼 패널의 중앙 그래프.
 * Spec: 08-q2-build.md M2.6 (B). 풀이 중이 아니므로 itemId 없이 단원 전체.
 *
 * Q2 단순화: StudyMiniGraph 그대로 reuse. 좁은 폭에서 동작.
 */

import { StudyMiniGraph } from "../../StudyMiniGraph"

export interface GraphPaneProps {
  firstItemId: string | null
}

export function GraphPane({}: GraphPaneProps) {
  return (
    <div className="flex h-full flex-col bg-zinc-50 p-4" data-testid="graph-pane">
      <p className="mb-2 text-[10px] uppercase tracking-widest text-black/45">
        학습 지도
      </p>
      <div className="flex-1 rounded-xl border border-black/10 bg-white p-3">
        <StudyMiniGraph />
      </div>
    </div>
  )
}
