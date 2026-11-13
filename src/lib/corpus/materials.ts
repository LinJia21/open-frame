import { createHash } from "node:crypto";
import type { NewsArticle } from "@/lib/openframe/openframe";
import { redactSecrets } from "@/lib/analysis/cursor-config";
import {
  CorpusError,
  type Completeness,
  type CorpusItem,
  type LibrarySnapshot,
  type ResolvedSelection,
  type SavedMaterial,
  type Syndication,
} from "@/lib/corpus/types";
import { assertPublicArticleUrl } from "@/lib/corpus/url";

const EXCERPT_MAX = 2_000;
const BODY_MAX = 20_000;
const SUMMARY_MAX = 4_000;

/** Turn an import payload into saved records. Does not fetch URLs and does not fill in missing text. */
export function normalizeImport(input: unknown, nowIso: string, secrets: Array<string | null | undefined> = []): CorpusItem[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new CorpusError("invalid_item");
  const items = (input as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 40) throw new CorpusError("invalid_item");
  return items.map((item, index) => normalizeOne(item, nowIso, secrets, index));
}

export function librarySnapshot(items: CorpusItem[]): LibrarySnapshot {
  return {
    itemCount: items.length,
    outletCount: new Set(items.map((item) => item.outlet)).size,
    cutoff: items.reduce<string | null>((latest, item) => (latest === null || item.savedAt > latest ? item.savedAt : latest), null),
  };
}

/**
 * Bind a selection to independence groups. A reprint shares the original's group
 * only when that original URL is already in the library. Unknown stays unknown.
 * Outlet country is not an input and is not inferred.
 */
export function prepareSelection(all: CorpusItem[], ids: string[]): ResolvedSelection {
  if (ids.length === 0) throw new CorpusError("no_sources");
  if (ids.length > 12) throw new CorpusError("too_many_sources");
  const byId = new Map(all.map((item) => [item.id, item]));
  const selected: CorpusItem[] = [];
  for (const id of ids) {
    const item = byId.get(id);
    if (!item) throw new CorpusError("unknown_source");
    selected.push(item);
  }
  if (!selected.some((item) => item.completeness !== "title_only")) {
    throw new CorpusError("insufficient_material");
  }
  const groups = groupIndex(all);
  return {
    items: selected.map((item) => toSavedMaterial(item, groups.get(item.id)!)),
    library: librarySnapshot(all),
  };
}

export function articlesFromMaterials(materials: SavedMaterial[]): NewsArticle[] {
  return materials.map((material) => {
    const missing: NewsArticle["missing_fields"] = [];
    if (material.completeness === "summary_only") {
      missing.push({
        field: "body",
        unknown_reason: "not_found",
        note: "Full text was not in the saved material. The summary was not expanded.",
      });
    }
    if (material.completeness === "title_only") {
      missing.push({
        field: "accessible_text",
        unknown_reason: "not_found",
        note: "Only a title was saved. No article text was written to fill the gap.",
      });
    }
    if (material.truncated) {
      missing.push({
        field: "accessible_text",
        unknown_reason: "other",
        note: "The saved text is longer than 2000 characters. Only the saved excerpt was kept. The rest was not written.",
      });
    }
    const domain = new URL(material.originalUrl).hostname;
    return {
      schema_version: "1.2.0",
      id: material.id,
      data_mode: "LIVE",
      analysis_role: "analysed",
      title: material.title,
      publisher: {
        name: material.outlet,
        domain,
        publisher_type: "other",
        fictional_demo_publisher: false,
      },
      publication_date: material.publishedAt,
      original_url: material.originalUrl,
      author: null,
      summary: material.summary,
      accessible_text: material.excerpt,
      accessible_text_origin: material.excerpt ? "user_supplied" : null,
      access_basis: accessBasis(material),
      retrieval_timestamp: material.savedAt,
      retrieval_method: "manual_entry",
      language: material.language,
      content_type: "news_report",
      paywalled: null,
      dedup: {
        duplicate_of: null,
        syndicated_from: material.syndicatedFrom,
        shared_original_sources: material.sharedOriginalUrl
          ? [{
              description: "Saved original URL for this reprint.",
              url: material.sharedOriginalUrl,
              independence_group_id: material.sharedOriginalGroupId ?? material.independenceGroupId,
            }]
          : [],
        independence_group_id: material.independenceGroupId,
        dedup_notes: material.dedupNote,
      },
      topics: [material.event],
      provenance: {
        data_mode: "LIVE",
        retrieval_method: "manual_entry",
        retrieved_at: material.savedAt,
        retrieved_by: "saved-history-import",
        notes: "Text was imported into the saved library. SpectraX did not fetch the URL.",
      },
      missing_fields: missing,
    };
  });
}

export function savedMaterialNotice(input: {
  cutoff: string | null;
  selected: number;
  selectedOutlets: number;
  libraryOutlets: number;
}): string {
  const cutoff = input.cutoff ?? "no saved timestamp";
  return `Saved historical materials through ${cutoff}. This run used ${input.selected} saved item(s) from ${input.selectedOutlets} outlet(s). The library lists ${input.libraryOutlets} outlet(s); that count was not searched on the live internet. This is not a live internet search and not an external fact check.`;
}

function accessBasis(material: SavedMaterial): NewsArticle["access_basis"] {
  if (!material.excerpt) return "none";
  if (material.completeness === "summary_only") return "publisher_summary";
  return "excerpt_fair_use";
}

interface GroupBinding {
  independenceGroupId: string;
  syndicatedFrom: string | null;
  sharedOriginalUrl: string | null;
  sharedOriginalGroupId: string | null;
  dedupNote: string | null;
}

function groupIndex(items: CorpusItem[]): Map<string, GroupBinding> {
  const byUrl = new Map(items.map((item) => [item.originalUrl, item]));
  const ownGroup = new Map(items.map((item) => [item.id, groupIdFor(item.originalUrl)]));
  const bindings = new Map<string, GroupBinding>();
  for (const item of items) {
    if (item.syndication === "reprint" && item.reprintOfUrl) {
      const original = byUrl.get(item.reprintOfUrl);
      if (original) {
        bindings.set(item.id, {
          independenceGroupId: ownGroup.get(original.id)!,
          syndicatedFrom: original.outlet,
          sharedOriginalUrl: original.originalUrl,
          sharedOriginalGroupId: ownGroup.get(original.id)!,
          dedupNote: "Reprint of a saved original. It is not a separate independent outlet.",
        });
        continue;
      }
      bindings.set(item.id, {
        independenceGroupId: ownGroup.get(item.id)!,
        syndicatedFrom: null,
        sharedOriginalUrl: item.reprintOfUrl,
        sharedOriginalGroupId: groupIdFor(item.reprintOfUrl),
        dedupNote: "Marked as a reprint. The original text is not in the saved library, so independence stays unknown beyond that mark.",
      });
      continue;
    }
    if (item.syndication === "reprint") {
      bindings.set(item.id, {
        independenceGroupId: ownGroup.get(item.id)!,
        syndicatedFrom: null,
        sharedOriginalUrl: null,
        sharedOriginalGroupId: null,
        dedupNote: "Marked as a reprint, but no original URL was saved.",
      });
      continue;
    }
    bindings.set(item.id, {
      independenceGroupId: ownGroup.get(item.id)!,
      syndicatedFrom: null,
      sharedOriginalUrl: null,
      sharedOriginalGroupId: null,
      dedupNote: item.syndication === "unknown"
        ? "Syndication is unknown. A country was not used to guess it."
        : "Saved as an original report.",
    });
  }
  return bindings;
}

function toSavedMaterial(item: CorpusItem, group: GroupBinding): SavedMaterial {
  const excerpt = excerptFor(item);
  const summary = item.summary?.trim() || excerpt?.slice(0, 500) || item.title;
  return {
    id: item.id,
    event: item.event,
    outlet: item.outlet,
    title: item.title,
    publishedAt: item.publishedAt,
    originalUrl: item.originalUrl,
    summary,
    excerpt,
    completeness: item.completeness,
    syndication: item.syndication,
    reprintOfUrl: item.reprintOfUrl,
    savedAt: item.savedAt,
    language: item.language,
    contentHash: item.contentHash,
    fixture: item.fixture,
    truncated: item.truncated || (item.body !== null && item.body.length > EXCERPT_MAX) || (item.summary !== null && item.summary.length > EXCERPT_MAX && item.completeness === "summary_only"),
    independenceGroupId: group.independenceGroupId,
    syndicatedFrom: group.syndicatedFrom,
    sharedOriginalUrl: group.sharedOriginalUrl,
    sharedOriginalGroupId: group.sharedOriginalGroupId,
    dedupNote: group.dedupNote,
  };
}

function excerptFor(item: CorpusItem): string | null {
  if (item.completeness === "title_only") return null;
  if (item.completeness === "summary_only") return item.summary?.slice(0, EXCERPT_MAX) ?? null;
  return item.body?.slice(0, EXCERPT_MAX) ?? null;
}

function groupIdFor(url: string): string {
  return `grp_${createHash("sha256").update(`group:${url}`).digest("hex").slice(0, 12)}`;
}

function normalizeOne(value: unknown, nowIso: string, secrets: Array<string | null | undefined>, index: number): CorpusItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CorpusError("invalid_item", index);
  const record = value as Record<string, unknown>;
  const event = textField(record.event, 200, index, "invalid_item");
  const outlet = textField(record.outlet, 200, index, "invalid_item");
  const title = textField(record.title, 300, index, "invalid_item");
  const body = optionalText(record.body, BODY_MAX, index);
  const summary = optionalText(record.summary, SUMMARY_MAX, index);
  const completeness = completenessOf(record.completeness, index);
  if (completeness === "full_text" && !body) throw new CorpusError("inconsistent_text", index);
  if (completeness === "summary_only" && (!summary || body)) throw new CorpusError("inconsistent_text", index);
  if (completeness === "title_only" && (body || summary)) throw new CorpusError("inconsistent_text", index);
  const syndication = syndicationOf(record.syndication, index);
  const reprintOfUrl = record.reprintOfUrl == null || record.reprintOfUrl === ""
    ? null
    : assertPublicArticleUrl(requiredString(record.reprintOfUrl, index), index);
  if (syndication !== "reprint" && reprintOfUrl) throw new CorpusError("inconsistent_text", index);
  const originalUrl = assertPublicArticleUrl(requiredString(record.originalUrl, index), index);
  const publishedAt = publishedField(record.publishedAt, index);
  const language = record.language == null || record.language === "" ? "en" : requiredString(record.language, index);
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(language)) throw new CorpusError("invalid_item", index);
  const fixture = record.fixture == null || record.fixture === "" ? null : record.fixture;
  if (fixture !== null && fixture !== "test") throw new CorpusError("invalid_item", index);
  const savedAt = record.savedAt == null || record.savedAt === "" ? nowIso : requiredString(record.savedAt, index);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(savedAt)) throw new CorpusError("invalid_item", index);
  const item: CorpusItem = {
    id: `art_${createHash("sha256").update(originalUrl).digest("hex").slice(0, 12)}`,
    event,
    outlet,
    title,
    publishedAt,
    originalUrl,
    body,
    summary,
    savedAt,
    completeness,
    syndication,
    reprintOfUrl,
    language,
    contentHash: "",
    fixture,
    truncated: (body?.length ?? 0) > EXCERPT_MAX || (completeness === "summary_only" && (summary?.length ?? 0) > EXCERPT_MAX),
  };
  item.contentHash = hashItem(item);
  assertNoSecret(item, secrets, index);
  return item;
}

function hashItem(item: CorpusItem): string {
  const payload = JSON.stringify({
    body: item.body,
    completeness: item.completeness,
    event: item.event,
    originalUrl: item.originalUrl,
    outlet: item.outlet,
    publishedAt: item.publishedAt,
    reprintOfUrl: item.reprintOfUrl,
    summary: item.summary,
    syndication: item.syndication,
    title: item.title,
  });
  return createHash("sha256").update(payload).digest("hex");
}

function assertNoSecret(item: CorpusItem, secrets: Array<string | null | undefined>, index: number): void {
  const raw = JSON.stringify(item);
  if (redactSecrets(raw, secrets) !== raw || /cursor_api_key/i.test(raw)) {
    throw new CorpusError("sensitive_material", index);
  }
}

function textField(value: unknown, max: number, index: number, code: string): string {
  const text = requiredString(value, index).trim();
  if (!text || text.length > max) throw new CorpusError(code, index);
  return text;
}

function optionalText(value: unknown, max: number, index: number): string | null {
  if (value == null || value === "") return null;
  const text = requiredString(value, index);
  if (text.length > max) throw new CorpusError("invalid_item", index);
  return text;
}

function requiredString(value: unknown, index: number): string {
  if (typeof value !== "string") throw new CorpusError("invalid_item", index);
  return value;
}

function completenessOf(value: unknown, index: number): Completeness {
  if (value === "full_text" || value === "summary_only" || value === "title_only") return value;
  throw new CorpusError("invalid_item", index);
}

function syndicationOf(value: unknown, index: number): Syndication {
  if (value == null || value === "") return "unknown";
  if (value === "original" || value === "reprint" || value === "unknown") return value;
  throw new CorpusError("invalid_item", index);
}

function publishedField(value: unknown, index: number): string | null {
  if (value == null || value === "") return null;
  const text = requiredString(value, index);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(text)) return text;
  throw new CorpusError("invalid_item", index);
}
