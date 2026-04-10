import { runAgent } from "@/lib/agent/runner";
import type { Message } from "@/lib/agent/types";
import type { GraphData } from "@/app/graph/_data/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const {
    messages,
    graphData,
    sessionId,
  }: { messages: Message[]; graphData: GraphData; sessionId: string } =
    await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of runAgent(messages, graphData, sessionId)) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message: err instanceof Error ? err.message : String(err),
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
