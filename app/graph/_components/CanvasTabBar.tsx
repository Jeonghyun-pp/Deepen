"use client";

import { X, Network, FileText, Map } from "lucide-react";
import type { CanvasTab } from "../_data/types";

const TAB_ICONS = {
  graph: Network,
  "paper-detail": FileText,
  "roadmap-timeline": Map,
};

interface Props {
  tabs: CanvasTab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
}

export default function CanvasTabBar({ tabs, activeTabId, onTabClick, onTabClose }: Props) {
  return (
    <div className="flex items-center h-9 bg-gray-50 border-b border-border overflow-x-auto shrink-0">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab.type];
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`flex items-center gap-1.5 h-full px-3 text-xs font-semibold cursor-pointer border-r border-border transition-colors shrink-0 ${
              active
                ? "bg-white text-coral border-b-2 border-b-coral"
                : "text-text-muted hover:text-text-secondary hover:bg-white/60"
            }`}
            onClick={() => onTabClick(tab.id)}
          >
            <Icon size={12} />
            <span className="max-w-[120px] truncate">{tab.label}</span>
            {tab.closeable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="ml-1 p-0.5 rounded hover:bg-gray-200 text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
