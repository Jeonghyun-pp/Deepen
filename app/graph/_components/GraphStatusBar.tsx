"use client";

import { useState, useRef, useEffect } from "react";
import { Maximize2, Compass, ChevronDown, LayoutGrid } from "lucide-react";
import { type ViewMode, type LayoutId, type EdgeStyle, type RelevanceDensity, LAYOUT_OPTIONS } from "../_hooks/useGraphData";

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layoutId: LayoutId;
  onLayoutChange: (id: LayoutId) => void;
  edgeStyle: EdgeStyle;
  onEdgeStyleChange: (style: EdgeStyle) => void;
  relevanceDensity: RelevanceDensity;
  onRelevanceDensityChange: (d: RelevanceDensity) => void;
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
  edgeStyle,
  onEdgeStyleChange,
  relevanceDensity,
  onRelevanceDensityChange,
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
    <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-center gap-3 px-5 py-2.5 bg-[color:var(--v2-ink)]/80 backdrop-blur-md rounded-2xl border border-white/10 text-xs">
      {/* Layout Dropdown */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setLayoutOpen(!layoutOpen)}
          className="flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-semibold text-white/75 hover:bg-white/5 transition-all"
        >
          <LayoutGrid size={11} />
          <span>{currentLayout?.label}</span>
          <ChevronDown size={10} className={`transition-transform ${layoutOpen ? "rotate-180" : ""}`} />
        </button>

        {layoutOpen && (
          <div className="absolute left-0 bottom-9 bg-[color:var(--v2-ink-soft)]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] py-1 min-w-[140px] z-20">
            {availableLayouts.map((l) => (
              <button
                key={l.id}
                onClick={() => { onLayoutChange(l.id); setLayoutOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                  layoutId === l.id
                    ? "text-[color:var(--v2-green-soft)] font-bold bg-[color:var(--v2-green)]/15"
                    : "text-white/75 hover:bg-white/5"
                }`}
              >
                {l.label}
                {l.dim === "2d" && <span className="text-white/50 ml-1">(2D)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />

      {/* 2D / 3D Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {(["2d", "3d"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`h-7 px-2.5 text-[11px] font-bold transition-all cursor-pointer ${
              viewMode === mode
                ? "bg-[color:var(--v2-green)] text-black"
                : "text-white/50 hover:text-white/75"
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Relevance Density Toggle */}
      <div className="flex rounded-lg overflow-hidden border border-white/10">
        {(["default", "full"] as RelevanceDensity[]).map((d) => (
          <button
            key={d}
            onClick={() => onRelevanceDensityChange(d)}
            className={`h-7 px-2.5 text-[11px] font-bold transition-all cursor-pointer ${
              relevanceDensity === d
                ? "bg-[color:var(--v2-green)] text-black"
                : "text-white/50 hover:text-white/75"
            }`}
          >
            {d === "default" ? "기본" : "전체"}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />

      {/* Local Mode */}
      <button
        onClick={onLocalToggle}
        title="로컬 모드"
        className={`flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
          localMode
            ? "bg-[color:var(--v2-green)] text-black"
            : "text-white/50 hover:bg-white/5"
        }`}
      >
        <Compass size={11} />
        <span>로컬</span>
      </button>

      {/* Fit */}
      <button
        onClick={onFit}
        title="전체 보기"
        className="flex items-center h-7 px-2.5 rounded-lg text-[11px] font-semibold text-white/50 hover:bg-white/5 transition-all"
      >
        <Maximize2 size={11} />
      </button>
    </div>
  );
}
