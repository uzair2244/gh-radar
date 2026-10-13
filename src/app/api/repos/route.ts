import { NextResponse } from "next/server";
import { getFacets, getRepos, parseFilters } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * JSON view of the same data the page renders, so other tools can read the
 * radar without scraping HTML.
 *
 *   /api/repos?q=mcp&language=Python&license=MIT&topic=cli&stars=10
 *   /api/repos?sort=newest&limit=10&facets=1
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const params: Record<string, string | string[] | undefined> = {};
  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing === undefined) params[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else params[key] = [existing, value];
  });

  const filters = parseFilters(params);

  try {
    const result = await getRepos(filters);
    const includeFacets = searchParams.get("facets") === "1";
    const facets = includeFacets ? await getFacets(filters) : undefined;

    return NextResponse.json({
      total: result.total,
      page: result.page,
      pages: result.pages,
      filters,
      facets,
      repos: result.docs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { error: "database unavailable", detail: message },
      { status: 503 },
    );
  }
}
