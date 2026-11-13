export type SourceStatus = "ok" | "empty" | "timeout" | "http_error" | "invalid_feed" | "unsafe_redirect" | "oversized" | "network_error" | "busy";

export interface NewsLead {
  id: string;
  sourceId: string;
  publisher: string;
  title: string;
  url: string;
  urlKind: "publisher" | "google_redirect";
  publishedAt: string | null;
  fetchedAt: string;
  byline: string | null;
  attributionHint: string | null;
  syndication: "unknown";
  possibleDuplicateGroup: string | null;
  verificationStatus: "unverified";
  aiInputAllowed: false;
}

export interface SourceReport {
  sourceId: string;
  status: SourceStatus;
  fetchedAt: string;
  cached: boolean;
  itemCount: number;
  skippedItems: number;
  httpStatus: number | null;
}

export interface NewsDiscoveryResult {
  mode: "rss_discovery";
  query: string;
  status: "complete" | "partial" | "unavailable";
  checkedAt: string;
  items: NewsLead[];
  reports: SourceReport[];
  warnings: string[];
  aiInputAllowed: false;
}
