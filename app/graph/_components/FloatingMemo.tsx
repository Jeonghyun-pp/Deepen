"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { NotebookPen, X, Send, FileText } from "lucide-react";
import type { GraphNode } from "../_data/types";
import { NODE_COLORS, TYPE_LABELS } from "../_data/colors";

interface Props {
  node: GraphNode;
  screenX: number;
  screenY: number;
  onClose: () => void;
  onSave: (nodeId: string, memo: string) => void;
  onOpenDoc?: (nodeId: string, label: string) => void;
}

export default function FloatingMemo({ node, screenX, screenY, onClose, onSave, onOpenDoc }: Props) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Clamp position so it doesn't overflow the viewport
  const pos = (() => {
    if (typeof window === "undefined") return { x: 0, y: 0 };
    const w = 280;
    const h = 200;
    const padding = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = screenX + 20;
    let y = screenY - 40;

    if (x + w > vw - padding) x = screenX - w - 20;
    if (y + h > vh - padding) y = vh - padding - h;
    if (y < padding) y = padding;
    if (x < padding) x = padding;

    return { x, y };
  })();

  // Focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the same click
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const handleSave = () => {
    if (text.trim()) {
      onSave(node.id, text.trim());
      setText("");
    }
    onClose();
  };

  const color = NODE_COLORS[node.type];

  return createPortal(
    <div
      ref={ref}
      className="fixed z-[9999] w-[280px] bg-white rounded-2xl border border-border shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gray-50/80">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-xs font-semibold text-text-primary truncate flex-1">
          {node.label}
        </span>
        <span className="text-[9px] text-text-muted">{TYPE_LABELS[node.type]}</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded text-text-muted hover:text-text-primary transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Open doc button — paper/document only */}
      {(node.type === "paper" || node.type === "document") && onOpenDoc && (
        <div className="px-3 pt-2">
          <button
            onClick={() => { onOpenDoc(node.id, node.label); onClose(); }}
            className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl bg-violet-50 border border-violet-200/60 text-xs font-semibold text-violet-600 hover:bg-violet-100 hover:border-violet-300 transition-colors"
          >
            <FileText size={12} />
            문서 열기
          </button>
        </div>
      )}

      {/* Memo input */}
      <div className="p-3">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
            if (e.key === "Escape") onClose();
          }}
          placeholder="이 노드에 대한 메모..."
          rows={3}
          className="w-full bg-amber-50/50 rounded-xl p-2.5 text-sm text-text-primary outline-none border border-amber-200/60 focus:border-amber-400 transition-colors resize-none placeholder:text-text-muted/50"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-gray-50/50">
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <NotebookPen size={10} />
          <span>Enter로 저장</span>
        </div>
        <button
          onClick={handleSave}
          disabled={!text.trim()}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-coral text-white hover:bg-coral-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={10} />
          저장
        </button>
      </div>
    </div>,
    document.body
  );
}
