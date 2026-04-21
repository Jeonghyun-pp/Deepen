"use client";

import { motion } from "framer-motion";

type Node = { id: string; x: number; y: number; r: number; gap?: boolean };
type Edge = { from: string; to: string; gap?: boolean };

const nodes: Node[] = [
  { id: "a", x: 110, y: 130, r: 10 },
  { id: "b", x: 250, y: 95, r: 13 },
  { id: "c", x: 320, y: 205, r: 9 },
  { id: "d", x: 185, y: 230, r: 14, gap: true },
  { id: "e", x: 95, y: 285, r: 9 },
  { id: "f", x: 265, y: 320, r: 11 },
];

const edges: Edge[] = [
  { from: "a", to: "b" },
  { from: "b", to: "c" },
  { from: "c", to: "f" },
  { from: "a", to: "e" },
  { from: "e", to: "f" },
  { from: "b", to: "d", gap: true },
  { from: "c", to: "d", gap: true },
  { from: "e", to: "d", gap: true },
];

const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

export default function KnowledgeGapsGraph() {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-3xl">
      {/* dark base matching GreenOrbs palette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, #0F3B24 0%, #091B11 55%, #050807 100%)",
        }}
      />

      <svg
        viewBox="0 0 400 400"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="node-fill" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#BBF7D0" />
            <stop offset="55%" stopColor="#4ADE80" />
            <stop offset="100%" stopColor="#15803D" />
          </radialGradient>
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* edges */}
        {edges.map((e, i) => {
          const a = byId[e.from];
          const b = byId[e.to];
          return (
            <motion.line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.gap ? "rgba(74,222,128,0.35)" : "rgba(187,247,208,0.55)"}
              strokeWidth={e.gap ? 1 : 1.25}
              strokeDasharray={e.gap ? "4 5" : "0"}
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, delay: 0.2 + i * 0.08 }}
            />
          );
        })}

        {/* nodes */}
        {nodes.map((n, i) =>
          n.gap ? (
            <motion.g
              key={n.id}
              initial={{ opacity: 0, scale: 0.6 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <motion.g
                style={{ transformOrigin: `${n.x}px ${n.y}px` }}
                animate={{ scale: [1, 1.35, 1], opacity: [0.25, 0.55, 0.25] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 8}
                  fill="rgba(74,222,128,0.12)"
                />
              </motion.g>
              <circle
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill="transparent"
                stroke="#4ADE80"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            </motion.g>
          ) : (
            <motion.circle
              key={n.id}
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill="url(#node-fill)"
              filter="url(#node-glow)"
              initial={{ opacity: 0, scale: 0.4 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
            />
          ),
        )}
      </svg>
    </div>
  );
}
