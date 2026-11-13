import { NEWS_SOURCES } from "@/lib/sources/catalog";

export const SUBSCRIPTION_STORAGE_KEY = "openframe_source_subscriptions";

export function defaultSourceIds(): string[] {
  return NEWS_SOURCES.map((source) => source.id);
}

export function normalizeSourceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return defaultSourceIds();
  const known = new Set(NEWS_SOURCES.map((source) => source.id));
  const ids = value.filter((item): item is string => typeof item === "string" && known.has(item));
  return [...new Set(ids)];
}

export function readSourceIds(storage: Pick<Storage, "getItem"> | null): string[] {
  if (!storage) return defaultSourceIds();
  return parseSourceSnapshot(storage.getItem(SUBSCRIPTION_STORAGE_KEY));
}

export function parseSourceSnapshot(raw: string | null): string[] {
  if (raw === null) return defaultSourceIds();
  try {
    return normalizeSourceIds(JSON.parse(raw));
  } catch {
    return defaultSourceIds();
  }
}

export function writeSourceIds(storage: Pick<Storage, "setItem"> | null, ids: string[]) {
  if (!storage) return;
  storage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(normalizeSourceIds(ids)));
}
