import { resolveApproval } from "@/lib/agent/approval";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Agent mutation tool 승인 처리.
 * Body: { sessionId: string, decisions: Record<callId, boolean> }
 */
export async function POST(req: Request) {
  const { sessionId, decisions } = (await req.json()) as {
    sessionId: string;
    decisions: Record<string, boolean>;
  };

  if (!sessionId || !decisions) {
    return Response.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  const ok = resolveApproval(sessionId, decisions);
  return Response.json({ ok });
}
