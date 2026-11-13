import { NEWS_SOURCES } from "./catalog";
import type { createNewsDiscovery } from "./discovery";

export async function handleNewsGet(request: Request, deps: {
  discovery: ReturnType<typeof createNewsDiscovery>;
  allowRequest: (key: string) => boolean;
}): Promise<Response> {
  const headers = { "Cache-Control": "no-store" };
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ ok: false, error: "cross_site_request" }, { status: 403, headers });
  }
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const sourceParam = url.searchParams.get("sources");
  const sourceIds = sourceParam === null ? NEWS_SOURCES.map((source) => source.id) : [...new Set(sourceParam.split(","))];
  if (query.length > 200 || /[\u0000-\u001f\u007f]/.test(query) || sourceIds.length === 0 || sourceIds.some((id) => !NEWS_SOURCES.some((source) => source.id === id))) {
    return Response.json({ ok: false, error: "invalid_query_or_sources" }, { status: 400, headers });
  }
  if (!deps.allowRequest("news:global")) {
    return Response.json({ ok: false, error: "rate_limited" }, { status: 429, headers: { ...headers, "Retry-After": "60" } });
  }
  const data = await deps.discovery.search(query, sourceIds);
  return Response.json({ ok: true, data }, { headers });
}
