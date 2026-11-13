/** A saved report. `fixture: "test"` is a labeled test record, not a real historical article. */
export type Completeness = "full_text" | "summary_only" | "title_only";
export type Syndication = "original" | "reprint" | "unknown";

export interface CorpusItem {
  id: string;
  event: string;
  outlet: string;
  title: string;
  publishedAt: string | null;
  originalUrl: string;
  body: string | null;
  summary: string | null;
  savedAt: string;
  completeness: Completeness;
  syndication: Syndication;
  reprintOfUrl: string | null;
  language: string;
  contentHash: string;
  fixture: "test" | null;
  truncated: boolean;
}

/** The slice actually handed to analysis. Excerpt is never longer than the schema allows. */
export interface SavedMaterial {
  id: string;
  event: string;
  outlet: string;
  title: string;
  publishedAt: string | null;
  originalUrl: string;
  summary: string;
  excerpt: string | null;
  completeness: Completeness;
  syndication: Syndication;
  reprintOfUrl: string | null;
  savedAt: string;
  language: string;
  contentHash: string;
  fixture: "test" | null;
  truncated: boolean;
  independenceGroupId: string;
  syndicatedFrom: string | null;
  sharedOriginalUrl: string | null;
  sharedOriginalGroupId: string | null;
  dedupNote: string | null;
}

export interface LibrarySnapshot {
  itemCount: number;
  outletCount: number;
  cutoff: string | null;
}

export interface ResolvedSelection {
  items: SavedMaterial[];
  library: LibrarySnapshot;
}

export class CorpusError extends Error {
  readonly code: string;
  readonly index: number | null;

  constructor(code: string, index: number | null = null) {
    super(code);
    this.name = "CorpusError";
    this.code = code;
    this.index = index;
  }
}
