"use client";

import type { SubgraphSection } from "../../_data/projection";
import { NODE_COLORS, TYPE_LABELS } from "../../_data/colors";
import { RELATION_META } from "./relation-meta";
import { ArrowUpRight } from "lucide-react";

interface Props {
  section: SubgraphSection;
  onItemClick: (nodeId: string) => void;
}

export default function ProjectionSection({ section, onItemClick }: Props) {
  if (section.items.length === 0) return null;
  const meta = RELATION_META[section.relationType];
  const Icon = meta.icon;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: meta.color + "22", color: meta.color }}
        >
          <Icon size={14} />
        </div>
        <h3 className="text-sm font-bold text-white">{meta.label}</h3>
        <span className="text-[10px] font-semibold text-white/50">
          {section.items.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {section.items.map(({ edge, target }) => {
          const nodeColor = NODE_COLORS[target.type];
          return (
            <button
              key={edge.id}
              onClick={() => onItemClick(target.id)}
              className="group w-full text-left rounded-xl border border-white/10 bg-white/5 hover:border-[color:var(--v2-green-soft)]/40 hover:bg-white/8 transition-all px-3 py-2.5 cursor-pointer"
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: nodeColor }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-white truncate">
                      {target.label}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: nodeColor + "22", color: nodeColor }}
                    >
                      {TYPE_LABELS[target.type]}
                    </span>
                    {target.meta?.year && (
                      <span className="text-[10px] text-white/50">
                        {target.meta.year}
                      </span>
                    )}
                  </div>
                  {(edge.note || target.tldr) && (
                    <p className="text-xs text-white/75 leading-relaxed mt-1 line-clamp-2">
                      {edge.note ?? target.tldr}
                    </p>
                  )}
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-white/50 group-hover:text-[color:var(--v2-green-soft)] transition-colors flex-shrink-0 mt-0.5"
                />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
