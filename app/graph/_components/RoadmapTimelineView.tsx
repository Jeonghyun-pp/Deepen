"use client";

import { motion } from "framer-motion";
import type { RoadmapModule, GraphNode } from "../_data/types";
import Disclaimer from "@/app/components/Disclaimer";
import { ArrowRight } from "lucide-react";

const DIFFICULTY_STYLES = {
  beginner: { bg: "#dcfce7", color: "#166534", label: "초급" },
  intermediate: { bg: "#dbeafe", color: "#1e40af", label: "중급" },
  advanced: { bg: "#fecaca", color: "#991b1b", label: "고급" },
};

interface Props {
  roadmap: RoadmapModule;
  nodes: GraphNode[];
  onDocTabOpen: (nodeId: string, label: string) => void;
  onNodeSelect: (id: string) => void;
}

export default function RoadmapTimelineView({ roadmap, nodes, onDocTabOpen, onNodeSelect }: Props) {
  const getNode = (id: string) => nodes.find((n) => n.id === id);

  const totalMinutes = roadmap.entries.reduce((sum, e) => sum + (e.estimatedMinutes ?? 10), 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header */}
        <h2 className="text-lg font-bold text-text-primary mb-1">{roadmap.name}</h2>
        <p className="text-sm text-text-muted mb-6">
          총 {roadmap.entries.length}편 · 예상 소요시간 {totalMinutes}분
        </p>

        {/* Timeline */}
        <div className="flex flex-col">
          {roadmap.entries.map((entry, i) => {
            const node = getNode(entry.nodeId);
            if (!node) return null;
            const diff = DIFFICULTY_STYLES[entry.difficulty ?? "beginner"];
            const isLast = i === roadmap.entries.length - 1;

            return (
              <motion.div
                key={entry.nodeId}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4"
              >
                {/* Timeline column */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: "#FF6B6B" }}
                  >
                    {entry.order}
                  </div>
                  {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
                </div>

                {/* Card */}
                <div className="flex-1 pb-5">
                  <div className="p-4 rounded-xl border border-border bg-white hover:border-coral/40 hover:shadow-sm transition-all">
                    <h3 className="text-sm font-bold text-text-primary leading-snug mb-2">
                      {node.label}
                    </h3>
                    {entry.reason && (
                      <p className="text-xs text-text-secondary leading-relaxed mb-3">
                        {entry.reason}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{ background: diff.bg, color: diff.color }}
                        >
                          {diff.label}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          예상 {entry.estimatedMinutes ?? 10}분
                        </span>
                        {node.meta?.year && (
                          <span className="text-[10px] text-text-muted">{node.meta.year}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNodeSelect(entry.nodeId)}
                          className="text-[10px] font-semibold text-text-muted hover:text-coral"
                        >
                          그래프
                        </button>
                        <button
                          onClick={() => onDocTabOpen(entry.nodeId, node.label)}
                          className="flex items-center gap-1 text-xs font-semibold text-coral hover:underline"
                        >
                          상세
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-4">
          <Disclaimer text="AI가 논문 메타데이터와 인용 관계를 기반으로 추천한 학습 순서입니다" />
        </div>
      </div>
    </div>
  );
}
