"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Maximize2, Compass, ChevronDown, LayoutGrid, AlertTriangle, Download } from "lucide-react";
import { type ViewMode, type LayoutId, LAYOUT_OPTIONS } from "../_hooks/useGraphData";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  layoutId: LayoutId;
  onLayoutChange: (id: LayoutId) => void;
  localMode: boolean;
  onLocalToggle: () => void;
  onFit: () => void;
  gapMode: boolean;
  onGapToggle: () => void;
  onExport: () => void;
}

function ToolbarButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer border ${
        active
          ? "bg-[color:var(--v2-green)] text-black border-[color:var(--v2-green)]"
          : "bg-[color:var(--v2-ink-soft)]/80 backdrop-blur-md text-white/75 border-white/10 hover:border-[color:var(--v2-green-soft)]/40 hover:text-white"
      }`}
      style={active ? { boxShadow: "0 2px 0 var(--v2-green-deep)" } : undefined}
    >
      {children}
    </button>
  );
}

export default function GraphToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  layoutId,
  onLayoutChange,
  localMode,
  onLocalToggle,
  onFit,
  gapMode,
  onGapToggle,
  onExport,
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
    <div
      className="flex items-center gap-2 px-3 py-2 absolute top-3 left-3 right-3 z-10"
      style={{ pointerEvents: "none" }}
    >
      {/* Search */}
      <div
        className="flex items-center gap-2 px-3 h-[34px] rounded-xl bg-[color:var(--v2-ink-soft)]/80 backdrop-blur-md border border-white/10 min-w-[200px] max-w-[320px]"
        style={{ pointerEvents: "auto" }}
      >
        <Search size={14} className="text-white/50" />
        <input
          type="text"
          placeholder="노드 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-transparent outline-none text-sm flex-1 text-white placeholder:text-white/40"
        />
      </div>

      <div className="flex-1" />

      {/* Layout Dropdown */}
      <div ref={dropdownRef} className="relative" style={{ pointerEvents: "auto" }}>
        <button
          onClick={() => setLayoutOpen(!layoutOpen)}
          className="h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border bg-[color:var(--v2-ink-soft)]/80 backdrop-blur-md text-white/75 border-white/10 hover:border-[color:var(--v2-green-soft)]/40 hover:text-white"
        >
          <LayoutGrid size={13} />
          <span>{currentLayout?.label}</span>
          <ChevronDown size={12} className={`transition-transform ${layoutOpen ? "rotate-180" : ""}`} />
        </button>

        {layoutOpen && (
          <div className="absolute right-0 top-10 bg-[color:var(--v2-ink-soft)]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] py-1 min-w-[160px] z-20">
            {availableLayouts.map((l) => (
              <button
                key={l.id}
                onClick={() => { onLayoutChange(l.id); setLayoutOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  layoutId === l.id
                    ? "text-[color:var(--v2-green-soft)] font-bold bg-[color:var(--v2-green)]/15"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
                {l.dim === "2d" && <span className="text-white/50 ml-1">(2D)</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2D / 3D Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-white/10 bg-[color:var(--v2-ink-soft)]/80 backdrop-blur-md" style={{ pointerEvents: "auto" }}>
        {(["2d", "3d"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`h-8 px-3 text-xs font-bold transition-all cursor-pointer ${
              viewMode === mode
                ? "bg-[color:var(--v2-green)] text-black"
                : "text-white/75 hover:text-white"
            }`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Local Mode */}
      <div style={{ pointerEvents: "auto" }}>
        <ToolbarButton active={localMode} onClick={onLocalToggle} title="로컬 모드">
          <Compass size={14} />
        </ToolbarButton>
      </div>

      {/* Fit */}
      <div style={{ pointerEvents: "auto" }}>
        <ToolbarButton onClick={onFit} title="전체 보기">
          <Maximize2 size={14} />
        </ToolbarButton>
      </div>

      {/* Gap Mode */}
      <div style={{ pointerEvents: "auto" }}>
        <ToolbarButton active={gapMode} onClick={onGapToggle} title="지식 갭">
          <AlertTriangle size={14} />
          <span>갭</span>
        </ToolbarButton>
      </div>

      {/* Export */}
      <div style={{ pointerEvents: "auto" }}>
        <ToolbarButton onClick={onExport} title="내보내기">
          <Download size={14} />
        </ToolbarButton>
      </div>
    </div>
  );
}
