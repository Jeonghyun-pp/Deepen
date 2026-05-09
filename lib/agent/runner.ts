import type {
  Message,
  AgentEvent,
  ToolCall,
  ToolResult,
  ApprovalItem,
} from "./types";
import type { GraphData } from "@/lib/graph/data/types";
import { buildSystemPrompt } from "./prompt";
import { callOpenAIWithTools } from "../clients/openai";
import { TOOLS, getToolSchemas } from "./tools";
import { waitForApproval } from "./approval";
import { recordTokenUsage } from "@/lib/db/token-usage";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const MAX_ITERATIONS = 5;

/**
 * Agent 실행 루프. Tool use 지원.
 *
 * 루프:
 *   1. LLM 호출 → text_delta 또는 tool_calls
 *   2. tool_calls 있으면 승인-필요/자동 분리
 *   3. 승인 필요한 것은 batch_approval 이벤트 발행 + waitForApproval
 *   4. 승인된 것만 execute, 결과를 messages에 append
 *   5. 다시 LLM 호출 (최대 MAX_ITERATIONS)
 */
export async function* runAgent(
  messages: Message[],
  graphData: GraphData,
  sessionId: string,
  userId: string,
): AsyncGenerator<AgentEvent> {
  const userQuery =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const systemPrompt = await buildSystemPrompt(graphData, userQuery, userId);
  const ctx = { graphData, sessionId, userId };

  const llmMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const tools = getToolSchemas();

  try {
    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      let pendingToolCalls: ToolCall[] = [];

      for await (const event of callOpenAIWithTools({
        messages: llmMessages,
        tools,
      })) {
        if (event.type === "text_delta") {
          yield { type: "text_delta", delta: event.delta };
        } else if (event.type === "tool_calls") {
          pendingToolCalls = event.calls;
        } else if (event.type === "usage") {
          void recordTokenUsage({
            userId,
            source: "agent",
            model: event.model,
            promptTokens: event.promptTokens,
            completionTokens: event.completionTokens,
            meta: { sessionId, iteration },
          });
        }
      }

      if (pendingToolCalls.length === 0) {
        yield { type: "done" };
        return;
      }

      // Assistant tool_calls 메시지를 히스토리에 추가
      llmMessages.push({
        role: "assistant",
        content: null,
        tool_calls: pendingToolCalls.map((c) => ({
          id: c.id,
          type: "function" as const,
          function: {
            name: c.name,
            arguments: JSON.stringify(c.args),
          },
        })),
      });

      // 승인 필요 vs 자동 실행 분리
      const needApproval: ToolCall[] = [];
      const autoExec: ToolCall[] = [];
      for (const call of pendingToolCalls) {
        const tool = TOOLS[call.name];
        if (!tool) {
          autoExec.push(call); // unknown tool도 일단 자동 실행하며 에러 반환
          continue;
        }
        (tool.requiresApproval ? needApproval : autoExec).push(call);
      }

      // Approval 요청
      let approvals: Record<string, boolean> = {};
      if (needApproval.length > 0) {
        const items: ApprovalItem[] = needApproval.map((c) => {
          const tool = TOOLS[c.name];
          const preview =
            tool?.buildPreview?.(c.args) ?? `${c.name}(${JSON.stringify(c.args)})`;
          return {
            callId: c.id,
            toolName: c.name,
            args: c.args,
            preview,
          };
        });
        yield { type: "batch_approval", items };
        approvals = await waitForApproval(sessionId);
        for (const item of items) {
          yield {
            type: "approval_resolved",
            callId: item.callId,
            approved: Boolean(approvals[item.callId]),
          };
        }
      }

      // 모든 tool 실행
      const allCalls = [...autoExec, ...needApproval];
      for (const call of allCalls) {
        const tool = TOOLS[call.name];
        let result: ToolResult;

        if (!tool) {
          result = {
            id: call.id,
            name: call.name,
            ok: false,
            summary: "",
            error: `Unknown tool: ${call.name}`,
          };
        } else if (tool.requiresApproval && !approvals[call.id]) {
          result = {
            id: call.id,
            name: call.name,
            ok: false,
            summary: "사용자가 거부함",
            error: "rejected",
          };
        } else {
          if (!tool.requiresApproval) {
            yield { type: "tool_call_start", call };
          }
          try {
            const exec = await tool.execute(call.args, ctx);
            result = {
              id: call.id,
              name: call.name,
              ok: true,
              summary: exec.summary,
              data: exec.data,
            };
          } catch (e) {
            result = {
              id: call.id,
              name: call.name,
              ok: false,
              summary: "",
              error: e instanceof Error ? e.message : String(e),
            };
          }
        }

        yield { type: "tool_result", result };

        // Tool 결과를 history에 추가 (summary만 → 토큰 절약)
        llmMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result.ok
            ? result.summary
            : `오류: ${result.error ?? "unknown"}`,
        });
      }
    }

    // MAX_ITERATIONS 초과
    yield { type: "done" };
  } catch (e) {
    yield {
      type: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
