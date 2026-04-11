// ── 추천 엔진 ──
// 6-Layer별로 Semantic Scholar citation 데이터를 다르게 필터링·스코어링한다.

import {
  fetchS2References,
  fetchS2CitationsForRec,
  fetchS2Similar,
  type RecommendedPaper,
} from "../clients/semantic-scholar";

export type LayerType =
  | "prior_work"
  | "key_concepts"
  | "pipeline"
  | "follow_ups"
  | "industry_use"
  | "open_questions";

export interface RecommendResult {
  paperId: string;
  title: string;
  year: number | null;
  citationCount: number;
  score: number;
  reason: string;
}

// ── 스코어링 헬퍼 ──

/** 최신일수록 1에 가까운 값 (출판 후 10년 = 0.5 수준) */
function recencyScore(year: number | null): number {
  if (!year) return 0.3;
  const age = new Date().getFullYear() - year;
  return 1 / (1 + age * 0.1);
}

/** log-normalized citation score (0~1) */
function citationScore(count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.log10(count + 1) / 5, 1); // 100k건 이상도 1 이하로 수렴
}

function dedup(papers: RecommendedPaper[]): RecommendedPaper[] {
  const seen = new Set<string>();
  return papers.filter((p) => {
    if (seen.has(p.paperId)) return false;
    seen.add(p.paperId);
    return true;
  });
}

function topN(results: RecommendResult[], n: number): RecommendResult[] {
  return results.sort((a, b) => b.score - a.score).slice(0, n);
}

// ── 레이어별 전략 ──

/** Layer 1: Prior Work — 이 논문이 기반한 배경 연구 */
async function priorWork(
  s2Id: string,
  n: number,
): Promise<RecommendResult[]> {
  const refs = await fetchS2References(s2Id);

  const filtered = refs.filter((p) =>
    p.intents.includes("background") || p.intents.length === 0,
  );

  return topN(
    filtered.map((p) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount,
      score:
        0.4 * (p.isInfluential ? 1 : 0) +
        0.3 * (p.intents.includes("background") ? 1 : 0) +
        0.3 * citationScore(p.citationCount),
      reason: p.isInfluential
        ? "핵심 선행 연구 (높은 영향력)"
        : "배경 지식으로 인용된 연구",
    })),
    n,
  );
}

/** Layer 2: Key Concepts — content-similar 논문 (S2 추천 API 활용) */
async function keyConcepts(
  s2Id: string,
  n: number,
): Promise<RecommendResult[]> {
  const similar = await fetchS2Similar(s2Id, n * 2);

  return topN(
    similar.map((p, i) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount,
      // S2 유사도 순서 = 내림차순이므로 순위 기반 점수 부여
      score: 1 - i / (similar.length + 1),
      reason: "유사한 핵심 개념을 다루는 논문",
    })),
    n,
  );
}

/** Layer 3: Pipeline — 같은 방법론을 사용한 논문 */
async function pipeline(
  s2Id: string,
  n: number,
): Promise<RecommendResult[]> {
  const [refs, cites] = await Promise.all([
    fetchS2References(s2Id),
    fetchS2CitationsForRec(s2Id, 100),
  ]);

  const methodRefs = refs.filter((p) => p.intents.includes("methodology"));
  const methodCites = cites.filter((p) => p.intents.includes("methodology"));

  const all = dedup([...methodRefs, ...methodCites]);

  return topN(
    all.map((p) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount,
      score:
        0.5 * (p.intents.includes("methodology") ? 1 : 0) +
        0.3 * (p.isInfluential ? 1 : 0) +
        0.2 * recencyScore(p.year),
      reason: p.isInfluential
        ? "이 논문의 방법론을 발전시킨 연구"
        : "동일 방법론을 사용한 연구",
    })),
    n,
  );
}

/** Layer 4: Follow-ups — 이 논문 이후 발전된 후속 연구 */
async function followUps(
  s2Id: string,
  n: number,
): Promise<RecommendResult[]> {
  const cites = await fetchS2CitationsForRec(s2Id);

  const filtered = cites.filter(
    (p) =>
      p.isInfluential ||
      p.intents.includes("result") ||
      p.intents.includes("methodology"),
  );

  // background only 인용은 단순 언급이므로 제외
  const cleaned = filtered.filter(
    (p) =>
      !(
        p.intents.length > 0 &&
        p.intents.every((i) => i === "background")
      ),
  );

  return topN(
    cleaned.map((p) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount,
      score:
        0.3 * (p.isInfluential ? 1 : 0) +
        0.3 * (p.intents.includes("result") ? 1 : 0) +
        0.4 * recencyScore(p.year),
      reason: p.isInfluential
        ? "이 논문을 크게 발전시킨 후속 연구"
        : "이 논문의 결과를 확장한 연구",
    })),
    n,
  );
}

/** Layer 5: Industry Use — 산업/기업에서 적용한 사례 */
async function industryUse(
  s2Id: string,
  n: number,
): Promise<RecommendResult[]> {
  const INDUSTRY_KEYWORDS = [
    "Google", "Meta", "Microsoft", "Amazon", "Apple", "OpenAI",
    "Anthropic", "DeepMind", "NVIDIA", "Samsung", "ByteDance",
    "Baidu", "Alibaba", "Tencent", "Kakao", "Naver",
  ];

  const cites = await fetchS2CitationsForRec(s2Id);

  const industryPapers = cites.filter((p) =>
    p.authors.some((author) =>
      INDUSTRY_KEYWORDS.some((kw) =>
        author.toLowerCase().includes(kw.toLowerCase()),
      ),
    ),
  );

  // industry 논문이 부족하면 전체 forward에서 isInfluential 상위로 보완
  const fallback =
    industryPapers.length < n
      ? cites.filter((p) => p.isInfluential).slice(0, n)
      : [];

  const all = dedup([...industryPapers, ...fallback]);

  return topN(
    all.map((p) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount,
      score:
        0.4 * (industryPapers.includes(p) ? 1 : 0) +
        0.3 * (p.isInfluential ? 1 : 0) +
        0.3 * recencyScore(p.year),
      reason: industryPapers.includes(p)
        ? "산업/기업 연구팀의 실제 적용 사례"
        : "영향력 있는 응용 연구",
    })),
    n,
  );
}

/** Layer 6: Open Questions — 아직 탐색 초기인 최신 연구 */
async function openQuestions(
  s2Id: string,
  n: number,
): Promise<RecommendResult[]> {
  const currentYear = new Date().getFullYear();
  const cites = await fetchS2CitationsForRec(s2Id, 200);

  const frontier = cites.filter(
    (p) => p.year !== null && p.year >= currentYear - 2 && p.citationCount < 20,
  );

  return topN(
    frontier.map((p) => ({
      paperId: p.paperId,
      title: p.title,
      year: p.year,
      citationCount: p.citationCount,
      score:
        0.3 * (1 - Math.min(p.citationCount / 20, 1)) + // 인용 적을수록 높음
        0.7 * recencyScore(p.year),
      reason: "이 분야에서 최근 제기된 미해결 연구",
    })),
    n,
  );
}

// ── 공개 인터페이스 ──

export async function getRecommendations(
  s2PaperId: string,
  layer: LayerType,
  topN = 5,
): Promise<RecommendResult[]> {
  switch (layer) {
    case "prior_work":
      return priorWork(s2PaperId, topN);
    case "key_concepts":
      return keyConcepts(s2PaperId, topN);
    case "pipeline":
      return pipeline(s2PaperId, topN);
    case "follow_ups":
      return followUps(s2PaperId, topN);
    case "industry_use":
      return industryUse(s2PaperId, topN);
    case "open_questions":
      return openQuestions(s2PaperId, topN);
  }
}
