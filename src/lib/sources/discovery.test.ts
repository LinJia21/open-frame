import assert from "node:assert/strict";
import test from "node:test";
import { NEWS_SOURCES, buildFeedUrl } from "./catalog";
import { createNewsDiscovery, FEED_CACHE_MS, MAX_FEED_BYTES, parseNewsFeed } from "./discovery";
import { handleNewsGet } from "./news-http";

const NOW = Date.parse("2026-11-13T12:00:00Z");
const bbc = NEWS_SOURCES.find((source) => source.id === "bbc")!;
const reuters = NEWS_SOURCES.find((source) => source.id === "reuters")!;
const iso = new Date(NOW).toISOString();
const xml = (items: string) => `<?xml version="1.0"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>TEST FIXTURE</title>${items}</channel></rss>`;
const item = (title = "TEST FIXTURE Iran nuclear report", url = "https://www.bbc.com/news/test-fixture", extra = "") => `<item><title>${title}</title><link>${url}</link><pubDate>Fri, 13 Nov 2026 10:00:00 GMT</pubDate>${extra}</item>`;
const googleItem = (date = "Fri, 13 Nov 2026 10:00:00 GMT", source = "https://www.reuters.com") => `<item><title>TEST FIXTURE Iran nuclear report - Reuters</title><link>https://news.google.com/rss/articles/test-fixture</link><pubDate>${date}</pubDate><source url="${source}">Reuters</source></item>`;
const reply = (body: string) => new Response(body, { headers: { "content-type": "application/rss+xml" } });

// All network responses in this file are synthetic and never saved to the corpus.
test("the fixed pool contains 16 media, one investigation source and three institutions", () => {
  assert.equal(NEWS_SOURCES.length, 20);
  assert.equal(new Set(NEWS_SOURCES.map((source) => source.id)).size, 20);
  assert.equal(NEWS_SOURCES.filter((source) => source.kind === "media").length, 16);
  assert.equal(NEWS_SOURCES.filter((source) => source.kind === "investigative").length, 1);
  assert.equal(NEWS_SOURCES.filter((source) => source.kind === "institution").length, 3);
  assert.equal(NEWS_SOURCES.filter((source) => source.access === "official_rss").length, 12);
  assert.equal(NEWS_SOURCES.filter((source) => source.access === "google_rss").length, 8);
  assert.ok(NEWS_SOURCES.every((source) => buildFeedUrl(source, "").startsWith("https://")));
});

test("Google queries retain the fixed domain and quote keyword operators", () => {
  const url = new URL(buildFeedUrl(reuters, 'Iran OR site:evil.com & nuclear'));
  assert.equal(url.hostname, "news.google.com");
  assert.equal(url.searchParams.get("q"), 'site:reuters.com "Iran" "OR" "site" "evil" "com" "nuclear" when:3d');
  assert.equal(url.searchParams.get("ceid"), "US:en");
  assert.equal(buildFeedUrl(bbc, "Iran"), bbc.feedUrl);
});

test("RSS metadata keeps byline hints, strips tracking duplicates, and never becomes evidence", async () => {
  const feed = await parseNewsFeed(xml(item("TEST FIXTURE &amp; report", "https://www.bbc.com/news/test-fixture?utm_source=rss", "<dc:creator>Reporter / Reuters</dc:creator><description>DO NOT SEND THIS TO AI</description>") + item()), bbc, iso);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].title, "TEST FIXTURE & report");
  assert.equal(feed.items[0].attributionHint, "Reuters");
  assert.equal(feed.items[0].syndication, "unknown");
  assert.equal(feed.items[0].verificationStatus, "unverified");
  assert.equal(feed.items[0].aiInputAllowed, false);
  assert.equal(feed.items[0].url, "https://www.bbc.com/news/test-fixture");
  assert.ok(!JSON.stringify(feed).includes("DO NOT SEND"));
});

test("Atom is supported without inventing an absent date", async () => {
  const feed = await parseNewsFeed('<feed xmlns="http://www.w3.org/2005/Atom"><title>TEST FIXTURE</title><entry><title>TEST FIXTURE entry</title><link href="https://www.bbc.com/news/atom-fixture"/><author><name>Test author</name></author></entry></feed>', bbc, iso);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].byline, "Test author");
  assert.equal(feed.items[0].publishedAt, null);
});

test("unsafe and unrelated article links are discarded without visiting them", async () => {
  const bad = ["", "   ", "javascript:alert(1)", "https://localhost/a", "https://127.0.0.1/a", "https://bbc.com.evil.org/a", "https://user:pass@bbc.com/a", "https://bbc.com:8443/a", "http://evil.org/a"];
  const feed = await parseNewsFeed(xml(bad.map((url) => item("TEST FIXTURE", url)).join("")), bbc, iso);
  assert.equal(feed.items.length, 0);
  assert.equal(feed.skippedItems, bad.length);
});

test("legacy publisher permalinks are upgraded without fetching article bodies", async () => {
  const source = NEWS_SOURCES.find((entry) => entry.id === "iaea")!;
  const feed = await parseNewsFeed(xml(item("TEST FIXTURE", "http://www.iaea.org/newscenter/test-fixture").replace(/<pubDate>.*?<\/pubDate>/, "<pubDate>26-11-12  13:44</pubDate>")), source, iso);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].url, "https://www.iaea.org/newscenter/test-fixture");
  assert.equal(feed.items[0].publishedAt, null);
  const relative = await parseNewsFeed(xml(item("TEST FIXTURE", "/newscenter/relative-fixture")), source, iso);
  assert.equal(relative.items[0].url, "https://www.iaea.org/newscenter/relative-fixture");
});

test("Google preserves the unresolved link and verifies publisher metadata", async () => {
  const feed = await parseNewsFeed(xml(googleItem()), reuters, iso);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.items[0].urlKind, "google_redirect");
  assert.equal(feed.items[0].publisher, reuters.name);
  const mismatch = await parseNewsFeed(xml(googleItem(undefined, "https://reuters.com.evil.org")), reuters, iso);
  assert.equal(mismatch.items.length, 0);
  const missing = await parseNewsFeed(xml(item("TEST FIXTURE", "https://news.google.com/rss/articles/test-fixture")), reuters, iso);
  assert.equal(missing.items.length, 0);
});

test("rejects malformed XML, HTML, DTD entities and oversized XML", async () => {
  for (const body of ["<rss>", "<html><body>not RSS</body></html>", '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + xml(item())]) {
    await assert.rejects(parseNewsFeed(body, bbc, iso), /invalid_feed/);
  }
  await assert.rejects(parseNewsFeed("x".repeat(MAX_FEED_BYTES + 1), bbc, iso), /oversized/);
});

test("official feeds are cached across keywords, inflight calls coalesce, and expired entries refresh", async () => {
  let calls = 0;
  let now = NOW;
  const discovery = createNewsDiscovery({ now: () => now, fetch: async () => { calls += 1; return reply(xml(item())); } });
  const [first, second] = await Promise.all([discovery.search("Iran", ["bbc"]), discovery.search("nuclear", ["bbc"])]);
  assert.equal(calls, 1);
  assert.equal(first.items.length, 1);
  assert.equal(second.items.length, 1);
  const empty = await discovery.search("zzzzzz", ["bbc"]);
  assert.equal(empty.items.length, 0);
  assert.equal(empty.reports[0].status, "empty");
  assert.equal(empty.reports[0].cached, true);
  now += FEED_CACHE_MS + 1;
  await discovery.search("Iran", ["bbc"]);
  assert.equal(calls, 2);
});

test("one upstream failure does not replace or block successful sources", async () => {
  let calls = 0;
  const discovery = createNewsDiscovery({ now: () => NOW, fetch: async (url, options) => {
    calls += 1;
    assert.equal(options?.redirect, "manual");
    return String(url).includes("bbci") ? reply(xml(item())) : new Response("failed", { status: 429 });
  } });
  const result = await discovery.search("Iran", ["bbc", "npr"]);
  assert.equal(result.status, "partial");
  assert.equal(result.items.length, 1);
  assert.equal(result.reports[1].httpStatus, 429);
  assert.equal(result.reports[1].status, "http_error");
  const again = await discovery.search("", ["npr"]);
  assert.equal(again.status, "unavailable");
  assert.equal(again.reports[0].cached, true);
  assert.equal(calls, 2);
});

test("redirects stay within trusted HTTPS domains; no unsafe redirect is requested", async () => {
  for (const target of ["https://127.0.0.1/private", "http://feeds.bbci.co.uk/rss", "https://evil.org/rss", "https://bbc.com:8443/rss"]) {
    let calls = 0;
    const discovery = createNewsDiscovery({ fetch: async () => { calls += 1; return new Response(null, { status: 302, headers: { location: target } }); } });
    const result = await discovery.search("", ["bbc"]);
    assert.equal(calls, 1);
    assert.equal(result.reports[0].status, "unsafe_redirect");
  }
  let calls = 0;
  const discovery = createNewsDiscovery({ fetch: async () => {
    calls += 1;
    return calls === 1 ? new Response(null, { status: 301, headers: { location: "/rss/home/international" } }) : reply(xml(item("TEST FIXTURE", "https://www.ft.com/content/test-fixture")));
  } });
  assert.equal((await discovery.search("", ["ft"])).items.length, 1);
  assert.equal(calls, 2);
});

test("timeouts, byte limits and corrupt feeds are isolated source statuses", async () => {
  const timeout = createNewsDiscovery({ timeoutMs: 5, fetch: async (_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener("abort", () => reject(new Error("abort")), { once: true });
  }) });
  assert.equal((await timeout.search("", ["bbc"])).reports[0].status, "timeout");
  for (const response of [new Response("small", { headers: { "content-length": String(MAX_FEED_BYTES + 1) } }), new Response("x".repeat(MAX_FEED_BYTES + 1))]) {
    const discovery = createNewsDiscovery({ fetch: async () => response });
    assert.equal((await discovery.search("", ["bbc"])).reports[0].status, "oversized");
  }
  const broken = createNewsDiscovery({ fetch: async () => reply("not xml") });
  assert.equal((await broken.search("", ["bbc"])).reports[0].status, "invalid_feed");
});

test("all twenty sources share a four-request concurrency limit", async () => {
  let active = 0;
  let peak = 0;
  const discovery = createNewsDiscovery({ fetch: async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return reply(xml(""));
  } });
  const result = await discovery.search("", NEWS_SOURCES.map((source) => source.id));
  assert.equal(result.reports.length, 20);
  assert.equal(result.status, "complete");
  assert.equal(peak, 4);
});

test("Google dated results older than three days are excluded, unknown dates stay unknown", async () => {
  const old = createNewsDiscovery({ now: () => NOW, fetch: async () => reply(xml(googleItem("Thu, 22 Jun 2006 10:00:00 GMT"))) });
  const result = await old.search("Iran", ["reuters"]);
  assert.equal(result.items.length, 0);
  assert.equal(result.reports[0].skippedItems, 1);
  const unknown = createNewsDiscovery({ now: () => NOW, fetch: async () => reply(xml(googleItem().replace(/<pubDate>.*?<\/pubDate>/, ""))) });
  assert.equal((await unknown.search("Iran", ["reuters"])).items[0].publishedAt, null);
});

test("matching headlines are only possible duplicates, never independent confirmations", async () => {
  const discovery = createNewsDiscovery({ now: () => NOW, fetch: async (url) => reply(xml(String(url).includes("google") ? googleItem() : item())) });
  const result = await discovery.search("Iran", ["bbc", "reuters"]);
  assert.equal(result.items.length, 2);
  assert.ok(result.items[0].possibleDuplicateGroup);
  assert.equal(result.items[0].possibleDuplicateGroup, result.items[1].possibleDuplicateGroup);
  assert.ok(result.items.every((lead) => lead.syndication === "unknown" && lead.verificationStatus === "unverified" && !lead.aiInputAllowed));
});

test("HTTP rejects invalid input and cross-site use before network, and applies a global rate limit", async () => {
  let calls = 0;
  const discovery = createNewsDiscovery({ fetch: async () => { calls += 1; return reply(xml(item())); } });
  for (const query of ["sources=unknown", "sources=", "q=" + "x".repeat(201), "q=%00", "sources=http://localhost"]) {
    const response = await handleNewsGet(new Request(`http://localhost/api/news?${query}`), { discovery, allowRequest: () => true });
    assert.equal(response.status, 400);
  }
  assert.equal((await handleNewsGet(new Request("http://localhost/api/news", { headers: { "sec-fetch-site": "cross-site" } }), { discovery, allowRequest: () => true })).status, 403);
  const limited = await handleNewsGet(new Request("http://localhost/api/news"), { discovery, allowRequest: (key) => { assert.equal(key, "news:global"); return false; } });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "60");
  assert.equal(calls, 0);
  const ok = await handleNewsGet(new Request("http://localhost/api/news?sources=bbc,bbc&q=Iran"), { discovery, allowRequest: () => true });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("Cache-Control"), "no-store");
  const payload = await ok.json();
  assert.equal(payload.data.reports.length, 1);
  assert.equal(payload.data.mode, "rss_discovery");
  assert.equal(payload.data.aiInputAllowed, false);
  assert.equal(calls, 1);
});
