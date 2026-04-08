import { getPaper } from "@/lib/clients/openalex";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const paper = await getPaper(id);
    if (!paper) {
      return Response.json({ error: "Paper not found" }, { status: 404 });
    }
    return Response.json(paper);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
