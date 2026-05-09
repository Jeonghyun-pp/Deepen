import { runAgent } from "@/lib/agent/runner";
import type { Message } from "@/lib/agent/types";
import type { GraphData } from "@/lib/graph/data/types";
import { requireUser } from "@/lib/auth/require-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let userId: string;
  try {
    const { user } = await requireUser();
    userId = user.id;
  } catch (e) {
    if (e instanceof Response) return e;
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

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
        for await (const event of runAgent(messages, graphData, sessionId, userId)) {
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
