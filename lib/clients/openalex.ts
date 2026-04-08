import type { Paper, Author, PaperSearchResult } from "../types/paper";

const BASE_URL = "https://api.openalex.org";
const POLITE_EMAIL = process.env.OPENALEX_EMAIL || "";

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  if (POLITE_EMAIL) {
    url.searchParams.set("mailto", POLITE_EMAIL);
  }
  return url.toString();
}

// OpenAlex returns abstract as an "inverted index" — reconstruct it
function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined
): string | null {
  if (!invertedIndex) return null;
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, word]) => word).join(" ");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizePaper(work: any): Paper {
  return {
    id: work.id?.replace("https://openalex.org/", "") ?? "",
    title: work.title ?? "Untitled",
    abstract: reconstructAbstract(work.abstract_inverted_index),
    authors: (work.authorships ?? []).map(
      (a: any): Author => ({
        name: a.author?.display_name ?? "Unknown",
        institution:
          a.institutions?.[0]?.display_name ?? null,
      })
    ),
    year: work.publication_year ?? null,
    citationCount: work.cited_by_count ?? 0,
    fields: (work.topics ?? [])
      .slice(0, 3)
      .map((t: any) => t.display_name),
    doi: work.doi ?? null,
    pdfUrl:
      work.open_access?.oa_url ??
      work.primary_location?.pdf_url ??
      null,
    openAccess: work.open_access?.is_oa ?? false,
    openalexId: work.id ?? "",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface SearchOptions {
  query: string;
  page?: number;
  perPage?: number;
  yearFrom?: number;
  yearTo?: number;
  openAccessOnly?: boolean;
  sort?: string; // e.g. "relevance_score:desc", "cited_by_count:desc", "publication_year:desc"
}

export async function searchPapers(opts: SearchOptions): Promise<PaperSearchResult> {
  const { query, page = 1, perPage = 20, yearFrom, yearTo, openAccessOnly, sort = "relevance_score:desc" } = opts;

  // Build filter string
  const filters: string[] = [];
  if (yearFrom && yearTo) {
    filters.push(`publication_year:${yearFrom}-${yearTo}`);
  } else if (yearFrom) {
    filters.push(`publication_year:${yearFrom}-`);
  } else if (yearTo) {
    filters.push(`publication_year:-${yearTo}`);
  }
  if (openAccessOnly) {
    filters.push("open_access.is_oa:true");
  }

  const params: Record<string, string> = {
    search: query,
    page: String(page),
    per_page: String(perPage),
    sort,
  };
  if (filters.length > 0) {
    params.filter = filters.join(",");
  }

  const url = buildUrl("/works", params);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenAlex search failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    papers: (data.results ?? []).map(normalizePaper),
    totalCount: data.meta?.count ?? 0,
    page,
    perPage,
  };
}

export async function getPaper(openalexId: string): Promise<Paper | null> {
  // Accept both full URL and short ID
  const id = openalexId.startsWith("https://")
    ? openalexId
    : `https://openalex.org/${openalexId}`;

  const url = buildUrl(`/works/${encodeURIComponent(id)}`, {});

  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`OpenAlex get paper failed: ${res.status}`);
  }

  const data = await res.json();
  return normalizePaper(data);
}
