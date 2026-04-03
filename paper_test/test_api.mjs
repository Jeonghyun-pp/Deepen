/**
 * OpenAlex Paper API 테스트 스크립트
 * 사용법: node test_api.mjs [검색어]
 * 예시: node test_api.mjs "transformer attention"
 */

const BASE_URL = "https://api.openalex.org";

// --- 유틸 ---

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return null;
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(([, word]) => word).join(" ");
}

function normalizePaper(work) {
  return {
    id: work.id?.replace("https://openalex.org/", "") ?? "",
    title: work.title ?? "Untitled",
    abstract: reconstructAbstract(work.abstract_inverted_index),
    authors: (work.authorships ?? []).map((a) => ({
      name: a.author?.display_name ?? "Unknown",
      institution: a.institutions?.[0]?.display_name ?? null,
    })),
    year: work.publication_year ?? null,
    citationCount: work.cited_by_count ?? 0,
    fields: (work.topics ?? []).slice(0, 3).map((t) => t.display_name),
    doi: work.doi ?? null,
    pdfUrl: work.open_access?.oa_url ?? work.primary_location?.pdf_url ?? null,
    openAccess: work.open_access?.is_oa ?? false,
    openalexId: work.id ?? "",
  };
}

// --- API 호출 ---

async function searchPapers(query, page = 1, perPage = 5) {
  const url = new URL(`${BASE_URL}/works`);
  url.searchParams.set("search", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("sort", "relevance_score:desc");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`검색 실패: ${res.status}`);

  const data = await res.json();
  return {
    papers: (data.results ?? []).map(normalizePaper),
    totalCount: data.meta?.count ?? 0,
    page,
    perPage,
  };
}

async function getPaper(openalexId) {
  const id = openalexId.startsWith("https://")
    ? openalexId
    : `https://openalex.org/${openalexId}`;

  const url = new URL(`${BASE_URL}/works/${encodeURIComponent(id)}`);
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`논문 조회 실패: ${res.status}`);
  }
  return normalizePaper(await res.json());
}

// --- 실행 ---

const query = process.argv[2] || "attention is all you need";
console.log(`\n🔍 검색어: "${query}"\n`);

try {
  const result = await searchPapers(query);
  console.log(`📊 총 ${result.totalCount.toLocaleString()}건 중 상위 ${result.papers.length}건\n`);

  for (const [i, paper] of result.papers.entries()) {
    console.log(`--- [${i + 1}] ${paper.title} ---`);
    console.log(`  📅 ${paper.year}년 | 📖 인용 ${paper.citationCount.toLocaleString()}회 | OA: ${paper.openAccess ? "✅" : "❌"}`);
    console.log(`  👤 ${paper.authors.slice(0, 3).map((a) => a.name).join(", ")}${paper.authors.length > 3 ? ` 외 ${paper.authors.length - 3}명` : ""}`);
    console.log(`  🏷️  ${paper.fields.join(", ") || "없음"}`);
    if (paper.abstract) {
      console.log(`  📝 ${paper.abstract.slice(0, 150)}...`);
    }
    console.log(`  🔗 ${paper.doi || "DOI 없음"}`);
    console.log(`  📄 PDF: ${paper.pdfUrl || "없음"}`);
    console.log(`  🆔 ${paper.id}`);
    console.log();
  }

  // 첫 번째 논문 상세 조회 테스트
  if (result.papers.length > 0) {
    const firstId = result.papers[0].id;
    console.log(`\n📖 상세 조회 테스트: ${firstId}`);
    const detail = await getPaper(firstId);
    if (detail) {
      console.log(`  ✅ 제목: ${detail.title}`);
      console.log(`  ✅ 저자 수: ${detail.authors.length}명`);
      console.log(`  ✅ 초록 길이: ${detail.abstract?.length ?? 0}자`);
    }
  }
} catch (err) {
  console.error("❌ 에러:", err.message);
}
