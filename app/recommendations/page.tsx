"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, ChevronRight } from "lucide-react";

// ── 9개 sample paper → S2 paper ID 매핑 ──
// S2는 ArXiv ID로 직접 조회 가능: GET /paper/ArXiv:{id}
const PAPERS: {
  id: string;
  label: string;
  authors: string;
  year: number;
  tldr: string;
  s2Id: string;
}[] = [
  {
    id: "p1",
    label: "Attention Is All You Need",
    authors: "Vaswani et al.",
    year: 2017,
    tldr: "Self-Attention만으로 구성한 Transformer 아키텍처.",
    s2Id: "204e3073870fae3d05bcbc2f6a8e263d9b72e776",
  },
  {
    id: "p2",
    label: "BERT",
    authors: "Devlin et al.",
    year: 2018,
    tldr: "양방향 사전학습 Transformer 인코더.",
    s2Id: "ArXiv:1810.04805", // resolveS2Id에서 ArXiv prefix 처리
  },
  {
    id: "p3",
    label: "GPT-3",
    authors: "Brown et al.",
    year: 2020,
    tldr: "175B 파라미터 few-shot LLM.",
    s2Id: "ArXiv:2005.14165",
  },
  {
    id: "p4",
    label: "Vision Transformer (ViT)",
    authors: "Dosovitskiy et al.",
    year: 2020,
    tldr: "이미지를 패치 시퀀스로 Transformer에 적용.",
    s2Id: "ArXiv:2010.11929",
  },
  {
    id: "p5",
    label: "ResNet",
    authors: "He et al.",
    year: 2015,
    tldr: "Skip connection으로 152층 딥러닝 학습 가능.",
    s2Id: "ArXiv:1512.03385",
  },
  {
    id: "p6",
    label: "DDPM",
    authors: "Ho et al.",
    year: 2020,
    tldr: "Diffusion 기반 고품질 이미지 생성.",
    s2Id: "ArXiv:2006.11239",
  },
  {
    id: "p7",
    label: "CLIP",
    authors: "Radford et al.",
    year: 2021,
    tldr: "텍스트-이미지 contrastive 학습으로 zero-shot 분류.",
    s2Id: "ArXiv:2103.00020",
  },
  {
    id: "p8",
    label: "Seq2Seq",
    authors: "Sutskever et al.",
    year: 2014,
    tldr: "LSTM 인코더-디코더 seq2seq 패러다임.",
    s2Id: "ArXiv:1409.3215",
  },
  {
    id: "p9",
    label: "Chain-of-Thought Prompting",
    authors: "Wei et al.",
    year: 2022,
    tldr: "중간 추론 단계 유도로 reasoning 성능 향상.",
    s2Id: "ArXiv:2201.11903",
  },
];

const LAYERS = [
  { key: "prior_work", label: "Prior Work", desc: "이 논문이 기반한 선행 연구", color: "#7F77DD" },
  { key: "key_concepts", label: "Key Concepts", desc: "유사 개념을 다루는 논문", color: "#1D9E75" },
  { key: "pipeline", label: "Pipeline", desc: "동일 방법론 사용 논문", color: "#378ADD" },
  { key: "follow_ups", label: "Follow-ups", desc: "이 논문의 후속 연구", color: "#E24B4A" },
  { key: "industry_use", label: "Industry Use", desc: "산업/기업 적용 사례", color: "#EF9F27" },
  { key: "open_questions", label: "Open Questions", desc: "최근 미해결 연구", color: "#888780" },
] as const;

type LayerKey = (typeof LAYERS)[number]["key"];

interface RecResult {
  paperId: string;
  title: string;
  year: number | null;
  citationCount: number;
  score: number;
  reason: string;
}

// ArXiv prefix가 있으면 S2 API로 직접 resolve
async function resolveS2Id(rawId: string): Promise<string> {
  if (!rawId.startsWith("ArXiv:")) return rawId;
  const arxivId = rawId.replace("ArXiv:", "");
  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/ArXiv:${arxivId}?fields=paperId`,
  );
  if (!res.ok) throw new Error(`S2 resolve failed: ${res.status}`);
  const data = (await res.json()) as { paperId?: string };
  if (!data.paperId) throw new Error("paperId not found");
  return data.paperId;
}

async function fetchRecommendations(
  s2Id: string,
  layer: LayerKey,
): Promise<RecResult[]> {
  // 우리 API는 ?s2_id= 를 직접 받으면 OpenAlex 조회를 건너뜀
  const res = await fetch(
    `/api/papers/prototype/recommendations?layer=${layer}&n=5&s2_id=${s2Id}`,
  );
  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { results: RecResult[] };
  return data.results;
}

export default function RecommendationsPage() {
  const [selectedPaper, setSelectedPaper] = useState<(typeof PAPERS)[0] | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>("prior_work");
  const [results, setResults] = useState<RecResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // s2Id 캐시 (ArXiv → 실제 paperId)
  const [s2Cache, setS2Cache] = useState<Record<string, string>>({});

  async function handlePaperClick(paper: (typeof PAPERS)[0]) {
    setSelectedPaper(paper);
    setResults(null);
    setError(null);
    await loadLayer(paper, selectedLayer, s2Cache);
  }

  async function handleLayerClick(layer: LayerKey) {
    setSelectedLayer(layer);
    if (!selectedPaper) return;
    await loadLayer(selectedPaper, layer, s2Cache);
  }

  async function loadLayer(
    paper: (typeof PAPERS)[0],
    layer: LayerKey,
    cache: Record<string, string>,
  ) {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      // S2 ID resolve (캐시 활용)
      let s2Id = cache[paper.id] ?? paper.s2Id;
      if (s2Id.startsWith("ArXiv:")) {
        s2Id = await resolveS2Id(s2Id);
        const newCache = { ...cache, [paper.id]: s2Id };
        setS2Cache(newCache);
      }
      const data = await fetchRecommendations(s2Id, layer);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const currentLayer = LAYERS.find((l) => l.key === selectedLayer)!;

  return (
    <div className="min-h-screen bg-[#f7f7f9] text-[#1a1a2e]">
      {/* Header */}
      <div className="bg-white border-b border-[#e5e5ea] px-6 py-4 flex items-center gap-4">
        <Link
          href="/graph"
          className="flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#1a1a2e] transition-colors"
        >
          <ArrowLeft size={15} />
          그래프로 돌아가기
        </Link>
        <div className="w-px h-4 bg-[#e5e5ea]" />
        <h1 className="text-base font-bold text-[#1a1a2e]">추천 프로토타입</h1>
        <span className="text-xs text-[#6b7280] bg-[#f0f0f5] px-2 py-0.5 rounded-full">
          Semantic Scholar 실제 데이터
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-6">
        {/* Left — paper list */}
        <div className="w-72 shrink-0">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            논문 선택
          </p>
          <div className="flex flex-col gap-2">
            {PAPERS.map((paper) => {
              const isSelected = selectedPaper?.id === paper.id;
              return (
                <button
                  key={paper.id}
                  onClick={() => handlePaperClick(paper)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#7F77DD] border-[#7F77DD] text-white"
                      : "bg-white border-[#e5e5ea] hover:border-[#7F77DD]/40 text-[#1a1a2e]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? "text-white" : ""}`}>
                        {paper.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? "text-white/70" : "text-[#6b7280]"}`}>
                        {paper.authors} · {paper.year}
                      </p>
                    </div>
                    <ChevronRight size={14} className={isSelected ? "text-white/70" : "text-[#c0c0c8]"} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right — results */}
        <div className="flex-1 min-w-0">
          {!selectedPaper ? (
            <div className="flex flex-col items-center justify-center h-80 text-[#6b7280]">
              <p className="text-sm">왼쪽에서 논문을 선택하세요</p>
            </div>
          ) : (
            <>
              {/* Selected paper info */}
              <div className="bg-white border border-[#e5e5ea] rounded-2xl px-5 py-4 mb-4">
                <p className="text-lg font-bold text-[#1a1a2e]">{selectedPaper.label}</p>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  {selectedPaper.authors} · {selectedPaper.year}
                </p>
                <p className="text-sm text-[#444] mt-2">{selectedPaper.tldr}</p>
              </div>

              {/* Layer tabs */}
              <div className="flex gap-2 flex-wrap mb-4">
                {LAYERS.map((layer) => (
                  <button
                    key={layer.key}
                    onClick={() => handleLayerClick(layer.key)}
                    disabled={loading}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer disabled:opacity-50 ${
                      selectedLayer === layer.key
                        ? "text-white border-transparent"
                        : "bg-white text-[#6b7280] border-[#e5e5ea] hover:border-[#7F77DD]/40"
                    }`}
                    style={
                      selectedLayer === layer.key
                        ? { backgroundColor: layer.color, borderColor: layer.color }
                        : {}
                    }
                  >
                    {layer.label}
                  </button>
                ))}
              </div>

              {/* Layer description */}
              <p className="text-xs text-[#6b7280] mb-4">
                <span className="font-semibold" style={{ color: currentLayer.color }}>
                  {currentLayer.label}
                </span>{" "}
                — {currentLayer.desc}
              </p>

              {/* Results */}
              <div className="flex flex-col gap-3">
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-[#6b7280] py-8 justify-center">
                    <Loader2 size={16} className="animate-spin" />
                    Semantic Scholar에서 데이터 불러오는 중...
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold">오류 발생</p>
                      <p className="text-xs mt-0.5">{error}</p>
                      <p className="text-xs mt-1 text-red-400">
                        S2 rate limit일 수 있습니다. 잠시 후 다시 시도해주세요.
                      </p>
                    </div>
                  </div>
                )}

                {results && results.length === 0 && (
                  <div className="text-sm text-[#6b7280] py-8 text-center">
                    이 레이어에서 추천 결과가 없습니다.
                  </div>
                )}

                {results?.map((result, i) => (
                  <div
                    key={result.paperId}
                    className="bg-white border border-[#e5e5ea] rounded-xl px-5 py-4 flex gap-4"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: currentLayer.color }}
                    >
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#1a1a2e] leading-snug">
                        {result.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {result.year && (
                          <span className="text-xs text-[#6b7280]">{result.year}</span>
                        )}
                        <span className="text-xs text-[#6b7280]">
                          인용 {result.citationCount.toLocaleString()}
                        </span>
                        <span className="text-xs text-[#6b7280]">
                          score {result.score.toFixed(3)}
                        </span>
                      </div>
                      <p className="text-xs text-[#7F77DD] mt-1.5 font-medium">
                        {result.reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
