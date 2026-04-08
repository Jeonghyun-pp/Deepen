"use client";

import { useState, useEffect } from "react";
import { getMockAnalysis, type PaperAnalysisData } from "@/lib/mock/analysis";
import SixLayerTabs from "@/app/papers/[id]/_components/SixLayerTabs";
import CitationCarousel from "@/app/papers/[id]/_components/CitationCarousel";
import Disclaimer from "@/app/components/Disclaimer";
import AnalysisLoading from "@/app/components/AnalysisLoading";
import type { GraphNode } from "../_data/types";

interface Props {
  paperId: string;
  node?: GraphNode | null;
}

export default function PaperDetailView({ paperId, node }: Props) {
  const [analysisData, setAnalysisData] = useState<PaperAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) {
        setAnalysisData(getMockAnalysis(paperId));
        setLoading(false);
      }
    }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [paperId]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header from graph node data */}
        {node && (
          <>
            <h1 className="text-xl font-extrabold text-text-primary leading-snug mb-2">
              {node.label}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary mb-4">
              {node.meta?.authors && <span>{node.meta.authors}</span>}
              {node.meta?.year && <span className="font-semibold">{node.meta.year}</span>}
              {node.meta?.citations != null && (
                <span>{node.meta.citations.toLocaleString()} citations</span>
              )}
            </div>

            {/* Content / Abstract */}
            <div className="p-4 rounded-xl bg-gray-50 border border-border mb-6">
              <p className="text-sm text-text-secondary leading-relaxed">
                {node.content}
              </p>
            </div>
          </>
        )}

        {/* TLDR */}
        {analysisData && (
          <div className="p-4 rounded-xl bg-coral-light/30 border border-coral/20 mb-6">
            <h3 className="text-xs font-bold text-coral mb-1">TLDR</h3>
            <p className="text-sm text-text-secondary leading-relaxed italic">
              &ldquo;{analysisData.tldr}&rdquo;
            </p>
          </div>
        )}

        {/* 6-Layer Analysis */}
        <section className="mb-8">
          <h2 className="text-base font-bold text-text-primary mb-4">6레이어 분석</h2>
          {loading ? (
            <AnalysisLoading />
          ) : analysisData ? (
            <>
              <SixLayerTabs analysis={analysisData.analysis} />
              <div className="mt-4">
                <Disclaimer />
              </div>
            </>
          ) : null}
        </section>

        {/* Citations */}
        {analysisData && (
          <section className="mb-8">
            <h2 className="text-base font-bold text-text-primary mb-4">인용 관계</h2>
            <div className="flex flex-col gap-6">
              <CitationCarousel
                title="선행연구 (이 논문이 인용)"
                papers={analysisData.references}
              />
              <CitationCarousel
                title="후속연구 (이 논문을 인용)"
                papers={analysisData.citedBy}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
