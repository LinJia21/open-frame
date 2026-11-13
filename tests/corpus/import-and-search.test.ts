import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MAX_CORPUS_BYTES, handleCorpusGet, handleCorpusImport } from "@/lib/corpus/corpus-http";
import { normalizeImport, prepareSelection } from "@/lib/corpus/materials";
import { createCorpusStore, type CorpusStore } from "@/lib/corpus/store";
import { CorpusError } from "@/lib/corpus/types";
import { assertPublicArticleUrl } from "@/lib/corpus/url";

const NOW = "2026-11-13T04:00:00.000Z";
const LATER = "2026-11-13T05:00:00.000Z";
const HOST = "https://www.fixture-outlet.org";
const SECRET = "unit-test-secret";
const PUBLIC_KEYS = [
  "id",
  "event",
  "outlet",
  "title",
  "publishedAt",
  "originalUrl",
  "savedAt",
  "completeness",
  "syndication",
  "reprintOfUrl",
  "fixture",
  "truncated",
  "hasBody",
  "hasSummary",
  "preview",
].sort();

test("import saves text without returning it, restarts from the same file, and search counts outlets apart from the library", async () => {
  const { store, dir } = await tempStore();
  try {
    const body = `${"A".repeat(180)}TAIL_MARKER`;
    const imported = await handleCorpusImport(post({
      items: [{
        event: "  weekday-ferries  ",
        outlet: "Desk North",
        title: "Harbor note",
        publishedAt: " 2024-01-15 ",
        originalUrl: " HTTPS://WWW.Fixture-Outlet.org/harbor/ ",
        body,
        summary: `${"S".repeat(200)}`,
        completeness: " full_text ",
        syndication: " original ",
        language: " zh-Hans ",
        fixture: " test ",
        country: "this field is ignored",
      }],
    }), deps(store));
    assert.equal(imported.status, 201);
    const payload = await readOk(imported);
    assert.deepEqual(Object.keys(payload).sort(), ["data", "ok", "warnings"]);
    assert.deepEqual(payload.warnings, ["Imported text was saved. No URL was fetched. The real library starts empty until you import."]);
    assert.equal(payload.data.created, 1);
    assert.equal(payload.data.updated, 0);
    assert.deepEqual(payload.data.library, { itemCount: 1, outletCount: 1, cutoff: NOW });
    const row = payload.data.items[0];
    assert.ok(row);
    assert.deepEqual(Object.keys(row).sort(), PUBLIC_KEYS);
    assert.equal(row.originalUrl, `${HOST}/harbor`);
    assert.equal(row.id, expectedId(`${HOST}/harbor`));
    assert.equal(row.event, "weekday-ferries");
    assert.equal(row.publishedAt, "2024-01-15");
    assert.equal(row.fixture, "test");
    assert.equal(row.hasBody, true);
    assert.equal(row.hasSummary, true);
    assert.equal(row.preview, "S".repeat(180));
    assert.equal(JSON.stringify(payload).includes("TAIL_MARKER"), false);
    assert.equal(JSON.stringify(payload).includes("country"), false);
    const stored = JSON.parse(await readFile(path.join(dir, "items.json"), "utf8")) as { items: Array<Record<string, unknown>> };
    assert.equal(stored.items[0]?.body, body);
    assert.equal("country" in (stored.items[0] ?? {}), false);

    const restarted = createCorpusStore(path.join(dir, "items.json"));
    await restarted.importItems(batch([note({
      originalUrl: `${HOST}/south`,
      outlet: "Desk South",
      title: "South note",
      summary: "The south desk kept a different sentence.",
    })]), NOW);
    const listed = await handleCorpusGet(new Request("http://local/api/corpus"), deps(restarted));
    const listedBody = await readOk(listed);
    assert.equal(listed.status, 200);
    assert.equal(listedBody.data.mode, "saved_history");
    assert.equal(listedBody.data.liveInternetSearch, false);
    assert.equal(listedBody.data.listedAll, true);
    assert.deepEqual(listedBody.data.library, { itemCount: 2, outletCount: 2, cutoff: NOW });
    assert.deepEqual(listedBody.data.hits, { itemCount: 2, outletCount: 2 });
    assert.deepEqual(listedBody.warnings, ["Saved-history search only. This did not search the live internet."]);

    const harbor = await handleCorpusGet(new Request("http://local/api/corpus?q=HARBOR&event=Weekday"), deps(restarted));
    const harborBody = await readOk(harbor);
    assert.equal(harborBody.data.listedAll, false);
    assert.equal(harborBody.data.hits.itemCount, 1);
    assert.equal(harborBody.data.hits.outletCount, 1);
    assert.equal(harborBody.data.library.outletCount, 2);
    assert.equal(harborBody.data.items[0]?.outlet, "Desk North");

    const missedOutlet = await handleCorpusGet(new Request("http://local/api/corpus?event=Desk%20North"), deps(restarted));
    const missedBody = await readOk(missedOutlet);
    assert.equal(missedBody.data.hits.itemCount, 0);
    assert.equal(missedBody.data.hits.outletCount, 0);
    assert.equal(missedBody.data.library.itemCount, 2);

    const literal = await handleCorpusGet(new Request("http://local/api/corpus?q=.*"), deps(restarted));
    assert.equal((await readOk(literal)).data.hits.itemCount, 0);
    const spaces = await handleCorpusGet(new Request(`http://local/api/corpus?q=${encodeURIComponent(" ".repeat(201))}`), deps(restarted));
    const spacesBody = await readOk(spaces);
    assert.equal(spaces.status, 200);
    assert.equal(spacesBody.data.listedAll, true);
    assert.equal(spacesBody.data.hits.itemCount, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the same canonical URL updates one row, changes the hash only when the text changes, and keeps the id", async () => {
  const { store, dir } = await tempStore();
  try {
    const cutoff = await store.importItems(batch([
      note({ originalUrl: `${HOST}/early-instant`, savedAt: "2026-11-13T04:00:00Z", summary: "Earlier instant." }),
      note({ originalUrl: `${HOST}/late-instant`, savedAt: "2026-11-13T04:00:00.100Z", summary: "Later instant." }),
    ]), NOW);
    assert.equal(cutoff.library.cutoff, "2026-11-13T04:00:00.100Z");
    assert.equal(cutoff.library.itemCount, 2);
    const first = await store.importItems(batch([note({
      originalUrl: "https://WWW.Fixture-Outlet.org/harbor/",
      body: "The first saved sentence.",
      summary: "First summary.",
      completeness: "full_text",
    })]), NOW);
    const second = await store.importItems(batch([note({
      originalUrl: `${HOST}/harbor#fragment`,
      body: "The first saved sentence.",
      summary: "First summary.",
      completeness: "full_text",
      savedAt: LATER,
    })]), LATER);
    assert.equal(second.created, 0);
    assert.equal(second.updated, 1);
    assert.equal(second.library.itemCount, 3);
    assert.equal(second.items[0]?.id, first.items[0]?.id);
    assert.equal(second.items[0]?.contentHash, first.items[0]?.contentHash);
    assert.equal(second.library.cutoff, LATER);

    const changed = await store.importItems(batch([note({
      originalUrl: `${HOST}/harbor`,
      body: "The sentence was revised in the library.",
      summary: "First summary.",
      completeness: "full_text",
    })]), LATER);
    assert.equal(changed.updated, 1);
    assert.notEqual(changed.items[0]?.contentHash, first.items[0]?.contentHash);
    assert.equal(changed.items[0]?.id, first.items[0]?.id);
    const found = await store.search("revised", "");
    assert.equal(found.hits.itemCount, 1);
    assert.equal(found.items[0]?.body, "The sentence was revised in the library.");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("validation failures are indexed, atomic, and do not fetch or keep a partial batch", async () => {
  const { store, dir } = await tempStore();
  try {
    const badBatch = await handleCorpusImport(post({
      items: [
        note(),
        note({ originalUrl: "https://example.com/not-saved", title: "Reserved" }),
      ],
    }), deps(store));
    const badBody = await readErr(badBatch);
    assert.equal(badBatch.status, 422);
    assert.equal(badBody.errors[0]?.code, "VALIDATION_FAILED");
    assert.equal(badBody.errors[0]?.message, "reserved_demo_host");
    assert.equal(badBody.errors[0]?.field, "items.1");
    assert.equal(badBody.errors[0]?.recoverable, true);
    assert.equal((await store.search("", "")).library.itemCount, 0);

    const cases: Array<{ body: unknown; status: number; message: string; field: string | null }> = [
      { body: [], status: 422, message: "invalid_item", field: null },
      { body: { items: [] }, status: 422, message: "invalid_item", field: null },
      { body: { items: [note({ publishedAt: "2023-02-29" })] }, status: 422, message: "invalid_item", field: "items.0" },
      { body: { items: [note({ publishedAt: "2024-01-15T24:00:00Z" })] }, status: 422, message: "invalid_item", field: "items.0" },
      { body: { items: [note({ publishedAt: "2024-01-15T00:00:00+00:00" })] }, status: 422, message: "invalid_item", field: "items.0" },
      { body: { items: [note({ savedAt: "2024-02-31T00:00:00Z" })] }, status: 422, message: "invalid_item", field: "items.0" },
      { body: { items: [note({ completeness: "summary_only", body: "present", summary: "kept" })] }, status: 422, message: "inconsistent_text", field: "items.0" },
      { body: { items: [note({ completeness: "full_text", body: "   ", summary: null })] }, status: 422, message: "inconsistent_text", field: "items.0" },
      { body: { items: [note({ completeness: "title_only", summary: "not allowed", body: null })] }, status: 422, message: "inconsistent_text", field: "items.0" },
      { body: { items: [note({ syndication: "original", reprintOfUrl: `${HOST}/other` })] }, status: 422, message: "inconsistent_text", field: "items.0" },
      { body: { items: [note({ summary: `leak ${SECRET}` })] }, status: 422, message: "sensitive_material", field: "items.0" },
      { body: { items: [note({ summary: "The note names CURSOR_API_KEY" })] }, status: 422, message: "sensitive_material", field: "items.0" },
      { body: { items: [note(), note()] }, status: 422, message: "invalid_item", field: "items.1" },
      { body: { items: Array.from({ length: 41 }, (_, index) => note({ originalUrl: `${HOST}/n/${index}` })) }, status: 422, message: "invalid_item", field: null },
    ];
    for (const item of cases) {
      const response = await handleCorpusImport(post(item.body), deps(store));
      const error = await readErr(response);
      assert.equal(response.status, item.status, item.message);
      assert.equal(error.errors[0]?.message, item.message);
      assert.equal(error.errors[0]?.field, item.field);
      assert.equal(JSON.stringify(error).includes(SECRET), false);
    }
    assert.equal((await store.search("", "")).library.itemCount, 0);

    const leap = await store.importItems(batch([note({ publishedAt: "2024-02-29", originalUrl: `${HOST}/leap` })]), NOW);
    assert.equal(leap.items[0]?.publishedAt, "2024-02-29");
    const timed = await store.importItems(batch([note({
      publishedAt: "2024-01-15T00:00:00.000Z",
      originalUrl: `${HOST}/timed`,
      language: "",
      fixture: null,
    })]), NOW);
    assert.equal(timed.items[0]?.publishedAt, "2024-01-15T00:00:00.000Z");
    assert.equal(timed.items[0]?.language, "en");
    assert.equal(timed.items[0]?.fixture, null);
    assert.equal(timed.items[0]?.syndication, "unknown");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("unsafe and reserved URLs are rejected, while a public address is stored as text", async () => {
  const accepted = assertPublicArticleUrl("  https://WWW.Fixture-Outlet.org/path/#frag  ");
  assert.equal(accepted, `${HOST}/path`);
  assert.equal(assertPublicArticleUrl("https://1.1.1.1/story"), "https://1.1.1.1/story");
  assert.equal(assertPublicArticleUrl("https://172.15.1.1/story"), "https://172.15.1.1/story");
  assert.equal(assertPublicArticleUrl("https://www.fixture-outlet.org./path"), `${HOST}/path`);

  const rejected: Array<[string, string]> = [
    ["https://example.com./story", "reserved_demo_host"],
    ["https://publisher.example./story", "reserved_demo_host"],
    ["https://foo.test./story", "reserved_demo_host"],
    ["https://foo.invalid./story", "reserved_demo_host"],
    ["https://example.org/story", "reserved_demo_host"],
    ["not a url", "invalid_url"],
    ["http://www.fixture-outlet.org/story", "unsafe_url"],
    ["https://user:pass@www.fixture-outlet.org/story", "unsafe_url"],
    ["https://www.fixture-outlet.org:443/story", "unsafe_url"],
    ["https://www.fixture-outlet.org:8443/story", "unsafe_url"],
    ["https://127.0.0.1/story", "unsafe_url"],
    ["https://127.1/story", "unsafe_url"],
    ["https://2130706433/story", "unsafe_url"],
    ["https://localhost./story", "unsafe_url"],
    ["https://printer.local./status", "unsafe_url"],
    ["https://localhost.localdomain/story", "unsafe_url"],
    ["https://files.home.arpa/story", "unsafe_url"],
    ["https://metadata.google.internal./compute", "unsafe_url"],
    ["https://10.1.2.3/story", "unsafe_url"],
    ["https://172.16.0.1/story", "unsafe_url"],
    ["https://192.168.1.9/story", "unsafe_url"],
    ["https://169.254.169.254/latest", "unsafe_url"],
    ["https://100.64.0.1/story", "unsafe_url"],
    ["https://192.0.2.1/story", "unsafe_url"],
    ["https://198.51.100.1/story", "unsafe_url"],
    ["https://203.0.113.1/story", "unsafe_url"],
    ["https://198.18.0.1/story", "unsafe_url"],
    ["https://224.0.0.1/story", "unsafe_url"],
    ["https://[::1]/story", "unsafe_url"],
    ["javascript:alert(1)", "unsafe_url"],
    ["https://www.fixture-outlet.org\\@evil.example/story", "unsafe_url"],
  ];
  for (const [originalUrl, code] of rejected) {
    assert.throws(() => normalizeImport(batch([note({ originalUrl, summary: "Not saved." })]), NOW), (error: unknown) => error instanceof CorpusError && error.code === code);
  }

  const { store, dir } = await tempStore();
  try {
    const dotted = await store.importItems(batch([note({ originalUrl: "https://www.fixture-outlet.org./harbor" })]), NOW);
    const again = await store.importItems(batch([note({ originalUrl: `${HOST}/harbor`, summary: "Updated after the trailing dot." })]), NOW);
    assert.equal(dotted.items[0]?.originalUrl, `${HOST}/harbor`);
    assert.equal(again.created, 0);
    assert.equal(again.updated, 1);
    assert.equal(again.library.itemCount, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("retrieval limits, corrupt files, secrets, and request failures stay on the documented error shape", async () => {
  const { store, dir } = await tempStore();
  try {
    const longQuery = await handleCorpusGet(new Request(`http://local/api/corpus?q=${"a".repeat(201)}`), deps(store));
    const longEvent = await handleCorpusGet(new Request(`http://local/api/corpus?event=${"b".repeat(201)}&q=ok`), deps(store));
    assert.equal((await readErr(longQuery)).errors[0]?.field, "q");
    assert.equal(longQuery.status, 400);
    assert.equal((await readErr(longEvent)).errors[0]?.field, "event");

    const limited = await handleCorpusImport(post(batch([note()])), { ...deps(store), allowRequest: () => false });
    const limitedBody = await readErr(limited);
    assert.equal(limited.status, 429);
    assert.equal(limitedBody.errors[0]?.code, "RATE_LIMITED");
    assert.equal(limitedBody.errors[0]?.message, "rate_limited");
    assert.equal(limitedBody.errors[0]?.field, null);

    let seenKey = "";
    await handleCorpusGet(new Request("http://local/api/corpus", { headers: { "x-forwarded-for": " 1.2.3.4, 5.6.7.8 " } }), {
      ...deps(store),
      allowRequest: (key) => {
        seenKey = key;
        return true;
      },
    });
    assert.equal(seenKey, "corpus:1.2.3.4");

    const malformed = await handleCorpusImport(postRaw("{"), deps(store));
    assert.equal(malformed.status, 400);
    assert.equal((await readErr(malformed)).errors[0]?.message, "invalid_json");
    const declared = await handleCorpusImport(new Request("http://local/api/corpus", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(MAX_CORPUS_BYTES + 1) },
      body: "{}",
    }), deps(store));
    assert.equal(declared.status, 400);
    const oversized = await handleCorpusImport(new Request("http://local/api/corpus", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "1" },
      body: `{"pad":"${"a".repeat(MAX_CORPUS_BYTES)}"}`,
    }), deps(store));
    assert.equal(oversized.status, 400);
    assert.equal((await readErr(oversized)).errors[0]?.message, "invalid_json");

    const bom = await handleCorpusImport(postRaw(`\uFEFF${JSON.stringify(batch([note({ originalUrl: `${HOST}/bom` })]))}`), deps(store));
    assert.equal(bom.status, 201);
    assert.equal((await readOk(bom)).data.created, 1);

    const file = path.join(dir, "items.json");
    await writeFile(file, "{");
    const broken = await handleCorpusGet(new Request("http://local/api/corpus"), deps(store));
    assert.equal(broken.status, 500);
    const brokenBody = await readErr(broken);
    assert.equal(brokenBody.errors[0]?.code, "VALIDATION_FAILED");
    assert.equal(brokenBody.errors[0]?.message, "store_failed");
    await writeFile(file, JSON.stringify({ version: 1, items: [{}] }));
    const partial = await handleCorpusGet(new Request("http://local/api/corpus"), deps(store));
    assert.equal(partial.status, 500);
    assert.equal((await readErr(partial)).errors[0]?.message, "store_failed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the library cap rejects the whole batch, then still accepts an update of a saved URL", async () => {
  const { store, dir } = await tempStore();
  try {
    for (let offset = 0; offset < 160; offset += 40) {
      const saved = await store.importItems(batch(range(offset, 40)), NOW);
      assert.equal(saved.created, 40);
    }
    const almost = await store.importItems(batch(range(160, 39)), NOW);
    assert.equal(almost.library.itemCount, 199);
    await assert.rejects(
      () => store.importItems(batch(range(199, 2)), NOW),
      (error: unknown) => error instanceof CorpusError && error.code === "library_full",
    );
    assert.equal((await store.search("", "")).library.itemCount, 199);
    const room = await store.importItems(batch(range(199, 1)), NOW);
    assert.equal(room.library.itemCount, 200);
    const overflow = await handleCorpusImport(post(batch(range(200, 1))), deps(store));
    const overflowBody = await readErr(overflow);
    assert.equal(overflow.status, 422);
    assert.equal(overflowBody.errors[0]?.code, "RATE_LIMITED");
    assert.equal(overflowBody.errors[0]?.message, "library_full");
    assert.equal(overflowBody.errors[0]?.field, null);
    const updated = await store.importItems(batch([note({
      originalUrl: `${HOST}/items/0`,
      summary: "Updated while the library is full.",
    })]), LATER);
    assert.equal(updated.created, 0);
    assert.equal(updated.updated, 1);
    assert.equal(updated.library.itemCount, 200);
    assert.equal((await store.search("while the library is full", "")).hits.itemCount, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("reprints share a saved original, title-only rows can be stored, and excerpts stop at 2000 characters", async () => {
  const original = note({
    originalUrl: `${HOST}/original`,
    outlet: "Desk North",
    completeness: "full_text",
    syndication: "original",
    body: `${"B".repeat(2001)}`,
    summary: "A short summary of the saved original.",
  });
  const reprint = note({
    originalUrl: `${HOST}/reprint`,
    outlet: "Desk Wire",
    title: "Wire copy",
    summary: "Wire summary of the same note.",
    body: null,
    completeness: "summary_only",
    syndication: "reprint",
    reprintOfUrl: "https://www.fixture-outlet.org./original",
  });
  const unknown = note({
    originalUrl: `${HOST}/unknown`,
    outlet: "Desk Unknown",
    title: "Unmarked copy",
    summary: "A summary with no syndication mark.",
  });
  const titleOnly = note({
    originalUrl: `${HOST}/title`,
    title: "Title only ferry note",
    summary: "   ",
    body: null,
    completeness: "title_only",
  });
  const items = normalizeImport({ items: [reprint, original, unknown, titleOnly] }, NOW);
  assert.equal(items[1]?.truncated, true);
  const selected = prepareSelection(items, items.map((item) => item.id));
  const [savedReprint, savedOriginal, savedUnknown, savedTitle] = selected.items;
  assert.equal(savedOriginal?.independenceGroupId, savedReprint?.independenceGroupId);
  assert.equal(savedReprint?.syndicatedFrom, "Desk North");
  assert.equal(savedReprint?.sharedOriginalUrl, `${HOST}/original`);
  assert.notEqual(savedUnknown?.independenceGroupId, savedOriginal?.independenceGroupId);
  assert.match(savedUnknown?.dedupNote ?? "", /unknown/i);
  assert.equal(savedOriginal?.excerpt?.length, 2000);
  assert.equal(savedReprint?.excerpt, "Wire summary of the same note.");
  assert.equal(savedTitle?.excerpt, null);
  assert.equal(savedTitle?.summary, "Title only ferry note");
  assert.throws(() => prepareSelection(items.filter((item) => item.completeness === "title_only"), [savedTitle!.id]), /insufficient_material/);
  assert.throws(() => prepareSelection(items, []), /no_sources/);
  assert.throws(() => prepareSelection(items, ["art_missing0001"]), /unknown_source/);
  assert.throws(() => prepareSelection(items, Array.from({ length: 13 }, () => savedOriginal!.id)), /too_many_sources/);

  const longSummary = normalizeImport(batch([note({
    summary: "C".repeat(2001),
    completeness: "summary_only",
    body: null,
  })]), NOW);
  const summaryMaterial = prepareSelection(longSummary, [longSummary[0]!.id]).items[0];
  assert.equal(summaryMaterial?.excerpt?.length, 2000);
  assert.equal(summaryMaterial?.summary.length, 2001);
  assert.equal(summaryMaterial?.truncated, true);
});

test("parallel imports keep both rows, and an empty store is a successful empty search", async () => {
  const { store, dir } = await tempStore();
  try {
    const empty = await handleCorpusGet(new Request("http://local/api/corpus"), deps(store));
    const emptyBody = await readOk(empty);
    assert.equal(emptyBody.data.library.itemCount, 0);
    assert.equal(emptyBody.data.library.cutoff, null);
    assert.equal(emptyBody.data.hits.itemCount, 0);
    assert.deepEqual(emptyBody.data.items, []);

    const [left, right] = await Promise.all([
      store.importItems(batch([note({ originalUrl: `${HOST}/left`, outlet: "Desk North" })]), NOW),
      store.importItems(batch([note({ originalUrl: `${HOST}/right`, outlet: "Desk South" })]), NOW),
    ]);
    assert.equal(left.created + right.created, 2);
    assert.equal(left.updated + right.updated, 0);
    assert.equal((await store.search("", "")).library.itemCount, 2);

    const same = await Promise.all([
      store.importItems(batch([note({ originalUrl: `${HOST}/same`, summary: "Left copy of the same url." })]), NOW),
      store.importItems(batch([note({ originalUrl: `${HOST}/same`, summary: "Right copy of the same url." })]), NOW),
    ]);
    assert.equal(same[0].created + same[1].created, 1);
    assert.equal(same[0].updated + same[1].updated, 1);
    const merged = await store.search("same url", "");
    assert.equal(merged.library.itemCount, 3);
    assert.equal(merged.hits.itemCount, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("corpus import and search code does not fetch a URL", async () => {
  const roots = [path.join(process.cwd(), "src", "lib", "corpus"), path.join(process.cwd(), "src", "app", "api", "corpus")];
  for (const root of roots) {
    for (const file of await listSource(root)) {
      if (file.endsWith(".test.ts")) continue;
      const text = await readFile(file, "utf8");
      assert.equal(/\bfetch\s*\(/.test(text), false, file);
      assert.equal(text.includes("http.request"), false, file);
      assert.equal(text.includes("dns.lookup"), false, file);
    }
  }
});

function note(overrides: Record<string, unknown> = {}) {
  return {
    event: "weekday-ferries",
    outlet: "Desk North",
    title: "Weekday ferry note",
    publishedAt: "2024-01-15",
    originalUrl: `${HOST}/harbor`,
    summary: "A saved summary of the weekday ferry note.",
    body: null,
    completeness: "summary_only",
    fixture: "test",
    ...overrides,
  };
}

function batch(items: Array<Record<string, unknown>>) {
  return { items };
}

function range(start: number, count: number) {
  return Array.from({ length: count }, (_, offset) => note({
    originalUrl: `${HOST}/items/${start + offset}`,
    title: `Note ${start + offset}`,
    summary: `Summary for note ${start + offset}.`,
    outlet: (start + offset) % 2 === 0 ? "Desk North" : "Desk South",
  }));
}

function expectedId(url: string): string {
  return `art_${createHash("sha256").update(url).digest("hex").slice(0, 12)}`;
}

function post(body: unknown): Request {
  return postRaw(JSON.stringify(body));
}

function postRaw(body: string): Request {
  return new Request("http://local/api/corpus", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

function deps(store: CorpusStore) {
  return { store, allowRequest: () => true, now: () => NOW, secrets: () => [SECRET] };
}

async function readOk(response: Response): Promise<{
  ok: true;
  warnings: string[];
  data: {
    created: number;
    updated: number;
    mode: string;
    liveInternetSearch: boolean;
    listedAll: boolean;
    library: { itemCount: number; outletCount: number; cutoff: string | null };
    hits: { itemCount: number; outletCount: number };
    items: Array<Record<string, unknown>>;
  };
}> {
  return response.json() as Promise<{
    ok: true;
    warnings: string[];
    data: {
      created: number;
      updated: number;
      mode: string;
      liveInternetSearch: boolean;
      listedAll: boolean;
      library: { itemCount: number; outletCount: number; cutoff: string | null };
      hits: { itemCount: number; outletCount: number };
      items: Array<Record<string, unknown>>;
    };
  }>;
}

async function readErr(response: Response): Promise<{ ok: false; errors: Array<{ code: string; message: string; field: string | null; recoverable: boolean }> }> {
  return response.json() as Promise<{ ok: false; errors: Array<{ code: string; message: string; field: string | null; recoverable: boolean }> }>;
}

async function tempStore(): Promise<{ store: CorpusStore; dir: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-corpus-"));
  return { dir, store: createCorpusStore(path.join(dir, "items.json")) };
}

async function listSource(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listSource(full)));
    else files.push(full);
  }
  return files;
}
