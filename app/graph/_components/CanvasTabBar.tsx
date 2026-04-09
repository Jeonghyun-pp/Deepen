"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Network, FileText, Map, NotebookPen, Plus } from "lucide-react";
import type { CanvasTab } from "../_data/types";

const TAB_ICONS = {
  graph: Network,
  doc: FileText,
  "roadmap-timeline": Map,
  note: NotebookPen,
};

interface Props {
  tabs: CanvasTab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onCreateNote?: () => void;
}

export default function CanvasTabBar({ tabs, activeTabId, onTabClick, onTabClose, onCreateNote }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Position dropdown & close on outside click
  useEffect(() => {
    if (!showMenu) return;
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  return (
    <div className="flex items-center h-full overflow-x-auto">
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

      {/* + 버튼 */}
      <button
        ref={btnRef}
        onClick={() => setShowMenu((prev) => !prev)}
        className="flex items-center justify-center w-8 h-full text-text-muted hover:text-coral hover:bg-white/60 transition-colors"
        title="새 탭"
      >
        <Plus size={14} />
      </button>

      {showMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-40 bg-white rounded-xl border border-border shadow-lg overflow-hidden"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            onClick={() => { onCreateNote?.(); setShowMenu(false); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-coral-light/30 hover:text-coral transition-colors"
          >
            <NotebookPen size={13} />
            새 노트
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
