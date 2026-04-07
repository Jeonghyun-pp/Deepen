"use client";

import type { NodeType } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";

const NODE_TYPES: NodeType[] = ["paper", "concept", "memo", "document"];

interface Props {
  activeFilters: Set<NodeType>;
  onToggle: (type: NodeType) => void;
}

export default function FilterBar({ activeFilters, onToggle }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 absolute top-14 left-3 z-10">
      {NODE_TYPES.map((type) => {
        const active = activeFilters.has(type);
        const color = NODE_COLORS[type];
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer shadow-sm ${
              active ? "opacity-100" : "opacity-60"
            }`}
            style={{
              border: `1px solid ${active ? color + "40" : "#E8E8F0"}`,
              background: active ? color + "10" : "#FFFFFF",
              color: active ? color : "#8888A0",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: color, opacity: active ? 1 : 0.3 }}
            />
            {TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
