import type { GraphData } from "@/app/graph/_data/types";

export interface ToolContext {
  graphData: GraphData;
  sessionId: string;
  userId: string;
}

export interface ToolExecutionResult {
  summary: string;
  data?: unknown;
}

export interface Tool<Args extends Record<string, unknown> = Record<string, unknown>> {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiresApproval: boolean;
  execute: (args: Args, ctx: ToolContext) => Promise<ToolExecutionResult>;
  buildPreview?: (args: Args) => string;
}
