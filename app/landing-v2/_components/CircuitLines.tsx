"use client";

import { motion } from "framer-motion";

/**
 * Horizontal circuit lines extending from the central chip to four small
 * satellite icons, matching the reference hero composition.
 */
export default function CircuitLines() {
  return (
    <svg
      viewBox="0 0 1200 260"
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(1200px,95vw)] pointer-events-none"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="wire" x1="0" x2="1">
          <stop offset="0" stopColor="#22C55E" stopOpacity="0" />
          <stop offset="0.5" stopColor="#22C55E" stopOpacity="0.9" />
          <stop offset="1" stopColor="#22C55E" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* left wires */}
      <motion.path
        d="M 520 130 L 360 130 L 300 90 L 120 90"
        stroke="url(#wire)"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.path
        d="M 520 130 L 360 130 L 300 170 L 120 170"
        stroke="url(#wire)"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />

      {/* right wires */}
      <motion.path
        d="M 680 130 L 840 130 L 900 90 L 1080 90"
        stroke="url(#wire)"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
      />
      <motion.path
        d="M 680 130 L 840 130 L 900 170 L 1080 170"
        stroke="url(#wire)"
        strokeWidth="1.2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.5 }}
      />

      {/* satellite node dots */}
      {[
        [120, 90],
        [120, 170],
        [1080, 90],
        [1080, 170],
      ].map(([x, y], i) => (
        <motion.g
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.3 + i * 0.1 }}
        >
          <rect
            x={x - 12}
            y={y - 12}
            width="24"
            height="24"
            rx="6"
            fill="#0D1412"
            stroke="#1F2A26"
          />
          <circle cx={x} cy={y} r="2.5" fill="#4ADE80" />
        </motion.g>
      ))}
    </svg>
  );
}
