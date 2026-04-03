import { searchPapers } from "@/paper_test/lib/openalex";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("per_page") ?? "20");
  const yearFrom = searchParams.get("year_from") ? Number(searchParams.get("year_from")) : undefined;
  const yearTo = searchParams.get("year_to") ? Number(searchParams.get("year_to")) : undefined;
  const openAccessOnly = searchParams.get("open_access") === "true";
  const sort = searchParams.get("sort") ?? "relevance_score:desc";

  if (!query) {
    return Response.json({ error: "query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const result = await searchPapers({ query, page, perPage, yearFrom, yearTo, openAccessOnly, sort });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
