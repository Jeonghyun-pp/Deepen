"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { LayerItem } from "@/lib/mock/analysis";

interface Props {
  icon: LucideIcon;
  label: string;
  color: string;
  summary: string;
  items: LayerItem[];
  fields: { title: string; desc1: string; desc2: string };
}

export default function LayerContent({ icon: Icon, label, color, summary, items, fields }: Props) {
  return (
    <div className="rounded-xl border border-border p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} style={{ color }} />
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
      </div>

      {/* Summary */}
      <p className="text-sm text-text-secondary leading-relaxed mb-4">{summary}</p>

      {/* Items */}
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex gap-3 p-3 rounded-lg bg-gray-50"
          >
            <span className="text-sm mt-0.5" style={{ color }}>●</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {item[fields.title]}
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {item[fields.desc1]}
              </p>
              {item[fields.desc2] && (
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  {fields.desc2 === "readiness" ? (
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        background: item[fields.desc2] === "Production" ? "#dcfce7" : "#fef3c7",
                        color: item[fields.desc2] === "Production" ? "#166534" : "#92400e",
                      }}
                    >
                      {item[fields.desc2]}
                    </span>
                  ) : (
                    item[fields.desc2]
                  )}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
