"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RoadmapStep } from "@/lib/mock/roadmap";

const DIFFICULTY_STYLES = {
  beginner: { bg: "#dcfce7", color: "#166534", label: "초급" },
  intermediate: { bg: "#dbeafe", color: "#1e40af", label: "중급" },
  advanced: { bg: "#fecaca", color: "#991b1b", label: "고급" },
};

interface Props {
  step: RoadmapStep;
  isLast: boolean;
}

export default function RoadmapStepCard({ step, isLast }: Props) {
  const diff = DIFFICULTY_STYLES[step.difficulty];

  return (
    <div className="flex gap-4">
      {/* Timeline column */}
      <div className="flex flex-col items-center">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
          style={{ background: "#FF6B6B" }}
        >
          {step.order}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border mt-1" />
        )}
      </div>

      {/* Card */}
      <div className="flex-1 pb-6">
        <div className="p-4 rounded-xl border border-border bg-white hover:border-coral/40 hover:shadow-sm transition-all">
          <h3 className="text-sm font-bold text-text-primary leading-snug mb-2">
            {step.title}
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            {step.reason}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ background: diff.bg, color: diff.color }}
              >
                {diff.label}
              </span>
              <span className="text-[10px] text-text-muted">
                예상 {step.estimatedMinutes}분
              </span>
              {step.fields.map((field) => (
                <span
                  key={field}
                  className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-coral-light text-coral"
                >
                  {field}
                </span>
              ))}
            </div>
            <Link
              href={`/papers/${step.paperId}`}
              className="flex items-center gap-1 text-xs font-semibold text-coral hover:underline shrink-0"
            >
              보기
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
