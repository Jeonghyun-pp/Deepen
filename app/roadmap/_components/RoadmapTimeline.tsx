"use client";

import { motion } from "framer-motion";
import type { Roadmap } from "@/lib/mock/roadmap";
import RoadmapStepCard from "./RoadmapStepCard";
import Disclaimer from "@/app/components/Disclaimer";

interface Props {
  roadmap: Roadmap;
}

export default function RoadmapTimeline({ roadmap }: Props) {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-text-primary">
          {roadmap.keyword} 학습 로드맵
        </h2>
        <p className="text-sm text-text-muted mt-1">
          총 {roadmap.steps.length}편 · 예상 소요시간 {roadmap.totalMinutes}분
        </p>
      </div>

      {/* Steps */}
      <div className="flex flex-col">
        {roadmap.steps.map((step, i) => (
          <motion.div
            key={step.order}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <RoadmapStepCard step={step} isLast={i === roadmap.steps.length - 1} />
          </motion.div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-4">
        <Disclaimer text="AI가 논문 메타데이터와 인용 관계를 기반으로 추천한 학습 순서입니다" />
      </div>
    </div>
  );
}
