"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

type Dot = {
  x: number;
  y: number;
  r: number;
  color: "green" | "soft" | "muted";
  delay: number;
};

// Deterministic pseudo-random for SSR stability.
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function useDots(count: number, seed = 1): Dot[] {
  return useMemo(() => {
    const rand = seeded(seed);
    const out: Dot[] = [];
    for (let i = 0; i < count; i++) {
      const roll = rand();
      const color: Dot["color"] =
        roll < 0.45 ? "green" : roll < 0.75 ? "soft" : "muted";
      out.push({
        x: rand() * 100,
        y: rand() * 100,
        r: 2 + rand() * 6,
        color,
        delay: rand() * 0.6,
      });
    }
    return out;
  }, [count, seed]);
}

const colorMap: Record<Dot["color"], string> = {
  green: "#22C55E",
  soft: "#4ADE80",
  muted: "#A7BFB1",
};

export default function DotField({
  count = 40,
  seed = 1,
}: {
  count?: number;
  seed?: number;
}) {
  const dots = useDots(count, seed);
  return (
    <div className="absolute inset-0 pointer-events-none">
      {dots.map((d, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, delay: d.delay, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.r,
            height: d.r,
            background: colorMap[d.color],
            boxShadow:
              d.color === "muted"
                ? "none"
                : `0 0 ${d.r * 2}px ${colorMap[d.color]}55`,
            opacity: d.color === "muted" ? 0.5 : 0.9,
          }}
        />
      ))}
    </div>
  );
}
