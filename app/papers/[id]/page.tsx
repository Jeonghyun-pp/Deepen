"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Quote,
  ExternalLink,
  FileText,
  BookOpen,
  Lightbulb,
  Settings,
  GitBranch,
  Building2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import type { Paper } from "@/paper_test/lib/types";
import {
  getPaperContent,
  getPaperLayers,
  type PaperContent,
  type LayerContent,
} from "@/app/mock/papers";

const layerIcons: Record<string, React.ReactNode> = {
  "book-open": <BookOpen size={18} />,
  lightbulb: <Lightbulb size={18} />,
  settings: <Settings size={18} />,
  "git-branch": <GitBranch size={18} />,
  "building-2": <Building2 size={18} />,
  "help-circle": <HelpCircle size={18} />,
};

const layerColors: Record<string, { bg: string; border: string; text: string }> = {
  "prior-work": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  "key-concepts": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  pipeline: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  "follow-ups": { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  "industry-use": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  "open-questions": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700" },
};

function formatCitations(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

function ContentSection({ content }: { content: PaperContent }) {
  const sections = [
    { label: "핵심 기여", value: content.coreContribution, emoji: "🎯" },
    { label: "방법론", value: content.methodology, emoji: "🔬" },
    { label: "주요 결과", value: content.keyResults, emoji: "📊" },
    { label: "의의", value: content.significance, emoji: "🌟" },
    { label: "한계점", value: content.limitations, emoji: "⚠️" },
  ];

  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-text-primary mb-4">AI 논문 분석</h2>

      <div className="p-5 rounded-xl bg-coral-light/40 border border-coral/20 mb-6">
        <p className="text-sm font-semibold text-coral mb-2">쉬운 설명</p>
        <p className="text-sm text-text-secondary leading-relaxed">
          {content.plainLanguageSummary}
        </p>
      </div>

      <div className="grid gap-4">
        {sections.map((s) => (
          <div key={s.label} className="p-4 rounded-xl bg-white border border-border">
            <p className="text-sm font-bold text-text-primary mb-2">
              {s.emoji} {s.label}
            </p>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function LayerCard({ layer, index }: { layer: LayerContent; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const colors = layerColors[layer.type] || layerColors["key-concepts"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-xl border ${colors.border} overflow-hidden`}
    >
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 p-4 ${colors.bg} cursor-pointer`}
      >
        <span className={colors.text}>{layerIcons[layer.icon] || <BookOpen size={18} />}</span>
        <span className={`font-bold text-sm ${colors.text}`}>{layer.title}</span>
        <span className="ml-auto text-text-muted">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {layer.content}
              </p>

              {layer.relatedPapers.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-text-muted mb-2">관련 논문</p>
                  <div className="flex flex-col gap-2">
                    {layer.relatedPapers.map((rp) => (
                      <Link
                        key={rp.id}
                        href={`/papers/${rp.id}`}
                        className="flex items-center gap-2 text-sm text-coral hover:underline"
                      >
                        <FileText size={14} />
                        <span className="font-semibold">{rp.title}</span>
                        <span className="text-text-muted text-xs">— {rp.reason}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for AI analysis (available for some papers)
  const content = getPaperContent(id);
  const layers = getPaperLayers(id);

  useEffect(() => {
    async function fetchPaper() {
      try {
        const res = await fetch(`/api/papers/${id}`);
        if (!res.ok) {
          setError(res.status === 404 ? "논문을 찾을 수 없습니다." : "오류가 발생했습니다.");
          return;
        }
        const data: Paper = await res.json();
        setPaper(data);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }
    fetchPaper();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-coral" />
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-text-muted text-lg">{error ?? "논문을 찾을 수 없습니다."}</p>
        <Link href="/search" className="text-coral hover:underline font-semibold">
          검색으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link
            href="/search"
            className="flex items-center gap-2 text-text-muted hover:text-coral transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-semibold">검색</span>
          </Link>
          <span className="text-border">|</span>
          <Link href="/" className="text-xl font-extrabold text-coral">
            Deepen
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Fields */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {paper.fields.map((field) => (
            <span
              key={field}
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-coral-light text-coral"
            >
              {field}
            </span>
          ))}
          {paper.openAccess && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              Open Access
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary leading-snug mb-4">
          {paper.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-secondary mb-2">
          {paper.year && <span className="font-semibold">{paper.year}</span>}
          <span className="flex items-center gap-1">
            <Quote size={14} />
            {formatCitations(paper.citationCount)} citations
          </span>
        </div>

        {/* Authors */}
        {paper.authors.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {paper.authors.map((author, i) => (
              <span
                key={i}
                className="text-sm px-3 py-1 rounded-full bg-coral-light text-text-secondary"
              >
                {author.name}
                {author.institution && (
                  <span className="text-text-muted"> · {author.institution}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="flex gap-3 mb-8">
          {paper.doi && (
            <a
              href={paper.doi}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg border border-border hover:border-coral hover:text-coral transition-colors"
            >
              <ExternalLink size={14} />
              DOI 원문
            </a>
          )}
          {paper.pdfUrl && (
            <a
              href={paper.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-coral text-white hover:bg-coral-dark transition-colors"
            >
              <FileText size={14} />
              PDF 보기
            </a>
          )}
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-text-primary mb-3">초록 (Abstract)</h2>
            <div className="p-5 rounded-xl bg-gray-50 border border-border">
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                {paper.abstract}
              </p>
            </div>
          </section>
        )}

        {/* AI Analysis (from mock, if available) */}
        {content && <ContentSection content={content} />}

        {/* Layer Analysis (from mock, if available) */}
        {layers && layers.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-text-primary mb-4">레이어 분석</h2>
            <div className="flex flex-col gap-3">
              {layers.map((layer, i) => (
                <LayerCard key={layer.type} layer={layer} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* Placeholder if no AI analysis */}
        {!content && !layers?.length && (
          <section className="p-6 rounded-xl border-2 border-dashed border-border text-center text-text-muted">
            <p className="text-lg font-semibold mb-2">AI 분석 (준비 중)</p>
            <p className="text-sm">
              이 논문의 핵심 기여, 방법론, 결과를 AI가 풀어서 설명해주는 기능이 곧 추가됩니다.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
