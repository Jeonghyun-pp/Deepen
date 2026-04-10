"use client";

import { useState } from "react";
import { ShieldAlert, Check, X } from "lucide-react";
import type { ApprovalItem } from "@/lib/agent/types";

interface Props {
  items: ApprovalItem[];
  onResolve: (decisions: Record<string, boolean>) => Promise<void> | void;
}

export default function ApprovalCard({ items, onResolve }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [resolved, setResolved] = useState(false);

  if (resolved || items.length === 0) return null;

  const submit = async (approveAll: boolean) => {
    setSubmitting(true);
    const decisions: Record<string, boolean> = {};
    for (const item of items) decisions[item.callId] = approveAll;
    await onResolve(decisions);
    setSubmitting(false);
    setResolved(true);
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-200">
        <div className="w-5 h-5 rounded-md flex items-center justify-center bg-amber-200/60 text-amber-700">
          <ShieldAlert size={11} />
        </div>
        <span className="text-[11px] font-bold text-amber-800">
          그래프 변경 승인 필요 · {items.length}건
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {items.map((item) => (
          <div
            key={item.callId}
            className="text-[11px] text-text-secondary bg-white border border-border rounded-lg px-2 py-1.5"
          >
            {item.preview}
          </div>
        ))}
      </div>
      <div className="px-3 pb-2 flex gap-1.5">
        <button
          onClick={() => submit(false)}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold bg-white border border-border text-text-secondary hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
        >
          <X size={11} />
          모두 거부
        </button>
        <button
          onClick={() => submit(true)}
          disabled={submitting}
          className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-[10px] font-bold bg-amber-500 text-white hover:bg-amber-600 cursor-pointer transition-colors disabled:opacity-50"
        >
          <Check size={11} />
          모두 승인
        </button>
      </div>
    </div>
  );
}
