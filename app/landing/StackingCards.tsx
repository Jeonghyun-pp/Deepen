"use client";

import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { RefObject } from "react";

interface Paper {
  title: string;
  authors: string;
  tag: string;
  abstract: string;
}

interface StackingCardsProps {
  papers: Paper[];
  containerRef: RefObject<HTMLElement | null>;
}

const TAG_COLORS: Record<string, string> = {
  NLP: "#4A90FF",
  LLM: "#FF6B6B",
  CV: "#00C9A7",
  RL: "#FFB347",
};

function StackingCard({
  paper,
  index,
  total,
  scrollYProgress,
}: {
  paper: Paper;
  index: number;
  total: number;
  scrollYProgress: MotionValue<number>;
}) {
  const start = 0.15 + index * 0.12;
  const end = start + 0.1;
  const opacity = useTransform(scrollYProgress, [start, end], [0, 1]);
  const y = useTransform(scrollYProgress, [start, end], [60, index * -8]);
  const rotate = useTransform(scrollYProgress, [start, end], [5, (index - 2) * 1.5]);

  return (
    <motion.div
      style={{ opacity, y, rotate, zIndex: total - index }}
      className="absolute inset-x-0 rounded-2xl p-6 bg-white/80 backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-bold text-text-primary text-sm leading-snug flex-1">
          {paper.title}
        </h4>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full text-white flex-shrink-0"
          style={{ background: TAG_COLORS[paper.tag] ?? "#8888A0" }}
        >
          {paper.tag}
        </span>
      </div>
      <p className="text-xs text-text-muted mb-2">{paper.authors}</p>
      <p className="text-sm text-text-secondary leading-relaxed">{paper.abstract}</p>
    </motion.div>
  );
}

export default function StackingCards({ papers, containerRef }: StackingCardsProps) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  return (
    <div className="relative w-full max-w-lg mx-auto" style={{ height: 400 }}>
      {papers.map((paper, i) => (
        <StackingCard
          key={i}
          paper={paper}
          index={i}
          total={papers.length}
          scrollYProgress={scrollYProgress}
        />
      ))}
    </div>
  );
}
