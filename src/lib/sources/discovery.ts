import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { NEWS_SOURCES, buildFeedUrl, type NewsSource } from "./catalog";
import type { NewsDiscoveryResult, NewsLead, SourceReport, SourceStatus } from "./types";

export const MAX_FEED_BYTES = 2_000_000;
export const FEED_CACHE_MS = 15 * 60_000;
const MAX_CACHE_ENTRIES = 100;
const MAX_ITEMS_PER_SOURCE = 20;
const MAX_CONCURRENT = 4;
const MAX_QUEUED = 40;

interface FeedItem extends Parser.Item {
  author?: unknown;
  source?: Array<{ $?: { url?: unknown } }>;
  rawPubDate?: unknown;
  rawPublished?: unknown;
  rawUpdated?: unknown;
  rawDcDate?: unknown;
}

interface FeedResult {
  items: NewsLead[];
  report: SourceReport;
}

class FeedError extends Error {
  constructor(readonly status: SourceStatus, readonly httpStatus: number | null = null) {
    super(status);
  }
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function publisherHost(source: NewsSource, host: string): boolean {
  return matchesDomain(host, source.domain) || (source.id === "bbc" && matchesDomain(host, "bbc.co.uk"));
}

function safeUrl(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || url.port || raw.includes("\\")) {
    throw new Error("unsafe_url");
  }
  return url;
}

function assertFeedUrl(raw: string, source: NewsSource): string {
  try {
    const url = safeUrl(raw);
    const initialHost = new URL(buildFeedUrl(source, "")).hostname;
    if (url.hostname !== initialHost && (source.access === "google_rss" || !publisherHost(source, url.hostname))) {
      throw new Error("unexpected_host");
    }
    return url.toString();
  } catch {
    throw new FeedError("unsafe_redirect");
  }
}

function articleUrl(raw: unknown, source: NewsSource): { url: string; urlKind: NewsLead["urlKind"] } | null {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 4096 || raw.includes("\\")) return null;
  try {
    const candidate = new URL(raw, buildFeedUrl(source, ""));
    // IAEA's HTTPS feed still emits HTTP permalinks; only upgrade known publisher links.
    if (candidate.protocol === "http:" && publisherHost(source, candidate.hostname)) candidate.protocol = "https:";
    const url = safeUrl(candidate.toString());
    const google = source.access === "google_rss" && url.hostname === "news.google.com" && /^\/(rss\/)?articles\//.test(url.pathname);
    if (!google && !publisherHost(source, url.hostname)) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
    }
    return { url: url.toString(), urlKind: google ? "google_redirect" : "publisher" };
  } catch {
    return null;
  }
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > max) return null;
  return value.trim();
}

export async function parseNewsFeed(xml: string, source: NewsSource, fetchedAt: string): Promise<{ items: NewsLead[]; skippedItems: number }> {
  if (Buffer.byteLength(xml) > MAX_FEED_BYTES) throw new FeedError("oversized");
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml)) throw new FeedError("invalid_feed");
  let feed: Parser.Output<FeedItem>;
  try {
    const parser = new Parser<Record<string, unknown>, FeedItem>({
      xml2js: {
        // Avoid rss-parser's HTML snippet cleaning entirely; only metadata is needed.
        tagNameProcessors: [(name: string) => ["description", "content:encoded", "content", "summary"].includes(name) ? "_ignored_content" : name],
      },
      customFields: { item: [
        ["source", "source", { keepArray: true }],
        ["pubDate", "rawPubDate"], ["published", "rawPublished"],
        ["updated", "rawUpdated"], ["dc:date", "rawDcDate"],
      ] },
    });
    feed = await parser.parseString(xml);
  } catch {
    throw new FeedError("invalid_feed");
  }
  const items: NewsLead[] = [];
  const seen = new Set<string>();
  let skippedItems = 0;
  for (const item of feed.items.slice(0, 200)) {
    const title = text(item.title, 1000);
    const link = articleUrl(item.link, source);
    let correctPublisher = true;
    if (source.access === "google_rss") {
      try {
        const origin = item.source?.[0]?.$?.url;
        correctPublisher = typeof origin === "string" && publisherHost(source, safeUrl(origin).hostname);
      } catch {
        correctPublisher = false;
      }
    }
    if (!title || !link || !correctPublisher) {
      skippedItems += 1;
      continue;
    }
    if (seen.has(link.url)) continue;
    seen.add(link.url);
    const byline = text(item.creator, 500) ?? text(item.author, 500);
    const attributionHint = byline?.match(/\b(Reuters|Associated Press|AP|AFP|Agence France-Presse)\b/i)?.[0] ?? null;
    const dateValue = text(item.rawPubDate ?? item.rawPublished ?? item.rawUpdated ?? item.rawDcDate, 100);
    const date = dateValue && /(?:Z|[+-]\d{2}:?\d{2}|\b(?:GMT|UTC|UT|[ECMP][SD]T))$/i.test(dateValue) ? Date.parse(dateValue) : NaN;
    items.push({
      id: `lead_${hash(`${source.id}:${link.url}`)}`,
      sourceId: source.id,
      publisher: source.name,
      title,
      ...link,
      publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null,
      fetchedAt,
      byline,
      attributionHint,
      syndication: "unknown",
      possibleDuplicateGroup: null,
      verificationStatus: "unverified",
      aiInputAllowed: false,
    });
  }
  return { items, skippedItems: skippedItems + Math.max(0, feed.items.length - 200) };
}

async function readFeed(response: Response): Promise<string> {
  if (Number(response.headers.get("content-length")) > MAX_FEED_BYTES) {
    await response.body?.cancel();
    throw new FeedError("oversized");
  }
  if (!response.body) throw new FeedError("invalid_feed");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new FeedError("oversized");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    throw new FeedError("invalid_feed");
  }
}

export function createNewsDiscovery(deps: { fetch?: typeof fetch; now?: () => number; timeoutMs?: number } = {}) {
  const transport = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const cache = new Map<string, { expiresAt: number; result: FeedResult }>();
  const pending = new Map<string, Promise<FeedResult>>();
  const queue: Array<() => void> = [];
  let active = 0;

  async function fetchFeed(source: NewsSource, initialUrl: string): Promise<FeedResult> {
    const controller = new AbortController();
    const timeoutMs = deps.timeoutMs ?? 8_000;
    const deadline = performance.now() + timeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const fetchedAt = new Date(now()).toISOString();
    let acquired = false;
    try {
      if (active >= MAX_CONCURRENT) {
        if (queue.length >= MAX_QUEUED) throw new FeedError("busy");
        await new Promise<void>((resolve, reject) => {
          const start = () => {
            controller.signal.removeEventListener("abort", cancel);
            resolve();
          };
          const cancel = () => {
            const index = queue.indexOf(start);
            if (index !== -1) queue.splice(index, 1);
            reject(new FeedError("timeout"));
          };
          controller.signal.addEventListener("abort", cancel, { once: true });
          queue.push(start);
        });
      } else active += 1;
      acquired = true;
      let url = initialUrl;
      for (let redirects = 0; redirects <= 3; redirects += 1) {
        url = assertFeedUrl(url, source);
        const response = await transport(url, {
          signal: controller.signal,
          redirect: "manual",
          cache: "no-store",
          headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "SpectraX-RSS-Discovery/1.0" },
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location || redirects === 3) throw new FeedError("unsafe_redirect");
          try {
            url = assertFeedUrl(new URL(location, url).toString(), source);
          } catch {
            throw new FeedError("unsafe_redirect");
          }
          continue;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new FeedError("http_error", response.status);
        }
        const parsed = await parseNewsFeed(await readFeed(response), source, fetchedAt);
        if (controller.signal.aborted || performance.now() >= deadline) throw new FeedError("timeout");
        return {
          items: parsed.items,
          report: { sourceId: source.id, status: parsed.items.length ? "ok" : "empty", fetchedAt, cached: false, itemCount: parsed.items.length, skippedItems: parsed.skippedItems, httpStatus: response.status },
        };
      }
      throw new FeedError("unsafe_redirect");
    } catch (error) {
      return {
        items: [],
        report: {
          sourceId: source.id,
          status: controller.signal.aborted ? "timeout" : error instanceof FeedError ? error.status : "network_error",
          fetchedAt, cached: false, itemCount: 0, skippedItems: 0,
          httpStatus: error instanceof FeedError ? error.httpStatus : null,
        },
      };
    } finally {
      clearTimeout(timer);
      if (acquired) {
        const next = queue.shift();
        if (next) next();
        else active -= 1;
      }
    }
  }

  async function load(source: NewsSource, query: string): Promise<FeedResult> {
    const url = buildFeedUrl(source, query);
    const saved = cache.get(url);
    if (saved && saved.expiresAt > now()) return { ...saved.result, report: { ...saved.result.report, cached: true } };
    const inflight = pending.get(url);
    if (inflight) return inflight;
    const request = fetchFeed(source, url).then((result) => {
      for (const [key, value] of cache) if (value.expiresAt <= now()) cache.delete(key);
      if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
      if (result.report.status !== "busy") cache.set(url, { expiresAt: now() + FEED_CACHE_MS, result });
      return result;
    }).finally(() => pending.delete(url));
    pending.set(url, request);
    return request;
  }

  return {
    async search(query: string, sourceIds: string[]): Promise<NewsDiscoveryResult> {
      const sources = NEWS_SOURCES.filter((source) => sourceIds.includes(source.id));
      const results = await Promise.all(sources.map((source) => load(source, query)));
      const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
      const items: NewsLead[] = [];
      const reports = results.map((result, index) => {
        const source = sources[index];
        const outdated = (item: NewsLead) => source.access === "google_rss" && item.publishedAt !== null && Date.parse(item.publishedAt) < now() - 3 * 24 * 60 * 60_000;
        const matches = result.items.filter((item) => !outdated(item) && (source.access === "google_rss" || words.every((word) => item.title.toLocaleLowerCase().includes(word)))).slice(0, MAX_ITEMS_PER_SOURCE);
        items.push(...matches.map((item) => ({ ...item })));
        return { ...result.report, itemCount: matches.length, skippedItems: result.report.skippedItems + result.items.filter(outdated).length, status: result.report.status === "ok" && matches.length === 0 ? "empty" as const : result.report.status };
      });
      const titleGroups = new Map<string, NewsLead[]>();
      for (const item of items) {
        const key = item.title.replace(/\s[-–—]\s[^–—-]+$/, "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        if (key.length < 16) continue;
        titleGroups.set(key, [...(titleGroups.get(key) ?? []), item]);
      }
      for (const [key, group] of titleGroups) {
        if (group.length > 1) for (const item of group) item.possibleDuplicateGroup = `possible_${hash(key)}`;
      }
      items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
      const failed = reports.filter((report) => report.status !== "ok" && report.status !== "empty").length;
      return {
        mode: "rss_discovery", query,
        status: failed === reports.length ? "unavailable" : failed > 0 ? "partial" : "complete",
        checkedAt: new Date(now()).toISOString(), items, reports, aiInputAllowed: false,
        warnings: [
          "仅发现线索：标题和链接不是事实核验结果，不抓取正文、不自动导入、不发送给 AI。使用许可仍需逐源确认。",
          "官方 RSS 仅在本次返回的标题中匹配全部关键词，并非全文或历史检索；Google RSS 查询最近 3 天，并过滤明确早于 3 天的条目，日期未知仍标未知。每源最多展示 20 条，收录不保证完整。",
          "转载关系默认未知；相同标题只标记疑似同稿，不代表独立证据。署名线索不证明转载，官方声明也不等于声明内容已证实。",
          ...(sources.some((source) => source.access === "google_rss") ? ["Google RSS 声明仅限个人非商业阅读器用途；当前连接不构成公开产品再利用授权。"] : []),
          ...(sourceIds.includes("npr") ? ["NPR RSS 声明仅限个人使用；公开产品使用需另行确认授权。"] : []),
          ...(failed ? [`${failed} 个来源未能获取，缺口未用演示数据补齐。除队列已满外，失败状态也缓存 15 分钟，不自动重试。`] : []),
        ],
      };
    },
  };
}
