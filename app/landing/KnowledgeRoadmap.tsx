"use client";

import { motion } from "framer-motion";

interface Paper {
  title: string;
  authors: string;
  tag: string;
  abstract: string;
}

interface KnowledgeRoadmapProps {
  papers: Paper[];
}

const TAG_COLORS: Record<string, string> = {
  NLP: "#4A90FF",
  LLM: "#FF6B6B",
  CV: "#00C9A7",
  RL: "#FFB347",
};

const NODES = [
  { x: 100, y: 200, level: 0 },
  { x: 320, y: 80, level: 1 },
  { x: 320, y: 320, level: 1 },
  { x: 540, y: 40, level: 2 },
  { x: 540, y: 240, level: 2 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 4],
];

const NODE_W = 200;
const NODE_H = 72;

function EdgeLine({
  x1, y1, x2, y2, delay,
}: {
  x1: number; y1: number; x2: number; y2: number; delay: number;
}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const midX = x1 + dx * 0.5;
  const midY = y1 + dy * 0.5 - Math.abs(dx) * 0.06;
  const d = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="#CBD5E1"
      strokeWidth={2}
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 0.4 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    />
  );
}

function GraphNode({
  x, y, paper, delay,
}: {
  x: number; y: number; paper: Paper; delay: number;
}) {
  const color = TAG_COLORS[paper.tag] ?? "#8888A0";

  return (
    <motion.foreignObject
      x={x - NODE_W / 2}
      y={y - NODE_H / 2}
      width={NODE_W}
      height={NODE_H}
      initial={{ opacity: 0, scale: 0.6 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    >
      <div
        style={{ borderColor: color + "40" }}
        className="w-full h-full rounded-xl bg-white border-[1.5px] px-3.5 py-2.5 flex flex-col justify-center overflow-hidden"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-[11px] text-text-primary truncate flex-1 leading-tight">
            {paper.title}
          </span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
            style={{ background: color }}
          >
            {paper.tag}
          </span>
        </div>
        <span className="text-[9px] text-text-muted truncate">{paper.authors}</span>
        <span className="text-[10px] text-text-secondary truncate mt-0.5 leading-tight">
          {paper.abstract}
        </span>
      </div>
    </motion.foreignObject>
  );
}

export default function KnowledgeRoadmap({ papers }: KnowledgeRoadmapProps) {
  return (
    <svg viewBox="0 0 700 400" className="w-full max-w-4xl mx-auto overflow-visible">
      {/* Edges */}
      {EDGES.map(([from, to], i) => {
        const delay = Math.min(NODES[from].level, NODES[to].level) * 0.5 + 0.3;
        return (
          <EdgeLine
            key={i}
            x1={NODES[from].x} y1={NODES[from].y}
            x2={NODES[to].x} y2={NODES[to].y}
            delay={delay}
          />
        );
      })}

      {/* Nodes */}
      {papers.slice(0, NODES.length).map((paper, i) => (
        <GraphNode
          key={i}
          x={NODES[i].x} y={NODES[i].y}
          paper={paper}
          delay={NODES[i].level * 0.5 + 0.1}
        />
      ))}
    </svg>
  );
}
