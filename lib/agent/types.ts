export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  name: string;
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
}

export interface ApprovalItem {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  preview: string;
}

// SSE 이벤트 스트림
export type AgentEvent =
  | { type: "text_delta"; delta: string }
  | { type: "tool_call_start"; call: ToolCall }
  | { type: "tool_result"; result: ToolResult }
  | { type: "batch_approval"; items: ApprovalItem[] }
  | { type: "approval_resolved"; callId: string; approved: boolean }
  | { type: "done" }
  | { type: "error"; message: string };
