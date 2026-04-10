import type { GraphData } from "@/app/graph/_data/types";

const MAX_NEIGHBORS = 10;

export function buildSystemPrompt(graphData: GraphData, userQuery: string): string {
  const stats = getStats(graphData);
  const contextBlock = getRelevantContext(graphData, userQuery);

  return `당신은 Deepy Research Copilot입니다. 사용자의 지식 그래프 위에서 연구를 탐색·이해·확장하는 에이전트입니다.
항상 한국어로 답변하세요.

## 원칙
- 모든 정보는 지식 그래프에서 찾는다. 그래프에 있는 내용은 절대 상상하지 말고 도구로 조회하라.
- 노드를 언급할 때는 반드시 ID를 함께 제시하라. 예: "Transformer (c_transformer_arch)".
- 사용자가 "핵심 개념", "경로", "학습 순서", "관련 논문"을 물으면 먼저 적절한 도구를 호출하라.

## 사용 가능 도구
- query_graph: 노드/엣지를 조회. 특정 노드 중심 1-hop 탐색 또는 타입/관계 전역 필터.
- find_path: 두 노드 사이 최단 경로 찾기. 학습 순서(roadmap) 생성에 사용.
- extract_concepts: 특정 논문이 제안/사용하는 개념·기법 추출.
- search_papers_openalex: 그래프에 없는 외부 논문 검색 (OpenAlex).
- add_node, add_edge: 그래프에 새 노드/엣지 추가. **사용자 승인 필요**.

## 지식 그래프 현황
${stats}

## 현재 질문과 관련된 노드 (미리 로드된 컨텍스트)
${contextBlock}`.trim();
}

function getStats(graphData: GraphData): string {
  const byType = graphData.nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const typeSummary = Object.entries(byType)
    .map(([t, c]) => `${t}:${c}개`)
    .join(", ");
  return `총 ${graphData.nodes.length}개 노드 (${typeSummary}), ${graphData.edges.length}개 엣지`;
}

function getRelevantContext(graphData: GraphData, userQuery: string): string {
  if (graphData.nodes.length === 0) return "그래프가 비어 있습니다.";

  // 키워드 매칭 (placeholder — 추후 임베딩/형태소 분석으로 개선)
  const stopwords = new Set([
    "이", "가", "을", "를", "의", "에", "는", "은", "과", "와",
    "해줘", "알려줘", "설명해줘", "뭐야", "어떻게",
  ]);
  const keywords = userQuery
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[.,?!]/g, ""))
    .filter((w) => w.length > 1 && !stopwords.has(w));

  const matched = graphData.nodes.filter((n) =>
    keywords.some(
      (k) =>
        n.label.toLowerCase().includes(k) ||
        (n.content ?? "").toLowerCase().includes(k)
    )
  );

  const relevantIds = new Set(matched.map((n) => n.id));
  for (const node of matched) {
    graphData.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .sort((a, b) => (b.weight ?? 0.5) - (a.weight ?? 0.5))
      .slice(0, MAX_NEIGHBORS)
      .forEach((e) =>
        relevantIds.add(e.source === node.id ? e.target : e.source)
      );
  }

  const nodes = graphData.nodes.filter((n) => relevantIds.has(n.id));
  if (nodes.length === 0) return "관련 노드를 찾지 못했습니다.";

  return nodes
    .map(
      (n) =>
        `[${n.id}] ${n.type} "${n.label}"` +
        (n.meta?.year ? ` (${n.meta.year})` : "") +
        `\n  ${(n.content ?? "").slice(0, 150)}`
    )
    .join("\n\n");
}
