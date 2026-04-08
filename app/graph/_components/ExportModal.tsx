"use client";

import { useState, useMemo } from "react";
import { X, Copy, Download, Check } from "lucide-react";
import type { GraphData } from "../_data/types";

type ExportScope = "filtered" | "selected" | "all";

interface Props {
  data: GraphData;
  fullData: GraphData;
  selectedNodeId: string | null;
  open: boolean;
  onClose: () => void;
}

function generateMarkdown(data: GraphData): string {
  const now = new Date().toISOString().split("T")[0];
  const concepts = data.nodes.filter((n) => n.type === "concept");
  const papers = data.nodes.filter((n) => n.type === "paper");
  const memos = data.nodes.filter((n) => n.type === "memo");

  let md = `# 지식 스냅샷\n*${now} 생성*\n\n`;

  if (concepts.length > 0) {
    md += `## 핵심 개념 (${concepts.length})\n`;
    for (const c of concepts) {
      md += `- **${c.label}**: ${c.content}\n`;
    }
    md += "\n";
  }

  if (papers.length > 0) {
    md += `## 논문 (${papers.length})\n`;
    for (const p of papers) {
      md += `### ${p.label}\n`;
      if (p.meta?.authors) md += `- 저자: ${p.meta.authors}\n`;
      if (p.meta?.year) md += `- 연도: ${p.meta.year}\n`;
      if (p.meta?.citations) md += `- 인용: ${p.meta.citations.toLocaleString()}\n`;
      const related = data.edges
        .filter((e) => e.source === p.id || e.target === p.id)
        .map((e) => {
          const otherId = e.source === p.id ? e.target : e.source;
          const other = data.nodes.find((n) => n.id === otherId);
          return other ? `${other.label}${e.label ? ` (${e.label})` : ""}` : null;
        })
        .filter(Boolean);
      if (related.length > 0) {
        md += `- 관련: ${related.join(", ")}\n`;
      }
      md += "\n";
    }
  }

  if (memos.length > 0) {
    md += `## 내 메모 (${memos.length})\n`;
    for (const m of memos) {
      md += `- **${m.label}**: ${m.content}\n`;
    }
    md += "\n";
  }

  const labeledEdges = data.edges.filter((e) => e.label);
  if (labeledEdges.length > 0) {
    md += `## 개념 관계도\n`;
    for (const e of labeledEdges) {
      const src = data.nodes.find((n) => n.id === e.source);
      const tgt = data.nodes.find((n) => n.id === e.target);
      if (src && tgt) {
        md += `- ${src.label} → ${tgt.label} (${e.label})\n`;
      }
    }
  }

  return md;
}

export default function ExportModal({ data, fullData, selectedNodeId, open, onClose }: Props) {
  const [scope, setScope] = useState<ExportScope>("filtered");
  const [copied, setCopied] = useState(false);

  const exportData = useMemo(() => {
    if (scope === "all") return fullData;
    if (scope === "selected" && selectedNodeId) {
      const connectedIds = new Set<string>([selectedNodeId]);
      for (const e of fullData.edges) {
        if (e.source === selectedNodeId) connectedIds.add(e.target);
        if (e.target === selectedNodeId) connectedIds.add(e.source);
      }
      const nodes = fullData.nodes.filter((n) => connectedIds.has(n.id));
      const nodeIds = new Set(nodes.map((n) => n.id));
      const edges = fullData.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
      return { nodes, edges, roadmaps: fullData.roadmaps ?? [] };
    }
    return data;
  }, [scope, data, fullData, selectedNodeId]);

  const markdown = useMemo(() => generateMarkdown(exportData), [exportData]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-snapshot-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-[560px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-bold text-text-primary">지식 스냅샷 내보내기</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Scope */}
        <div className="px-6 py-4 border-b border-border">
          <p className="text-xs font-semibold text-text-secondary mb-2">범위</p>
          <div className="flex flex-col gap-1.5">
            {[
              { key: "filtered" as const, label: "현재 필터 기준" },
              { key: "selected" as const, label: "선택한 노드 + 연결", disabled: !selectedNodeId },
              { key: "all" as const, label: "전체 그래프" },
            ].map(({ key, label, disabled }) => (
              <label key={key} className={`flex items-center gap-2 text-xs ${disabled ? "opacity-40" : ""}`}>
                <input
                  type="radio"
                  name="scope"
                  checked={scope === key}
                  onChange={() => setScope(key)}
                  disabled={disabled}
                  className="accent-coral"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs font-semibold text-text-secondary mb-2">미리보기</p>
          <pre className="text-[11px] text-text-secondary bg-gray-50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-border max-h-[300px] overflow-y-auto">
            {markdown}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:border-coral hover:text-coral transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "복사됨!" : "클립보드 복사"}
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-coral text-white text-sm font-bold hover:bg-coral-dark transition-colors"
          >
            <Download size={14} />
            MD 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}
