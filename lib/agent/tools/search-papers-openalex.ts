import type { Tool } from "./types";
import { searchPapers } from "@/lib/clients/openalex";

interface Args extends Record<string, unknown> {
  query: string;
  limit?: number;
}

export const searchPapersOpenAlexTool: Tool<Args> = {
  name: "search_papers_openalex",
  description:
    "OpenAlex 학술 데이터베이스에서 논문을 검색한다. 그래프에 없는 외부 논문을 찾을 때 사용.",
  requiresApproval: false,
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "검색어 (영문 권장)" },
      limit: {
        type: "number",
        description: "결과 수 제한 (기본 5, 최대 20)",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  execute: async (args) => {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
    try {
      const result = await searchPapers({
        query: args.query,
        perPage: limit,
      });
      const papers = result.papers.slice(0, limit).map((p) => ({
        id: p.id,
        title: p.title,
        year: p.year,
        citations: p.citationCount,
        authors: p.authors.map((a) => a.name).slice(0, 3),
        abstract: p.abstract?.slice(0, 280) ?? null,
      }));
      return {
        summary: `OpenAlex: "${args.query}" → ${papers.length}개 결과 (총 ${result.totalCount.toLocaleString()})`,
        data: { papers, total: result.totalCount },
      };
    } catch (e) {
      return {
        summary: `OpenAlex 검색 실패: ${e instanceof Error ? e.message : String(e)}`,
        data: { papers: [], total: 0 },
      };
    }
  },
};
