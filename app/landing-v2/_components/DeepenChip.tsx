"use client";

import { motion } from "framer-motion";

export default function DeepenChip() {
  return (
    <div className="relative w-[180px] h-[180px] mx-auto">
      {/* outer glow */}
      <div
        className="absolute inset-0 rounded-[32px] blur-2xl opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #22C55E 0%, transparent 70%)",
        }}
      />
      {/* chip body */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full h-full rounded-[28px] border border-[color:var(--v2-green-deep)] overflow-hidden"
        style={{
          background:
            "linear-gradient(140deg, #0F3B24 0%, #050807 60%, #15803D 120%)",
          boxShadow:
            "inset 0 0 40px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.25)",
        }}
      >
        {/* circuit grid */}
        <svg
          viewBox="0 0 180 180"
          className="absolute inset-0 w-full h-full"
          fill="none"
        >
          <defs>
            <pattern
              id="chipGrid"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 18 0 L 0 0 0 18"
                stroke="#22C55E"
                strokeWidth="0.4"
                opacity="0.45"
              />
            </pattern>
          </defs>
          <rect width="180" height="180" fill="url(#chipGrid)" />
          {/* center highlight dots */}
          {[
            [54, 54],
            [126, 54],
            [54, 126],
            [126, 126],
            [90, 90],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.5" fill="#4ADE80" />
          ))}
        </svg>
        {/* DEEPEN wordmark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-extrabold tracking-[0.2em] text-sm"
            style={{ color: "#DFF7E8", textShadow: "0 0 12px #22C55E" }}
          >
            DEEPEN
          </span>
        </div>
      </motion.div>
    </div>
  );
}
