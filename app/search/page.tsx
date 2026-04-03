"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowRight,
  BookOpen,
  Quote,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Lock,
  Unlock,
  SortAsc,
} from "lucide-react";
import Link from "next/link";
import Deepy, { landingConfig } from "@/app/components/Deepy";
import type { Emotion } from "@/app/components/Deepy";
import type { Paper, PaperSearchResult } from "@/paper_test/lib/types";

// --- helpers ---

function formatCitations(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return n.toString();
}

function fieldColor(field: string) {
  const hash = [...field].reduce((h, c) => c.charCodeAt(0) + ((h << 5) - h), 0);
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700",
    "bg-orange-100 text-orange-700",
    "bg-pink-100 text-pink-700",
    "bg-cyan-100 text-cyan-700",
    "bg-amber-100 text-amber-700",
    "bg-indigo-100 text-indigo-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
  ];
  return colors[Math.abs(hash) % colors.length];
}

// --- sort options ---

const SORT_OPTIONS = [
  { value: "relevance_score:desc", label: "관련도순" },
  { value: "cited_by_count:desc", label: "인용순" },
  { value: "publication_year:desc", label: "최신순" },
  { value: "publication_year:asc", label: "오래된순" },
];

// --- components ---

function PaperCard({ paper, index }: { paper: Paper; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Link href={`/papers/${paper.id}`} className="block group">
        <div className="bg-white border border-border rounded-2xl p-6 hover:border-coral hover:shadow-lg transition-all duration-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Fields as tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {paper.fields.map((field) => (
                  <span
                    key={field}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${fieldColor(field)}`}
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
              <h3 className="text-lg font-bold text-text-primary group-hover:text-coral transition-colors leading-snug">
                {paper.title}
              </h3>

              {/* Authors + Year */}
              <p className="mt-2 text-sm text-text-muted flex items-center gap-2">
                <Users size={14} />
                <span className="truncate">
                  {paper.authors
                    .slice(0, 3)
                    .map((a) => a.name)
                    .join(", ")}
                  {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
                </span>
                {paper.year && (
                  <>
                    <span className="text-border">|</span>
                    <span>{paper.year}</span>
                  </>
                )}
              </p>

              {/* Abstract */}
              {paper.abstract && (
                <p className="mt-3 text-sm text-text-secondary line-clamp-2 leading-relaxed">
                  {paper.abstract}
                </p>
              )}
            </div>

            {/* Right side: citations + arrow */}
            <div className="flex flex-col items-end gap-3 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-text-muted">
                <Quote size={14} />
                <span className="text-sm font-semibold">
                  {formatCitations(paper.citationCount)}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-coral-light flex items-center justify-center group-hover:bg-coral group-hover:text-white transition-all">
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dot-${i}`} className="px-2 text-text-muted">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              p === page
                ? "bg-coral text-white"
                : "hover:bg-gray-100 text-text-secondary"
            }`}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// --- main page ---

const PER_PAGE = 15;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("relevance_score:desc");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [openAccessOnly, setOpenAccessOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<PaperSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPapers = useCallback(
    async (q: string, p: number) => {
      if (!q.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: q.trim(),
          page: String(p),
          per_page: String(PER_PAGE),
          sort,
        });
        if (yearFrom) params.set("year_from", yearFrom);
        if (yearTo) params.set("year_to", yearTo);
        if (openAccessOnly) params.set("open_access", "true");

        const res = await fetch(`/api/papers/search?${params}`);
        if (!res.ok) throw new Error("검색 중 오류가 발생했습니다.");
        const data: PaperSearchResult = await res.json();
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알 수 없는 오류");
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [sort, yearFrom, yearTo, openAccessOnly]
  );

  // Search on submit
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setPage(1);
    setSubmittedQuery(query.trim());
  };

  // Fetch when submittedQuery, page, sort, or filters change
  useEffect(() => {
    if (submittedQuery) {
      fetchPapers(submittedQuery, page);
    }
  }, [page, sort, yearFrom, yearTo, openAccessOnly, submittedQuery, fetchPapers]);

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const totalPages = results ? Math.ceil(results.totalCount / PER_PAGE) : 0;
  const cappedTotalPages = Math.min(totalPages, Math.ceil(10000 / PER_PAGE));

  const deepyEmotion: Emotion = loading
    ? "thinking"
    : submittedQuery
      ? results && results.papers.length > 0
        ? "sparkle"
        : "confused"
      : "thinking";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold text-coral">
            Deepen
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Search Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-text-primary mb-2">
              논문 탐색
            </h1>
            <p className="text-text-secondary">
              키워드를 입력하면 OpenAlex에서 논문을 검색합니다
            </p>
          </div>
          <div className="hidden md:block flex-shrink-0">
            <Deepy
              emotion={deepyEmotion}
              config={{ ...landingConfig, scale: 0.5 }}
              softShadow
            />
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: transformer, attention mechanism, diffusion model..."
            className="w-full pl-12 pr-28 py-4 rounded-2xl border-2 border-border bg-white text-text-primary placeholder:text-text-muted focus:border-coral focus:outline-none transition-colors text-lg"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2 rounded-xl bg-coral text-white font-semibold text-sm hover:bg-coral-dark disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? "검색 중..." : "검색"}
          </button>
        </form>

        {/* Filter Toggle + Sort */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Filter size={16} />
            필터 {showFilters ? "숨기기" : "보기"}
          </button>

          {submittedQuery && (
            <div className="flex items-center gap-2">
              <SortAsc size={16} className="text-text-muted" />
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white text-text-secondary focus:outline-none focus:border-coral cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-4 mb-6 p-4 rounded-xl bg-gray-50 border border-border">
                {/* Year range */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-muted font-semibold">연도</span>
                  <input
                    type="number"
                    value={yearFrom}
                    onChange={(e) => { setYearFrom(e.target.value); setPage(1); }}
                    placeholder="시작"
                    min={1900}
                    max={2026}
                    className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:border-coral"
                  />
                  <span className="text-text-muted">~</span>
                  <input
                    type="number"
                    value={yearTo}
                    onChange={(e) => { setYearTo(e.target.value); setPage(1); }}
                    placeholder="끝"
                    min={1900}
                    max={2026}
                    className="w-20 px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:border-coral"
                  />
                </div>

                {/* Open Access */}
                <button
                  onClick={() => { setOpenAccessOnly(!openAccessOnly); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    openAccessOnly
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-text-secondary hover:bg-gray-200"
                  }`}
                >
                  {openAccessOnly ? <Unlock size={14} /> : <Lock size={14} />}
                  Open Access만
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-coral" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg">{error}</p>
            <p className="text-text-muted text-sm mt-2">다시 시도해주세요</p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && results && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={16} className="text-text-muted" />
              <span className="text-sm text-text-muted">
                총 {results.totalCount.toLocaleString()}편 중{" "}
                {(page - 1) * PER_PAGE + 1}~
                {Math.min(page * PER_PAGE, results.totalCount)}번째
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {results.papers.map((paper, i) => (
                  <PaperCard key={paper.id} paper={paper} index={i} />
                ))}
              </AnimatePresence>
            </div>

            {results.papers.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <p className="text-text-muted text-lg">
                  &ldquo;{submittedQuery}&rdquo;에 대한 검색 결과가 없습니다
                </p>
                <p className="text-text-muted text-sm mt-2">
                  다른 키워드로 검색해보세요
                </p>
              </motion.div>
            )}

            <Pagination
              page={page}
              totalPages={cappedTotalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}

        {/* Initial state */}
        {!loading && !error && !results && (
          <div className="text-center py-20">
            <p className="text-text-muted text-lg">검색어를 입력해주세요</p>
          </div>
        )}
      </main>
    </div>
  );
}
