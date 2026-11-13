import { promises as fs } from "node:fs";
import path from "node:path";
import { librarySnapshot, normalizeImport, prepareSelection } from "@/lib/corpus/materials";
import { CorpusError, type CorpusItem, type LibrarySnapshot, type ResolvedSelection } from "@/lib/corpus/types";

interface StoreFile {
  version: 1;
  items: CorpusItem[];
}

export interface ImportResult {
  created: number;
  updated: number;
  items: CorpusItem[];
  library: LibrarySnapshot;
}

export interface SearchResult {
  mode: "saved_history";
  liveInternetSearch: false;
  listedAll: boolean;
  library: LibrarySnapshot;
  hits: { itemCount: number; outletCount: number };
  items: CorpusItem[];
}

export interface CorpusStore {
  importItems(input: unknown, nowIso: string, secrets?: Array<string | null | undefined>): Promise<ImportResult>;
  search(query: string, event: string): Promise<SearchResult>;
  resolve(ids: string[]): Promise<ResolvedSelection>;
}

/** JSON file of imported reports. Creating the store does not create sample news. */
export function createCorpusStore(storePath: string): CorpusStore {
  let chain: Promise<void> = Promise.resolve();

  function withLock<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task, task);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function readItems(): Promise<CorpusItem[]> {
    try {
      const parsed: unknown = JSON.parse(await fs.readFile(storePath, "utf8"));
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { items?: unknown }).items)) {
        throw new CorpusError("store_failed");
      }
      const items = (parsed as StoreFile).items;
      if (!items.every(isStoredItem)) throw new CorpusError("store_failed");
      return items;
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT") return [];
      if (error instanceof CorpusError) throw error;
      throw new CorpusError("store_failed");
    }
  }

  async function writeItems(items: CorpusItem[]): Promise<void> {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    const temporary = `${storePath}.tmp`;
    await fs.writeFile(temporary, JSON.stringify({ version: 1, items }));
    await fs.rename(temporary, storePath);
  }

  return {
    importItems(input, nowIso, secrets = []) {
      return withLock(async () => {
        const incoming = normalizeImport(input, nowIso, secrets);
        const current = await readItems();
        const byUrl = new Map(current.map((item) => [item.originalUrl, item]));
        let created = 0;
        let updated = 0;
        for (const item of incoming) {
          if (byUrl.has(item.originalUrl)) updated += 1;
          else created += 1;
          byUrl.set(item.originalUrl, item);
        }
        const items = [...byUrl.values()];
        if (items.length > 200) throw new CorpusError("library_full");
        await writeItems(items);
        return { created, updated, items: incoming, library: librarySnapshot(items) };
      });
    },

    search(query, event) {
      return withLock(async () => {
        const items = await readItems();
        const needle = query.trim().toLowerCase();
        const eventNeedle = event.trim().toLowerCase();
        const hits = items.filter((item) => {
          if (eventNeedle && !item.event.toLowerCase().includes(eventNeedle)) return false;
          if (!needle) return true;
          const haystack = [item.event, item.outlet, item.title, item.summary ?? "", item.body ?? ""].join("\n").toLowerCase();
          return haystack.includes(needle);
        });
        return {
          mode: "saved_history",
          liveInternetSearch: false,
          listedAll: needle.length === 0 && eventNeedle.length === 0,
          library: librarySnapshot(items),
          hits: {
            itemCount: hits.length,
            outletCount: new Set(hits.map((item) => item.outlet)).size,
          },
          items: hits,
        };
      });
    },

    resolve(ids) {
      return withLock(async () => prepareSelection(await readItems(), ids));
    },
  };
}

function isStoredItem(value: unknown): value is CorpusItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<CorpusItem>;
  return typeof item.id === "string"
    && typeof item.event === "string"
    && typeof item.outlet === "string"
    && typeof item.title === "string"
    && typeof item.originalUrl === "string"
    && typeof item.savedAt === "string"
    && typeof item.language === "string"
    && typeof item.contentHash === "string"
    && typeof item.truncated === "boolean"
    && (item.publishedAt === null || typeof item.publishedAt === "string")
    && (item.body === null || typeof item.body === "string")
    && (item.summary === null || typeof item.summary === "string")
    && (item.reprintOfUrl === null || typeof item.reprintOfUrl === "string")
    && (item.completeness === "full_text" || item.completeness === "summary_only" || item.completeness === "title_only")
    && (item.syndication === "original" || item.syndication === "reprint" || item.syndication === "unknown")
    && (item.fixture === null || item.fixture === "test");
}
