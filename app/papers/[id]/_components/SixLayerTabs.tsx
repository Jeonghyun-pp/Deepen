"use client";

import { useState } from "react";
import { BookOpen, Lightbulb, GitBranch, TrendingUp, Building2, HelpCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { SixLayerAnalysis } from "@/lib/mock/analysis";
import LayerContent from "./LayerContent";

const LAYERS = [
  { key: "priorWork" as const, label: "선행연구", icon: BookOpen, color: "#FF6B6B" },
  { key: "keyConcepts" as const, label: "핵심 개념", icon: Lightbulb, color: "#4A90FF" },
  { key: "pipeline" as const, label: "기술 파이프라인", icon: GitBranch, color: "#00C9A7" },
  { key: "followUp" as const, label: "후속 연구", icon: TrendingUp, color: "#FFB347" },
  { key: "industry" as const, label: "산업 적용", icon: Building2, color: "#CE82FF" },
  { key: "openQuestions" as const, label: "오픈 퀘스천", icon: HelpCircle, color: "#FF8A80" },
];

const FIELD_MAP: Record<string, { title: string; desc1: string; desc2: string }> = {
  priorWork: { title: "title", desc1: "relationship", desc2: "significance" },
  keyConcepts: { title: "term", desc1: "definition", desc2: "role" },
  pipeline: { title: "step", desc1: "description", desc2: "technique" },
  followUp: { title: "direction", desc1: "description", desc2: "evidence" },
  industry: { title: "domain", desc1: "useCase", desc2: "readiness" },
  openQuestions: { title: "question", desc1: "context", desc2: "potentialApproach" },
};

interface Props {
  analysis: SixLayerAnalysis;
}

export default function SixLayerTabs({ analysis }: Props) {
  const [activeLayer, setActiveLayer] = useState<keyof SixLayerAnalysis>("priorWork");

  const currentLayer = LAYERS.find((l) => l.key === activeLayer)!;
  const data = analysis[activeLayer];
  const fields = FIELD_MAP[activeLayer];

  return (
    <div>
      {/* Tab Grid: 2행 3열 */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {LAYERS.map(({ key, label, icon: Icon, color }) => {
          const active = activeLayer === key;
          return (
            <button
              key={key}
              onClick={() => setActiveLayer(key)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border"
              style={{
                background: active ? color + "15" : "white",
                borderColor: active ? color + "40" : "var(--border)",
                color: active ? color : "var(--text-secondary)",
              }}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Layer Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeLayer}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <LayerContent
            icon={currentLayer.icon}
            label={currentLayer.label}
            color={currentLayer.color}
            summary={data.summary}
            items={data.items}
            fields={fields}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
