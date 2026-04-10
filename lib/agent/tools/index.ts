import type { Tool } from "./types";
import { queryGraphTool } from "./query-graph";
import { findPathTool } from "./find-path";
import { extractConceptsTool } from "./extract-concepts";
import { searchPapersOpenAlexTool } from "./search-papers-openalex";
import { addNodeTool } from "./add-node";
import { addEdgeTool } from "./add-edge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOLS: Record<string, Tool<any>> = {
  query_graph: queryGraphTool,
  find_path: findPathTool,
  extract_concepts: extractConceptsTool,
  search_papers_openalex: searchPapersOpenAlexTool,
  add_node: addNodeTool,
  add_edge: addEdgeTool,
};

/**
 * OpenAI chat.completions tools 파라미터 형식으로 변환.
 */
export function getToolSchemas() {
  return Object.values(TOOLS).map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}
