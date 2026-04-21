"use client";

import { useState } from "react";
import {
  Wrench,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  MapPin,
  Sparkles,
  Search as SearchIcon,
  GitBranch,
  Plus,
} from "lucide-react";
import type { ChatMessageToolEntry } from "../../_hooks/useAgent";

const TOOL_META: Record<
  string,
  { label: string; icon: typeof Wrench; color: string }
> = {
  query_graph: { label: "그래프 조회", icon: Wrench, color: "#64748b" },
  find_path: { label: "경로 찾기", icon: MapPin, color: "#0ea5e9" },
  extract_concepts: {
    label: "개념 추출",
    icon: Sparkles,
    color: "#8b5cf6",
  },
  search_papers_openalex: {
    label: "OpenAlex 검색",
    icon: SearchIcon,
    color: "#f43f5e",
  },
  add_node: { label: "노드 추가", icon: Plus, color: "#10b981" },
  add_edge: { label: "엣지 추가", icon: GitBranch, color: "#10b981" },
};

interface Props {
  entry: ChatMessageToolEntry;
  onActivateRoadmap?: (pathNodeIds: string[]) => void;
  onNavigateToNode?: (nodeId: string) => void;
}

export default function ToolCallCard({
  entry,
  onActivateRoadmap,
  onNavigateToNode,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[entry.call.name] ?? {
    label: entry.call.name,
    icon: Wrench,
    color: "#64748b",
  };
  const Icon = meta.icon;

  const isFindPath =
    entry.call.name === "find_path" &&
    entry.result?.ok &&
    Array.isArray(
      (entry.result.data as { pathNodeIds?: string[] })?.pathNodeIds,
    );
  const pathNodeIds = isFindPath
    ? ((entry.result?.data as { pathNodeIds: string[] }).pathNodeIds ?? [])
    : [];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden text-[11px]">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 transition-colors cursor-pointer"
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: meta.color + "22", color: meta.color }}
        >
          <Icon size={11} />
        </div>
        <span className="font-semibold text-white">{meta.label}</span>
        <span className="text-white/50 truncate flex-1 text-left">
          {entry.result?.summary ?? "실행 중..."}
        </span>
        {entry.status === "running" && (
          <Loader2 size={11} className="animate-spin text-[color:var(--v2-green-soft)] flex-shrink-0" />
        )}
        {entry.status === "done" && (
          <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
        )}
        {entry.status === "error" && (
          <AlertCircle size={11} className="text-red-400 flex-shrink-0" />
        )}
        {expanded ? (
          <ChevronDown size={11} className="text-white/50" />
        ) : (
          <ChevronRight size={11} className="text-white/50" />
        )}
      </button>

      {expanded && (
        <div className="px-2.5 py-2 border-t border-white/10 bg-white/5 space-y-1.5">
          {/* args */}
          {Object.keys(entry.call.args).length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-white/50 uppercase mb-0.5">
                Args
              </div>
              <code className="block text-[10px] text-white/75 bg-[color:var(--v2-ink)]/80 rounded px-1.5 py-1 border border-white/10 break-all">
                {JSON.stringify(entry.call.args)}
              </code>
            </div>
          )}

          {/* result data preview */}
          {entry.result?.error && (
            <div className="text-[10px] text-red-400">
              {entry.result.error}
            </div>
          )}

          {/* find_path → "overlay로 보기" 액션 */}
          {isFindPath && pathNodeIds.length > 0 && (
            <button
              onClick={() => onActivateRoadmap?.(pathNodeIds)}
              className="w-full mt-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-[color:var(--v2-green)] text-black text-[10px] font-bold hover:bg-[color:var(--v2-green-soft)] transition-colors cursor-pointer"
            >
              <MapPin size={11} />
              그래프에 경로 표시
            </button>
          )}

          {/* query_graph / extract_concepts → 노드 클릭 */}
          {(entry.call.name === "query_graph" ||
            entry.call.name === "extract_concepts") &&
            entry.result?.ok && (() => {
              const data = entry.result.data as
                | { nodes?: { id: string; label: string }[]; introduces?: { node: { id: string; label: string } }[]; uses?: { node: { id: string; label: string } }[] }
                | undefined;
              const nodes = [
                ...(data?.nodes ?? []),
                ...((data?.introduces ?? []).map((i) => i.node)),
                ...((data?.uses ?? []).map((i) => i.node)),
              ];
              if (nodes.length === 0) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-1">
                  {nodes.slice(0, 12).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => onNavigateToNode?.(n.id)}
                      className="text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-white/75 hover:border-[color:var(--v2-green-soft)]/40 hover:text-[color:var(--v2-green-soft)] transition-colors cursor-pointer"
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
}
