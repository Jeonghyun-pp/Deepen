import { getPaper } from "@/lib/clients/openalex";
import {
  getRecommendations,
  type LayerType,
} from "@/lib/engines/recommendations";

const S2_BASE = "https://api.semanticscholar.org/graph/v1";
const S2_API_KEY = process.env.S2_API_KEY ?? "";

function s2Headers(): Record<string, string> {
  return S2_API_KEY ? { "x-api-key": S2_API_KEY } : {};
}

/**
 * OpenAlex 논문 정보로 S2 paperId를 찾는다.
 * 시도 순서: DOI → arXiv ID → 제목 검색
 */
async function resolveS2Id(
  doi: string | null,
  pdfUrl: string | null,
  title: string,
): Promise<string | null> {
  async function tryFetch(url: string): Promise<string | null> {
    const res = await fetch(url, {
      headers: s2Headers(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { paperId?: string };
    return data.paperId ?? null;
  }

  // 1차: DOI 조회
  if (doi) {
    const cleanDoi = doi.replace("https://doi.org/", "");
    const found = await tryFetch(
      `${S2_BASE}/paper/DOI:${encodeURIComponent(cleanDoi)}?fields=paperId`,
    );
    if (found) return found;
  }

  // 2차: arXiv ID 조회 (pdfUrl이 arxiv.org를 포함할 때)
  if (pdfUrl && pdfUrl.includes("arxiv.org")) {
    const match = pdfUrl.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/);
    if (match) {
      const found = await tryFetch(
        `${S2_BASE}/paper/ArXiv:${match[1]}?fields=paperId`,
      );
      if (found) return found;
    }
  }

  // 3차: 제목 검색 fallback (rate limit에 가장 취약)
  const searchRes = await fetch(
    `${S2_BASE}/paper/search?query=${encodeURIComponent(title)}&fields=paperId&limit=1`,
    { headers: s2Headers(), signal: AbortSignal.timeout(8_000) },
  );
  if (!searchRes.ok) return null;

  const searchData = (await searchRes.json()) as {
    data?: { paperId: string }[];
  };
  return searchData.data?.[0]?.paperId ?? null;
}

const VALID_LAYERS: LayerType[] = [
  "prior_work",
  "key_concepts",
  "pipeline",
  "follow_ups",
  "industry_use",
  "open_questions",
];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const layer = searchParams.get("layer") as LayerType | null;
  const topNParam = Number(searchParams.get("n") ?? "5");

  // s2_id를 직접 넘기면 OpenAlex 조회와 S2 resolution 과정을 건너뜀
  const directS2Id = searchParams.get("s2_id");

  if (!layer || !VALID_LAYERS.includes(layer)) {
    return Response.json(
      { error: `'layer' must be one of: ${VALID_LAYERS.join(", ")}` },
      { status: 400 },
    );
  }

  let s2PaperId: string | null = directS2Id;

  if (!s2PaperId) {
    // 1. OpenAlex에서 논문 정보 조회
    let doi: string | null = null;
    let pdfUrl: string | null = null;
    let title = "";

    try {
      const paper = await getPaper(id);
      if (!paper) {
        return Response.json({ error: "Paper not found" }, { status: 404 });
      }
      doi = paper.doi;
      pdfUrl = paper.pdfUrl;
      title = paper.title;
    } catch (e) {
      return Response.json(
        {
          error: `OpenAlex lookup failed: ${e instanceof Error ? e.message : e}`,
        },
        { status: 502 },
      );
    }

    // 2. S2 paper ID 해석 (DOI → arXiv → 제목 순)
    s2PaperId = await resolveS2Id(doi, pdfUrl, title);
    if (!s2PaperId) {
      return Response.json(
        {
          error:
            "Could not resolve this paper in Semantic Scholar. " +
            "Try passing ?s2_id={paperId} directly.",
        },
        { status: 422 },
      );
    }
  }

  // 3. 레이어별 추천 실행
  try {
    const results = await getRecommendations(s2PaperId, layer, topNParam);
    return Response.json({ layer, s2PaperId, results });
  } catch (e) {
    return Response.json(
      {
        error: `Recommendation failed: ${e instanceof Error ? e.message : e}`,
      },
      { status: 502 },
    );
  }
}
