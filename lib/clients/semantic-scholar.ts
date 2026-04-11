// ── Semantic Scholar API 클라이언트 ──
// TLDR + 인용 맥락 수집, 인용 그래프 조회, 추천용 citation 데이터

/** 추천 시스템에서 사용하는 논문 단위 */
export interface RecommendedPaper {
  paperId: string;
  title: string;
  year: number | null;
  citationCount: number;
  isInfluential: boolean;
  intents: string[]; // "background" | "methodology" | "result"
  doi: string | null;
  authors: string[]; // 소속 기반 industry 필터용
}

/** S2 인용 맥락 */
export interface CitationContext {
  citingPaperTitle: string;
  citingPaperYear: number | null;
  context: string;
  intent: "background" | "methodology" | "result" | string;
}

/** S2 보강 데이터 */
export interface S2Enrichment {
  tldr: string | null;
  contexts: CitationContext[];
}

const S2_BASE = "https://api.semanticscholar.org/graph/v1";
const S2_API_KEY = process.env.S2_API_KEY || "";

function s2Headers(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "Deepen/1.0",
  };
  if (S2_API_KEY) {
    headers["x-api-key"] = S2_API_KEY;
  }
  return headers;
}

interface S2PaperResponse {
  paperId?: string;
  tldr?: { text: string } | null;
  abstract?: string | null;
}

interface S2CitationResponse {
  data?: Array<{
    contexts?: string[];
    intents?: string[];
    citingPaper?: {
      title?: string;
      year?: number | null;
    };
  }>;
  next?: number;
}

/**
 * DOI 또는 OpenAlex ID로 S2에서 TLDR + 인용맥락을 수집한다.
 * 하나가 실패해도 나머지는 사용 (graceful degradation).
 */
export async function enrichWithS2(doi: string | null, openalexId?: string): Promise<S2Enrichment> {
  // S2 paper ID 결정: DOI 우선, 없으면 검색 불가
  const paperId = doi ? `DOI:${doi.replace("https://doi.org/", "")}` : null;

  if (!paperId) {
    return { tldr: null, contexts: [] };
  }

  // 병렬 호출: TLDR + 인용맥락
  const [paperResult, citationsResult] = await Promise.allSettled([
    fetchS2Paper(paperId),
    fetchS2Citations(paperId),
  ]);

  const tldr = paperResult.status === "fulfilled" ? paperResult.value.tldr?.text ?? null : null;
  const contexts = citationsResult.status === "fulfilled" ? citationsResult.value : [];

  return { tldr, contexts };
}

async function fetchS2Paper(paperId: string): Promise<S2PaperResponse> {
  const url = `${S2_BASE}/paper/${encodeURIComponent(paperId)}?fields=tldr,abstract`;

  const res = await fetch(url, {
    headers: s2Headers(),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`S2 paper fetch failed: ${res.status}`);
  }

  return res.json() as Promise<S2PaperResponse>;
}

// ── 추천 시스템용 함수들 ──

/** 이 논문이 인용한 논문들 (backward — Prior Work, Pipeline용) */
export async function fetchS2References(
  paperId: string,
  limit = 100,
): Promise<RecommendedPaper[]> {
  const fields = [
    "intents",
    "isInfluential",
    "citedPaper.paperId",
    "citedPaper.title",
    "citedPaper.year",
    "citedPaper.citationCount",
    "citedPaper.externalIds",
    "citedPaper.authors",
  ].join(",");

  const url = `${S2_BASE}/paper/${encodeURIComponent(paperId)}/references?fields=${fields}&limit=${limit}`;

  const res = await fetch(url, {
    headers: s2Headers(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`S2 references fetch failed: ${res.status}`);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = (await res.json()) as { data?: any[] };

  return (data.data ?? [])
    .filter((r: any) => r.citedPaper?.paperId)
    .map((r: any) => ({
      paperId: r.citedPaper.paperId,
      title: r.citedPaper.title ?? "Untitled",
      year: r.citedPaper.year ?? null,
      citationCount: r.citedPaper.citationCount ?? 0,
      isInfluential: r.isInfluential ?? false,
      intents: r.intents ?? [],
      doi: r.citedPaper.externalIds?.DOI ?? null,
      authors: (r.citedPaper.authors ?? []).map((a: any) => a.name ?? ""),
    }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** 이 논문을 인용한 논문들 + isInfluential (forward — Follow-ups, Industry용) */
export async function fetchS2CitationsForRec(
  paperId: string,
  limit = 200,
): Promise<RecommendedPaper[]> {
  const fields = [
    "intents",
    "isInfluential",
    "citingPaper.paperId",
    "citingPaper.title",
    "citingPaper.year",
    "citingPaper.citationCount",
    "citingPaper.externalIds",
    "citingPaper.authors",
  ].join(",");

  const url = `${S2_BASE}/paper/${encodeURIComponent(paperId)}/citations?fields=${fields}&limit=${limit}`;

  const res = await fetch(url, {
    headers: s2Headers(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`S2 citations fetch failed: ${res.status}`);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = (await res.json()) as { data?: any[] };

  return (data.data ?? [])
    .filter((r: any) => r.citingPaper?.paperId)
    .map((r: any) => ({
      paperId: r.citingPaper.paperId,
      title: r.citingPaper.title ?? "Untitled",
      year: r.citingPaper.year ?? null,
      citationCount: r.citingPaper.citationCount ?? 0,
      isInfluential: r.isInfluential ?? false,
      intents: r.intents ?? [],
      doi: r.citingPaper.externalIds?.DOI ?? null,
      authors: (r.citingPaper.authors ?? []).map((a: any) => a.name ?? ""),
    }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

/** S2 content-similar 추천 (Key Concepts용) */
export async function fetchS2Similar(
  paperId: string,
  limit = 20,
): Promise<RecommendedPaper[]> {
  const url = `${S2_BASE.replace("/graph/v1", "")}/recommendations/v1/papers?fields=paperId,title,year,citationCount,externalIds,authors&limit=${limit}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { ...s2Headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ positivePaperIds: [paperId], negativePaperIds: [] }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`S2 similar fetch failed: ${res.status}`);

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = (await res.json()) as { recommendedPapers?: any[] };

  return (data.recommendedPapers ?? [])
    .slice(0, limit)
    .map((p: any) => ({
      paperId: p.paperId,
      title: p.title ?? "Untitled",
      year: p.year ?? null,
      citationCount: p.citationCount ?? 0,
      isInfluential: false,
      intents: [],
      doi: p.externalIds?.DOI ?? null,
      authors: (p.authors ?? []).map((a: any) => a.name ?? ""),
    }));
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

async function fetchS2Citations(paperId: string, limit: number = 100): Promise<CitationContext[]> {
  const fields = "contexts,intents,citingPaper.title,citingPaper.year";
  const url = `${S2_BASE}/paper/${encodeURIComponent(paperId)}/citations?fields=${fields}&limit=${limit}`;

  const res = await fetch(url, {
    headers: s2Headers(),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`S2 citations fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as S2CitationResponse;

  const contexts: CitationContext[] = [];

  for (const citation of data.data ?? []) {
    const citingTitle = citation.citingPaper?.title ?? "Unknown";
    const citingYear = citation.citingPaper?.year ?? null;
    const intents = citation.intents ?? [];

    for (const ctx of citation.contexts ?? []) {
      if (ctx && ctx.trim().length > 20) {
        contexts.push({
          citingPaperTitle: citingTitle,
          citingPaperYear: citingYear,
          context: ctx.trim(),
          intent: intents[0] ?? "background",
        });
      }
    }
  }

  // intent별로 다양하게 정렬 (methodology, result을 상위로)
  contexts.sort((a, b) => {
    const priority: Record<string, number> = { methodology: 0, result: 1, background: 2 };
    return (priority[a.intent] ?? 3) - (priority[b.intent] ?? 3);
  });

  // 최대 50개만 반환 (토큰 절약)
  return contexts.slice(0, 50);
}
