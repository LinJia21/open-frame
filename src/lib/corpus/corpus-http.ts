import { apiError } from "@/lib/analysis/errors";
import { CorpusError, type CorpusItem } from "@/lib/corpus/types";
import type { CorpusStore } from "@/lib/corpus/store";

export const MAX_CORPUS_BYTES = 1_500_000;

export interface CorpusHttpDeps {
  store: CorpusStore;
  allowRequest: (key: string) => boolean;
  now?: () => string;
  secrets?: () => Array<string | null | undefined>;
}

/** List or search the saved library. This route does not fetch any article URL. */
export async function handleCorpusGet(request: Request, deps: CorpusHttpDeps): Promise<Response> {
  if (!allow(request, deps)) {
    return apiError({ code: "RATE_LIMITED", message: "rate_limited", field: null, recoverable: true }, 429);
  }
  const url = new URL(request.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (id) return readOne(id, deps);
  const query = (url.searchParams.get("q") ?? "").trim();
  const event = (url.searchParams.get("event") ?? "").trim();
  if (query.length > 200 || event.length > 200) {
    return apiError({
      code: "INVALID_FORMAT",
      message: "invalid_item",
      field: query.length > 200 ? "q" : "event",
      recoverable: true,
    }, 400);
  }
  try {
    const result = await deps.store.search(query, event);
    return Response.json({
      ok: true,
      data: {
        ...result,
        items: result.items.map(publicItem),
      },
      warnings: ["Saved-history search only. This did not search the live internet."],
    });
  } catch (error) {
    return corpusFailure(error);
  }
}

/** Import JSON the user already has. URLs are stored as text and are not fetched. */
export async function handleCorpusImport(request: Request, deps: CorpusHttpDeps): Promise<Response> {
  if (!allow(request, deps)) {
    return apiError({ code: "RATE_LIMITED", message: "rate_limited", field: null, recoverable: true }, 429);
  }
  const size = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(size) && size > MAX_CORPUS_BYTES) {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
  }
  let body: unknown;
  try {
    let text = await request.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    if (text.length > MAX_CORPUS_BYTES) {
      return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
    }
    body = JSON.parse(text);
  } catch {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
  }
  try {
    const result = await deps.store.importItems(body, (deps.now ?? (() => new Date().toISOString()))(), deps.secrets?.() ?? []);
    return Response.json({
      ok: true,
      data: {
        created: result.created,
        updated: result.updated,
        library: result.library,
        items: result.items.map(publicItem),
      },
      warnings: ["Imported text was saved. No URL was fetched. The real library starts empty until you import."],
    }, { status: 201 });
  } catch (error) {
    return corpusFailure(error);
  }
}

async function readOne(id: string, deps: CorpusHttpDeps): Promise<Response> {
  if (!/^art_[a-z0-9]{12}$/.test(id)) {
    return apiError({ code: "UNKNOWN_REFERENCE", message: "not_found", field: "id", recoverable: false }, 404);
  }
  try {
    const result = await deps.store.search("", "");
    const item = result.items.find((entry) => entry.id === id);
    if (!item) {
      return apiError({ code: "UNKNOWN_REFERENCE", message: "not_found", field: "id", recoverable: false }, 404);
    }
    return Response.json({
      ok: true,
      data: {
        mode: "saved_history",
        liveInternetSearch: false,
        library: result.library,
        item: publicDetail(item),
      },
      warnings: ["Saved-history read only. This did not fetch the article URL."],
    });
  } catch (error) {
    return corpusFailure(error);
  }
}

export function publicDetail(item: CorpusItem) {
  return {
    ...publicItem(item),
    body: item.body,
    summary: item.summary,
    language: item.language,
  };
}

export function publicItem(item: CorpusItem) {
  const previewSource = item.summary ?? item.body ?? "";
  return {
    id: item.id,
    event: item.event,
    outlet: item.outlet,
    title: item.title,
    publishedAt: item.publishedAt,
    originalUrl: item.originalUrl,
    savedAt: item.savedAt,
    completeness: item.completeness,
    syndication: item.syndication,
    reprintOfUrl: item.reprintOfUrl,
    fixture: item.fixture,
    truncated: item.truncated,
    hasBody: item.body !== null,
    hasSummary: item.summary !== null,
    preview: previewSource ? previewSource.slice(0, 180) : null,
  };
}

function allow(request: Request, deps: CorpusHttpDeps): boolean {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return deps.allowRequest(`corpus:${key}`);
}

function corpusFailure(error: unknown): Response {
  if (error instanceof CorpusError) {
    return apiError({
      code: error.code === "library_full" ? "RATE_LIMITED" : "VALIDATION_FAILED",
      message: error.code,
      field: error.index === null ? null : `items.${error.index}`,
      recoverable: true,
    }, error.code === "store_failed" ? 500 : 422);
  }
  return apiError({ code: "UNKNOWN", message: "store_failed", field: null, recoverable: true }, 500);
}
