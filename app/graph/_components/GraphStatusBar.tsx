"use client";

import { useState, useRef, useEffect } from "react";
import { Maximize2, Compass, ChevronDown, LayoutGrid } from "lucide-react";
import { type ViewMode, type LayoutId, LAYOUT_OPTIONS } from "../_hooks/useGraphData";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layoutId: LayoutId;
  onLayoutChange: (id: LayoutId) => void;
  localMode: boolean;
  onLocalToggle: () => void;
  onFit: () => void;
  nodeCount: number;
  edgeCount: number;
}

export default function GraphStatusBar({
  viewMode,
  onViewModeChange,
  layoutId,
  onLayoutChange,
  localMode,
  onLocalToggle,
  onFit,
  nodeCount,
  edgeCount,
}: Props) {
  const [layoutOpen, setLayoutOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setLayoutOpen(false);
      }
    }
    if (layoutOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [layoutOpen]);

  const currentLayout = LAYOUT_OPTIONS.find((l) => l.id === layoutId);
  const availableLayouts = LAYOUT_OPTIONS.filter(
    (l) => viewMode === "2d" || l.dim === "both"
  );

  return (
    <div className="flex items-center h-8 px-3 bg-gray-50 border-t border-border text-xs shrink-0 gap-2">
      {/* Node/Edge count */}
      <span className="text-text-muted">
        {nodeCount} nodes · {edgeCount} edges
      </span>

      <div className="flex-1" />

      {/* Layout Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setLayoutOpen(!layoutOpen)}
          className="flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold text-text-secondary hover:bg-white hover:text-text-primary border border-transparent hover:border-border transition-all"
        >
          <LayoutGrid size={11} />
          <span>{currentLayout?.label}</span>
          <ChevronDown size={10} className={`transition-transform ${layoutOpen ? "rotate-180" : ""}`} />
        </button>

        {layoutOpen && (
          <div className="absolute left-0 bottom-8 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[140px] z-20">
            {availableLayouts.map((l) => (
              <button
                key={l.id}
                onClick={() => { onLayoutChange(l.id); setLayoutOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                  layoutId === l.id
                    ? "text-coral font-bold bg-coral-light/40"
                    : "text-text-secondary hover:bg-coral-light/20"
                }`}
              >
                {l.label}
                {l.dim === "2d" && <span className="text-text-muted ml-1">(2D)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2D / 3D Toggle */}
      <div className="flex rounded overflow-hidden border border-border">
        {(["2d", "3d"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`h-6 px-2 text-[11px] font-bold transition-all cursor-pointer ${
              viewMode === mode
                ? "bg-coral text-white"
                : "bg-white text-text-muted hover:text-text-secondary"
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Local Mode */}
      <button
        onClick={onLocalToggle}
        title="로컬 모드"
        className={`flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold transition-all border ${
          localMode
            ? "bg-coral text-white border-coral"
            : "bg-white text-text-muted border-border hover:text-text-secondary"
        }`}
      >
        <Compass size={11} />
        <span>로컬</span>
      </button>

      {/* Fit */}
      <button
        onClick={onFit}
        title="전체 보기"
        className="flex items-center h-6 px-2 rounded text-[11px] font-semibold text-text-muted bg-white border border-border hover:text-text-secondary transition-all"
      >
        <Maximize2 size={11} />
      </button>
    </div>
  );
}
