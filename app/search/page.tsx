"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Sparkles, MapPin, FileText, ArrowRight } from "lucide-react";
import { NODE_COLORS, TYPE_LABELS } from "../graph/_data/colors";
import type { GraphNode, NodeType } from "../graph/_data/types";
import { useInitialGraph } from "../graph/_hooks/useInitialGraph";

interface RoadmapPreset {
  id: string;
  title: string;
  prompt: string;
  hint: string;
}

const ROADMAP_PRESETS: RoadmapPreset[] = [
  {
    id: "rm-transformer",
    title: "Transformer 입문",
    prompt: "Seq2Seq부터 Transformer까지 학습 경로를 만들어줘",
    hint: "Seq2Seq → Self-Attention → Multi-Head → Transformer",
  },
  {
    id: "rm-llm",
    title: "LLM 핵심 이해",
    prompt: "Transformer에서 GPT-3까지 발전 경로",
    hint: "Transformer → BERT → GPT → CoT prompting",
  },
  {
    id: "rm-vision",
    title: "비전 모델 진화",
    prompt: "ResNet에서 ViT까지 발전 경로 만들어줘",
    hint: "ResNet → Self-Attention → Patch → ViT → CLIP",
  },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data } = useInitialGraph();

  const matches = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [] as GraphNode[];
    return data.nodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          (n.tldr ?? "").toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [query, data.nodes]);

  const recommendedPapers = useMemo(() => {
    return [...data.nodes]
      .filter((n) => n.type === "paper")
      .sort((a, b) => (b.meta?.citations ?? 0) - (a.meta?.citations ?? 0))
      .slice(0, 6);
  }, [data.nodes]);

  const recommendedConcepts = useMemo(() => {
    const introCount = new Map<string, number>();
    for (const e of data.edges) {
      introCount.set(e.target, (introCount.get(e.target) ?? 0) + 1);
    }
    return [...data.nodes]
      .filter((n) => n.type === "concept" || n.type === "technique")
      .sort((a, b) => (introCount.get(b.id) ?? 0) - (introCount.get(a.id) ?? 0))
      .slice(0, 8);
  }, [data.nodes, data.edges]);

  const goToGraph = (nodeId: string) => {
    router.push(`/graph?focus=${encodeURIComponent(nodeId)}`);
  };

  const goToGraphWithRoadmap = (preset: RoadmapPreset) => {
    router.push(`/graph?roadmap=${encodeURIComponent(preset.prompt)}`);
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <header className="max-w-5xl mx-auto px-3 md:px-6 pt-3 md:pt-6">
        <div className="rounded-2xl shadow-sm bg-white px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-lg font-extrabold text-coral">
            Deepen
          </Link>
          <Link
            href="/graph"
            className="text-xs text-text-muted hover:text-coral transition-colors font-semibold"
          >
            그래프 바로가기 →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 md:px-6 py-6 md:py-10">
        {/* Search hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-extrabold text-text-primary mb-2">
            무엇을 탐색하시겠어요?
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            논문·개념·학습 경로 중 하나를 선택해 그래프로 진입하세요.
          </p>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
            />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) goToGraph(matches[0].id);
              }}
              placeholder="논문, 개념, 응용 분야를 검색하세요..."
              className="w-full h-12 pl-11 pr-4 rounded-2xl border border-border bg-white shadow-sm text-sm outline-none focus:border-coral transition-colors placeholder:text-text-muted"
            />
            {matches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-border bg-white shadow-lg z-10 overflow-hidden">
                {matches.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => goToGraph(node.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-coral-light/30 transition-colors text-left cursor-pointer"
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: NODE_COLORS[node.type] }}
                    />
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {node.label}
                    </span>
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: NODE_COLORS[node.type] + "18",
                        color: NODE_COLORS[node.type],
                      }}
                    >
                      {TYPE_LABELS[node.type as NodeType]}
                    </span>
                    <ArrowRight
                      size={12}
                      className="text-text-muted ml-auto flex-shrink-0"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3-column recommendations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Papers */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-violet-100 text-violet-600 flex items-center justify-center">
                <FileText size={12} />
              </div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                주요 논문
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {recommendedPapers.map((node) => (
                <button
                  key={node.id}
                  onClick={() => goToGraph(node.id)}
                  className="text-left rounded-xl border border-border bg-white hover:border-coral/40 hover:shadow-sm transition-all px-3 py-2.5 cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-text-muted font-semibold">
                      {node.meta?.year}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {(node.meta?.citations ?? 0).toLocaleString()} cited
                    </span>
                  </div>
                  <div className="text-sm font-bold text-text-primary leading-snug">
                    {node.label}
                  </div>
                  {node.tldr && (
                    <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">
                      {node.tldr}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Concepts */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sparkles size={12} />
              </div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                핵심 개념
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recommendedConcepts.map((node) => (
                <button
                  key={node.id}
                  onClick={() => goToGraph(node.id)}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-border hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-pointer"
                  title={node.tldr ?? node.content}
                >
                  {node.label}
                </button>
              ))}
            </div>
          </section>

          {/* Roadmaps */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center">
                <MapPin size={12} />
              </div>
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                추천 로드맵
              </h2>
            </div>
            <div className="flex flex-col gap-2">
              {ROADMAP_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => goToGraphWithRoadmap(preset)}
                  className="text-left rounded-xl border border-border bg-white hover:border-sky-400 hover:shadow-sm transition-all px-3 py-2.5 cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-text-primary">
                      {preset.title}
                    </span>
                    <ArrowRight
                      size={12}
                      className="text-text-muted group-hover:text-sky-600 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2">
                    {preset.hint}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
