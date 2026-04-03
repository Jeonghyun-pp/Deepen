"use client";

import { motion } from "framer-motion";
import LucideIcon from "@/app/components/LucideIcon";

interface LayerMapProps {
  layers: { label: string; desc: string; icon: string }[];
}

const ANGLES = [270, 330, 30, 90, 150, 210];
const COLORS = ["#FF6B6B", "#4A90FF", "#00C9A7", "#FFB347", "#CE82FF", "#FF8A80"];

const CX = 320;
const CY = 280;
const R1 = 140;
const R2 = 245;

/* ── Compressed, overlapping timing ── */
const T = {
  centerNode: 0,
  centerLines: 0.3,
  layerNodes: 0.45,
  subLines: 0.85,
  subNodes: 1.05,
  crossEdges: 1.3,
  flowDots: 1.75,
  vignette: 2.2,
  merge: 2.45,
  pulse: 2.7,
};

function getSubNodes() {
  const subs: { x: number; y: number; parentIdx: number; color: string }[] = [];
  ANGLES.forEach((deg, i) => {
    [-20, 20].forEach((offset) => {
      const rad = ((deg + offset) * Math.PI) / 180;
      subs.push({
        x: CX + R2 * Math.cos(rad),
        y: CY + R2 * Math.sin(rad),
        parentIdx: i,
        color: COLORS[i],
      });
    });
  });
  return subs;
}

const SUB_NODES = getSubNodes();

const CROSS_EDGES: [number, number][] = [
  [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 0],
];

function AnimatedLine({
  x1, y1, x2, y2, color, delay, dashed, opacity: targetOpacity,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; delay: number; dashed?: boolean; opacity?: number;
}) {
  return (
    <motion.line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={dashed ? 1.5 : 2}
      strokeDasharray={dashed ? "4 3" : "none"}
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: targetOpacity ?? 0.3 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    />
  );
}

function AnimatedCurve({
  x1, y1, x2, y2, color, delay,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; delay: number;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = mx - CX;
  const dy = my - CY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const cx2 = mx + (dx / len) * 30;
  const cy2 = my + (dy / len) * 30;
  const d = `M ${x1} ${y1} Q ${cx2} ${cy2} ${x2} ${y2}`;

  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeDasharray="3 3"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 0.2 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
    />
  );
}

export default function LayerMap({ layers }: LayerMapProps) {
  const layerPositions = ANGLES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + R1 * Math.cos(rad), y: CY + R1 * Math.sin(rad), deg };
  });

  return (
    <svg viewBox="0 0 640 560" className="w-full max-w-3xl mx-auto overflow-visible">

      <defs>
        <linearGradient id="mergeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          {COLORS.map((color, i) => (
            <stop key={i} offset={`${(i / (COLORS.length - 1)) * 100}%`} stopColor={color} />
          ))}
        </linearGradient>
        <radialGradient
          id="fadeOverlay"
          cx={CX} cy={CY} r={280}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="white" stopOpacity={0} />
          <stop offset="40%" stopColor="white" stopOpacity={0} />
          <stop offset="100%" stopColor="white" stopOpacity={0.55} />
        </radialGradient>
        <filter id="dotGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Phase 1: Center → Layer lines ── */}
      {layerPositions.map((pos, i) => (
        <AnimatedLine
          key={`cl-${i}`}
          x1={CX} y1={CY} x2={pos.x} y2={pos.y}
          color={COLORS[i]} delay={T.centerLines + i * 0.04} dashed opacity={0.2}
        />
      ))}

      {/* ── Phase 2: Layer → Sub-node lines (overlaps with layer nodes appearing) ── */}
      {SUB_NODES.map((sub, i) => {
        const parent = layerPositions[sub.parentIdx];
        return (
          <AnimatedLine
            key={`ls-${i}`}
            x1={parent.x} y1={parent.y} x2={sub.x} y2={sub.y}
            color={sub.color} delay={T.subLines + i * 0.03} dashed opacity={0.15}
          />
        );
      })}

      {/* ── Phase 3: Cross-connections (starts while sub-nodes still appearing) ── */}
      {CROSS_EDGES.map(([a, b], i) => (
        <AnimatedCurve
          key={`cc-${i}`}
          x1={SUB_NODES[a].x} y1={SUB_NODES[a].y}
          x2={SUB_NODES[b].x} y2={SUB_NODES[b].y}
          color="#94A3B8"
          delay={T.crossEdges + i * 0.04}
        />
      ))}

      {/* ── Center node ── */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: T.centerNode }}
      >
        <circle cx={CX} cy={CY} r={34} fill="#FF6B6B" opacity={0.08} />
        <circle cx={CX} cy={CY} r={24} fill="white" stroke="#FF6B6B" strokeWidth={2} />
        <foreignObject x={CX - 12} y={CY - 12} width={24} height={24}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <LucideIcon name="file-text" size={18} style={{ color: "#FF6B6B" }} strokeWidth={1.8} />
          </div>
        </foreignObject>
      </motion.g>

      {/* ── Layer nodes (tighter stagger) ── */}
      {layers.map((layer, i) => {
        const pos = layerPositions[i];
        const isBottom = pos.deg > 60 && pos.deg < 240;
        const labelY = isBottom ? pos.y + 48 : pos.y - 40;

        return (
          <motion.g
            key={`layer-${i}`}
            initial={{ opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: T.layerNodes + i * 0.06 }}
            style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
          >
            <circle cx={pos.x} cy={pos.y} r={30} fill={COLORS[i]} opacity={0.08} />
            <circle cx={pos.x} cy={pos.y} r={22} fill="white" stroke={COLORS[i]} strokeWidth={2} />
            <foreignObject x={pos.x - 11} y={pos.y - 11} width={22} height={22}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                <LucideIcon name={layer.icon} size={16} style={{ color: COLORS[i] }} strokeWidth={1.8} />
              </div>
            </foreignObject>
            <text
              x={pos.x} y={labelY}
              textAnchor="middle" fill="#1A1A2E" fontSize={11} fontWeight={700}
            >
              {layer.label}
            </text>
          </motion.g>
        );
      })}

      {/* ── Sub-nodes ── */}
      {SUB_NODES.map((sub, i) => (
        <motion.g
          key={`sub-${i}`}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: T.subNodes + i * 0.03 }}
          style={{ transformOrigin: `${sub.x}px ${sub.y}px` }}
        >
          <circle cx={sub.x} cy={sub.y} r={8} fill={sub.color} opacity={0.15} />
          <circle cx={sub.x} cy={sub.y} r={5} fill="white" stroke={sub.color} strokeWidth={1.5} />
        </motion.g>
      ))}

      {/* ── Phase 4: Color flow dots with glow (overlaps with cross-edges finishing) ── */}
      {layerPositions.map((pos, i) =>
        [0, 1].map((j) => (
          <motion.g
            key={`flow-${i}-${j}`}
            initial={{ x: 0, y: 0 }}
            whileInView={{ x: CX - pos.x, y: CY - pos.y }}
            viewport={{ once: true }}
            transition={{
              duration: 0.8,
              delay: T.flowDots + i * 0.05 + j * 0.18,
              ease: [0.4, 0, 0.2, 1],
            }}
          >
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={j === 0 ? 4 : 2.5}
              fill={COLORS[i]}
              filter="url(#dotGlow)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: [0, 0.9, 0.8, 0] }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                delay: T.flowDots + i * 0.05 + j * 0.18,
              }}
            />
          </motion.g>
        ))
      )}

      {/* ── Phase 4: Vignette fade (begins while dots are still traveling) ── */}
      <motion.rect
        x={0} y={0} width={640} height={560}
        fill="url(#fadeOverlay)"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: T.vignette, duration: 1.0, ease: "easeInOut" }}
        pointerEvents="none"
      />

      {/* ── Phase 4: Merged center (arrives as dots reach center) ── */}
      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{
          delay: T.merge,
          duration: 0.7,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
      >
        <circle cx={CX} cy={CY} r={46} fill="url(#mergeGrad)" opacity={0.10} />
        <circle cx={CX} cy={CY} r={32} fill="white" stroke="url(#mergeGrad)" strokeWidth={2.5} />
        <foreignObject x={CX - 14} y={CY - 14} width={28} height={28}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <LucideIcon name="sparkles" size={20} style={{ color: "#4A90FF" }} strokeWidth={1.8} />
          </div>
        </foreignObject>
      </motion.g>

      {/* ── Phase 4: Pulse ring ── */}
      <motion.circle
        cx={CX} cy={CY} r={32}
        fill="none"
        stroke="url(#mergeGrad)"
        strokeWidth={1.5}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: [0, 0.35, 0], scale: [1, 1.8] }}
        viewport={{ once: true }}
        transition={{ delay: T.pulse, duration: 0.9, ease: "easeOut" }}
        style={{ transformOrigin: `${CX}px ${CY}px` }}
        pointerEvents="none"
      />
    </svg>
  );
}
