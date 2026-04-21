"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Network,
  FileText,
  NotebookPen,
  Plus,
  ChevronsRight,
  Upload,
} from "lucide-react";
import type { CanvasTab } from "../_data/types";

const TAB_ICONS = {
  graph: Network,
  doc: FileText,
  note: NotebookPen,
};

const MIN_TAB_WIDTH = 90; // 아이콘 + 짧은 라벨 + 닫기 버튼이 들어가는 최소 너비
const RESERVED_WIDTH = 80; // + 버튼 + overflow chevron 자리

interface Props {
  tabs: CanvasTab[];
  activeTabId: string;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onCreateNote?: () => void;
  onImportNote?: () => void;
}

export default function CanvasTabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onCreateNote,
  onImportNote,
}: Props) {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const overflowBtnRef = useRef<HTMLButtonElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const overflowMenuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [createMenuPos, setCreateMenuPos] = useState({ top: 0, left: 0 });
  const [overflowMenuPos, setOverflowMenuPos] = useState({ top: 0, left: 0 });
  const [maxVisible, setMaxVisible] = useState(tabs.length);

  // Resize observer로 컨테이너 너비를 추적해 동시에 보일 수 있는 탭 수 계산
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - RESERVED_WIDTH;
      const fit = Math.max(1, Math.floor(available / MIN_TAB_WIDTH));
      setMaxVisible(fit);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // active 탭이 항상 visible 되도록 보장
  const { visibleTabs, hiddenTabs } = useMemo(() => {
    if (tabs.length <= maxVisible) {
      return { visibleTabs: tabs, hiddenTabs: [] as CanvasTab[] };
    }
    const activeIdx = tabs.findIndex((t) => t.id === activeTabId);
    // 기본: 처음 N개 visible
    let visible = tabs.slice(0, maxVisible);
    let hidden = tabs.slice(maxVisible);
    // active가 hidden 영역에 있으면 마지막 visible 슬롯과 swap
    if (activeIdx >= maxVisible) {
      visible = [...tabs.slice(0, maxVisible - 1), tabs[activeIdx]];
      hidden = tabs.filter((_, i) => i !== activeIdx).slice(maxVisible - 1);
    }
    return { visibleTabs: visible, hiddenTabs: hidden };
  }, [tabs, maxVisible, activeTabId]);

  // Create menu position & outside click
  useEffect(() => {
    if (!showCreateMenu) return;
    if (createBtnRef.current) {
      const rect = createBtnRef.current.getBoundingClientRect();
      setCreateMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    const handler = (e: MouseEvent) => {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(e.target as Node) &&
        createBtnRef.current &&
        !createBtnRef.current.contains(e.target as Node)
      ) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCreateMenu]);

  // Overflow menu position & outside click
  useEffect(() => {
    if (!showOverflowMenu) return;
    if (overflowBtnRef.current) {
      const rect = overflowBtnRef.current.getBoundingClientRect();
      setOverflowMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 240),
      });
    }
    const handler = (e: MouseEvent) => {
      if (
        overflowMenuRef.current &&
        !overflowMenuRef.current.contains(e.target as Node) &&
        overflowBtnRef.current &&
        !overflowBtnRef.current.contains(e.target as Node)
      ) {
        setShowOverflowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showOverflowMenu]);

  const hiddenHasActive = hiddenTabs.some((t) => t.id === activeTabId);

  return (
    <div ref={containerRef} className="flex items-center h-full w-full min-w-0">
      {visibleTabs.map((tab) => {
        const Icon = TAB_ICONS[tab.type];
        const active = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            title={tab.label}
            className={`flex items-center gap-1.5 h-full px-2.5 text-xs font-semibold cursor-pointer border-r border-white/10 transition-colors flex-1 min-w-0 max-w-[180px] ${
              active
                ? "bg-white/5 text-[color:var(--v2-green-soft)] border-b-2 border-b-[color:var(--v2-green-soft)]"
                : "text-white/50 hover:text-white/75 hover:bg-white/5"
            }`}
            onClick={() => onTabClick(tab.id)}
          >
            <Icon size={12} className="flex-shrink-0" />
            <span className="truncate flex-1 min-w-0">{tab.label}</span>
            {tab.closeable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </div>
        );
      })}

      {/* Overflow chevron — 숨겨진 탭이 있을 때만 */}
      {hiddenTabs.length > 0 && (
        <button
          ref={overflowBtnRef}
          onClick={() => setShowOverflowMenu((p) => !p)}
          className={`flex items-center justify-center gap-0.5 h-full px-2 border-l border-white/10 transition-colors flex-shrink-0 cursor-pointer ${
            hiddenHasActive
              ? "text-[color:var(--v2-green-soft)] bg-[color:var(--v2-green)]/15"
              : "text-white/50 hover:text-[color:var(--v2-green-soft)] hover:bg-white/5"
          }`}
          title={`숨겨진 탭 ${hiddenTabs.length}개`}
        >
          <ChevronsRight size={13} />
          <span className="text-[10px] font-bold">{hiddenTabs.length}</span>
        </button>
      )}

      {/* + 버튼 */}
      <button
        ref={createBtnRef}
        onClick={() => setShowCreateMenu((prev) => !prev)}
        className="flex items-center justify-center w-8 h-full text-white/50 hover:text-[color:var(--v2-green-soft)] hover:bg-white/5 transition-colors flex-shrink-0 cursor-pointer"
        title="새 탭"
      >
        <Plus size={14} />
      </button>

      {/* Create dropdown */}
      {showCreateMenu &&
        createPortal(
          <div
            ref={createMenuRef}
            className="fixed z-[9999] w-40 bg-[color:var(--v2-ink-soft)]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
            style={{ top: createMenuPos.top, left: createMenuPos.left }}
          >
            <button
              onClick={() => {
                onCreateNote?.();
                setShowCreateMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/75 hover:bg-white/5 hover:text-[color:var(--v2-green-soft)] transition-colors cursor-pointer"
            >
              <NotebookPen size={13} />
              새 노트
            </button>
            {onImportNote && (
              <button
                onClick={() => {
                  onImportNote();
                  setShowCreateMenu(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/75 hover:bg-white/5 hover:text-[color:var(--v2-green-soft)] transition-colors cursor-pointer border-t border-white/10"
              >
                <Upload size={13} />
                노트 가져오기 (.md/.txt)
              </button>
            )}
          </div>,
          document.body,
        )}

      {/* Overflow tab list dropdown */}
      {showOverflowMenu &&
        hiddenTabs.length > 0 &&
        createPortal(
          <div
            ref={overflowMenuRef}
            className="fixed z-[9999] w-60 bg-[color:var(--v2-ink-soft)]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden"
            style={{ top: overflowMenuPos.top, left: overflowMenuPos.left }}
          >
            <div className="px-3 py-1.5 border-b border-white/10 bg-white/5">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                숨겨진 탭 · {hiddenTabs.length}
              </span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {hiddenTabs.map((tab) => {
                const Icon = TAB_ICONS[tab.type];
                const active = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => {
                      onTabClick(tab.id);
                      setShowOverflowMenu(false);
                    }}
                    className={`group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors ${
                      active
                        ? "bg-[color:var(--v2-green)]/15 text-[color:var(--v2-green-soft)]"
                        : "text-white/75 hover:bg-white/5 hover:text-[color:var(--v2-green-soft)]"
                    }`}
                  >
                    <Icon size={12} className="flex-shrink-0" />
                    <span className="truncate flex-1">{tab.label}</span>
                    {tab.closeable && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabClose(tab.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-all flex-shrink-0"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
