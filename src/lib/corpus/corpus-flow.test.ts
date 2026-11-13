import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { toBriefingView } from "@/lib/adapters/to-view";
import { handleCreateAnalysis } from "@/lib/analysis/analyses-http";
import { createCursorClient, createMockTransport } from "@/lib/analysis/cursor-client";
import { createCursorAnalysisService } from "@/lib/analysis/cursor-service";
import { acceptSavedMaterialOutput } from "@/lib/analysis/cursor-output";
import { buildCursorBundlePrompt } from "@/lib/analysis/cursor-prompt";
import { handleCorpusGet, handleCorpusImport } from "@/lib/corpus/corpus-http";
import { normalizeImport, prepareSelection } from "@/lib/corpus/materials";
import { createCorpusStore } from "@/lib/corpus/store";
import { citingBundle, FIXTURE_NOW, FIXTURE_OUTLET_URL, harborPayload, harborSelection, wirePayload } from "@/lib/corpus/test-fixture";
import type { AnalysisBundle } from "@/lib/openframe/openframe";

const KEY = "unit-test-key";
const QUERY = "Harbor ferries and weekday crowds";

test("import persists across a new store, search counts outlets separately, and a mock run cites only the saved item", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-corpus-"));
  const storePath = path.join(dir, "items.json");
  try {
    const first = createCorpusStore(storePath);
    const imported = await handleCorpusImport(post(harborPayload()), deps(first));
    assert.equal(imported.status, 201);
    const importedBody = (await imported.json()) as { data: { library: { itemCount: number; outletCount: number }; items: Array<{ preview: string | null; fixture: string }> } };
    assert.equal(importedBody.data.library.itemCount, 1);
    assert.equal(importedBody.data.library.outletCount, 1);
    assert.equal(importedBody.data.items[0]?.fixture, "test");
    assert.equal(JSON.stringify(importedBody).includes("gives no checked figures"), false);

    const restarted = createCorpusStore(storePath);
    const listed = await handleCorpusGet(new Request("http://local/api/corpus"), deps(restarted));
    const listedBody = (await listed.json()) as { data: { listedAll: boolean; liveInternetSearch: boolean; library: { outletCount: number }; hits: { outletCount: number }; items: Array<{ id: string }> } };
    assert.equal(listedBody.data.listedAll, true);
    assert.equal(listedBody.data.liveInternetSearch, false);
    assert.equal(listedBody.data.library.outletCount, 1);
    assert.equal(listedBody.data.hits.outletCount, 1);
    const id = listedBody.data.items[0]?.id;
    assert.ok(id);

    const missed = await handleCorpusGet(new Request("http://local/api/corpus?q=zzzz-not-saved"), deps(restarted));
    const missedBody = (await missed.json()) as { data: { hits: { itemCount: number; outletCount: number }; library: { itemCount: number } } };
    assert.equal(missedBody.data.hits.itemCount, 0);
    assert.equal(missedBody.data.hits.outletCount, 0);
    assert.equal(missedBody.data.library.itemCount, 1);

    const saved: AnalysisBundle[] = [];
    let creates = 0;
    const service = serviceFor(dir, saved, () => {
      creates += 1;
    }, restarted);
    const created = await handleCreateAnalysis(analysisRequest([id!], "same-key-01"), {
      provider: "cursor",
      createDemo: async () => {
        throw new Error("demo was not expected");
      },
      saveBundle: async (bundle) => {
        saved.push(bundle);
      },
      cursor: service,
      allowRequest: () => true,
    });
    assert.equal(created.status, 202);
    const job = ((await created.json()) as { data: { job: { id: string; liveCallVerified: boolean; libraryOutletCount: number; sourceCount: number } } }).data.job;
    assert.equal(job.liveCallVerified, false);
    assert.equal(job.libraryOutletCount, 1);
    assert.equal(job.sourceCount, 1);
    const again = await handleCreateAnalysis(analysisRequest([id!], "same-key-02"), {
      provider: "cursor",
      createDemo: async () => {
        throw new Error("demo was not expected");
      },
      saveBundle: async () => undefined,
      cursor: service,
      allowRequest: () => true,
    });
    assert.equal(again.status, 202);
    assert.equal(creates, 1);
    const ready = await service.poll(job.id);
    assert.equal(ready?.status, "ready");
    const view = toBriefingView(saved[0]!);
    assert.equal(view.articles[0]?.url, FIXTURE_OUTLET_URL);
    assert.match(view.masthead, /saved historical materials/i);
    assert.match(view.notice ?? "", /not a live internet search/i);
    assert.equal(view.articles[0]?.publisher, "Test Fixture Desk");
    assert.equal(JSON.stringify(view).includes(KEY), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a changed saved text does not reuse the old job, and the same key cannot hide that change", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-corpus-ver-"));
  try {
    const store = createCorpusStore(path.join(dir, "items.json"));
    await store.importItems(harborPayload(FIXTURE_NOW, "The saved test text says the weekday ferry note is unresolved and gives no checked figures."), FIXTURE_NOW);
    let creates = 0;
    const service = serviceFor(dir, [], () => {
      creates += 1;
    }, store);
    const firstItems = await store.search("", "");
    const id = firstItems.items[0]!.id;
    const firstJob = await service.start({ query: QUERY, language: "en", idempotencyKey: "version-key", sourceIds: [id] });
    await store.importItems(harborPayload(FIXTURE_NOW, "The saved test text now says the weekday ferry note was updated in the library."), "2026-11-13T05:00:00.000Z");
    await assert.rejects(
      () => service.start({ query: QUERY, language: "en", idempotencyKey: "version-key", sourceIds: [id] }),
      (error: unknown) => (error as { code?: string }).code === "idempotency_conflict",
    );
    assert.equal(creates, 1);
    const second = await service.start({ query: QUERY, language: "en", idempotencyKey: null, sourceIds: [id] });
    assert.notEqual(second.id, firstJob.id);
    assert.equal(creates, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("reprints share a group, unknown stays unknown, and country is not stored", async () => {
  const now = FIXTURE_NOW;
  const items = normalizeImport({ items: [...harborPayload(now).items, ...wirePayload(now).items, {
    event: "weekday-ferries",
    outlet: "Test Fixture Unknown",
    title: "Unmarked copy of a ferry note",
    publishedAt: "2026-11-02",
    originalUrl: "https://www.fixture-unknown.org/2026/11/weekday-ferry",
    summary: "A test fixture summary with no syndication mark.",
    completeness: "summary_only",
    fixture: "test",
  }] }, now);
  assert.equal(items.some((item) => "country" in item), false);
  const selected = prepareSelection(items, items.map((item) => item.id));
  const [original, reprint, unknown] = selected.items;
  assert.equal(original?.independenceGroupId, reprint?.independenceGroupId);
  assert.notEqual(unknown?.independenceGroupId, original?.independenceGroupId);
  assert.match(unknown?.dedupNote ?? "", /unknown/i);
  assert.equal(reprint?.syndicatedFrom, "Test Fixture Desk");
});

test("summary-only text is not expanded, title-only cannot start a run, and bad urls are refused without a fetch", async () => {
  const summary = normalizeImport({
    items: [{
      event: "weekday-ferries",
      outlet: "Test Fixture Desk",
      title: "Summary only ferry note",
      publishedAt: "2026-11-01",
      originalUrl: FIXTURE_OUTLET_URL,
      summary: "Only this summary was saved.",
      completeness: "summary_only",
      fixture: "test",
    }],
  }, FIXTURE_NOW);
  const material = prepareSelection(summary, [summary[0]!.id]).items[0]!;
  assert.equal(material.excerpt, "Only this summary was saved.");
  const bundle = acceptSavedMaterialOutput({
    text: JSON.stringify(citingBundle(material, QUERY)),
    query: QUERY,
    language: "en",
    nowIso: "2026-11-13T06:00:00.000Z",
    bundleId: "bnd_summaryfixture01",
    secrets: [KEY],
    materials: [material],
    library: { itemCount: 1, outletCount: 1, cutoff: FIXTURE_NOW },
  });
  assert.equal(bundle.articles[0]?.accessible_text, "Only this summary was saved.");
  assert.match(JSON.stringify(bundle.articles[0]?.missing_fields), /not expanded|not_found/);

  const titleOnly = normalizeImport({
    items: [{
      event: "weekday-ferries",
      outlet: "Test Fixture Desk",
      title: "Title only ferry note",
      originalUrl: "https://www.fixture-outlet.org/2026/11/title-only",
      completeness: "title_only",
      fixture: "test",
    }],
  }, FIXTURE_NOW);
  assert.throws(() => prepareSelection(titleOnly, [titleOnly[0]!.id]), /insufficient_material/);

  const badUrls = [
    "https://example.com/story",
    "http://www.fixture-outlet.org/story",
    "https://user:pass@www.fixture-outlet.org/story",
    "https://127.0.0.1/story",
    "https://169.254.169.254/latest",
    "file:///tmp/story",
    "javascript:alert(1)",
  ];
  for (const originalUrl of badUrls) {
    assert.throws(() => normalizeImport({
      items: [{
        event: "weekday-ferries",
        outlet: "Test Fixture Desk",
        title: "Bad url",
        originalUrl,
        summary: "Not saved.",
        completeness: "summary_only",
      }],
    }, FIXTURE_NOW), /reserved_demo_host|unsafe_url|invalid_url/);
  }
});

test("invented links, external-check claims, bad quotes, and secrets are rejected", () => {
  const selected = harborSelection();
  const invented = JSON.stringify(citingBundle(selected.material, QUERY)).replaceAll(
    selected.material.originalUrl,
    "https://www.nytimes.com/2026/11/01/story.html",
  );
  assert.throws(() => accept(selected, invented), /invented_source/);

  const external = citingBundle(selected.material, QUERY);
  const audit = (external.evidence_audit as { audits: Array<{ explanation: string }> }).audits[0]!;
  audit.explanation = "I searched the live web and fact-checked against the internet.";
  assert.throws(() => accept(selected, JSON.stringify(external)), /external_verification/);

  const quoted = citingBundle(selected.material, QUERY);
  const claim = "A sentence that was never saved in the material.";
  (quoted.claim_extraction as { claims: Array<{ claim_text: string; is_verbatim: boolean }> }).claims[0]!.claim_text = claim;
  (quoted.claim_extraction as { claims: Array<{ is_verbatim: boolean }> }).claims[0]!.is_verbatim = true;
  (quoted.evidence_audit as { audits: Array<{ claim_text: string }> }).audits[0]!.claim_text = claim;
  (quoted.research_report as { key_claim_verification: Array<{ claim_text: string }> }).key_claim_verification[0]!.claim_text = claim;
  assert.throws(() => accept(selected, JSON.stringify(quoted)), /validation_failed/);

  assert.throws(() => accept(selected, `{"leak":"${KEY}"}`), /sensitive_echo/);
  assert.throws(() => normalizeImport({
    items: [{
      event: "weekday-ferries",
      outlet: "Test Fixture Desk",
      title: "Secret note",
      originalUrl: FIXTURE_OUTLET_URL,
      summary: `The note includes ${KEY}`,
      completeness: "summary_only",
      fixture: "test",
    }],
  }, FIXTURE_NOW, [KEY]), /sensitive_material/);
});

test("the server computes quote spans so a real Verified audit is accepted", () => {
  const selected = harborSelection();
  const material = selected.material;
  const excerpt = material.excerpt!.slice(0, 200);
  const bundle = citingBundle(material, QUERY);
  withVerifiedAudit(bundle, evidenceFor(material, { excerpt, excerpt_span: null }));
  const voice = firstVoice(bundle, material);
  voice.quote_mode = "verbatim";
  voice.verbatim_quote = excerpt.slice(0, 40);
  voice.paraphrase = null;
  voice.quote_verification = "verified_substring";
  voice.quote_span = null;

  const accepted = accept(selected, JSON.stringify(bundle));
  const audit = accepted.evidence_audit.audits[0]!;
  assert.equal(audit.status, "Verified");
  const item = audit.supporting_evidence[0]!;
  assert.equal(item.quote_verification, "verified_substring");
  assert.equal(item.excerpt_is_verbatim, true);
  assert.ok(item.excerpt_span);
  assert.equal(accepted.articles[0]!.accessible_text!.slice(item.excerpt_span!.start, item.excerpt_span!.end), excerpt);

  const quoted = accepted.narrative_comparison.article_analyses[0]!.source_selection.quoted_voices[0]!;
  assert.equal(quoted.quote_verification, "verified_substring");
  assert.ok(quoted.quote_span);
  assert.equal(accepted.articles[0]!.accessible_text!.slice(quoted.quote_span!.start, quoted.quote_span!.end), voice.verbatim_quote);
});

test("verbatim text from a saved summary or missing from the text is downgraded, not trusted", () => {
  const summary = normalizeImport({
    items: [{
      event: "weekday-ferries",
      outlet: "Test Fixture Desk",
      title: "Summary only ferry note",
      publishedAt: "2026-11-01",
      originalUrl: FIXTURE_OUTLET_URL,
      summary: "Only this summary was saved.",
      completeness: "summary_only",
      fixture: "test",
    }],
  }, FIXTURE_NOW);
  const summarySelection = prepareSelection(summary, [summary[0]!.id]);
  const summaryMaterial = summarySelection.items[0]!;
  const fromSummary = citingBundle(summaryMaterial, QUERY);
  withVerifiedAudit(fromSummary, evidenceFor(summaryMaterial, {
    excerpt: summaryMaterial.excerpt,
    excerpt_span: null,
    evidence_kind: "primary_document",
  }));
  const acceptedSummary = accept({ items: summary, resolved: summarySelection, material: summaryMaterial }, JSON.stringify(fromSummary));
  const summaryItem = acceptedSummary.evidence_audit.audits[0]!.supporting_evidence[0]!;
  assert.equal(summaryItem.quote_verification, "paraphrase");
  assert.equal(summaryItem.excerpt_is_verbatim, false);
  assert.equal(summaryItem.excerpt_span, null);

  const selected = harborSelection();
  const missing = citingBundle(selected.material, QUERY);
  withVerifiedAudit(missing, evidenceFor(selected.material, {
    excerpt: "A sentence that was never saved in the material.",
    excerpt_span: null,
  }));
  const acceptedMissing = accept(selected, JSON.stringify(missing));
  const missingItem = acceptedMissing.evidence_audit.audits[0]!.supporting_evidence[0]!;
  assert.equal(missingItem.quote_verification, "paraphrase");
  assert.equal(missingItem.excerpt_span, null);
});

function evidenceFor(material: ReturnType<typeof harborSelection>["material"], overrides: Record<string, unknown>) {
  return {
    schema_version: "1.2.0",
    id: "ev_mockcursor01",
    data_mode: "LIVE",
    claim_id: "clm_mockcursor01",
    article_id: material.id,
    url: material.originalUrl,
    publisher: material.outlet,
    publication_date: "2026-11-01",
    excerpt: material.excerpt,
    excerpt_is_verbatim: true,
    quote_verification: "verified_substring",
    excerpt_span: null,
    summary: "The saved material supports the proposition.",
    evidence_kind: "primary_document",
    independence_group_id: material.independenceGroupId,
    retrieval_method: "manual_entry",
    accessed_at: "2026-11-13T04:00:00.000Z",
    ...overrides,
  };
}

function withVerifiedAudit(bundle: Record<string, unknown>, evidence: Record<string, unknown>): void {
  const audit = (bundle.evidence_audit as { audits: Array<Record<string, unknown>> }).audits[0]!;
  audit.supporting_evidence = [evidence];
  audit.status = "Verified";
  audit.confidence = { level: "medium", rationale: "A checkable saved document supports the proposition." };
  const row = (bundle.research_report as { key_claim_verification: Array<Record<string, unknown>> }).key_claim_verification[0]!;
  row.status = "Verified";
  row.confidence_level = "medium";
}

function firstVoice(bundle: Record<string, unknown>, material: ReturnType<typeof harborSelection>["material"]): Record<string, unknown> {
  const analysis = (bundle.narrative_comparison as { article_analyses: Array<{ article_id: string; source_selection: { quoted_voices: Array<Record<string, unknown>> } }> }).article_analyses[0]!;
  analysis.article_id = material.id;
  const voice = {
    speaker: "Fixture Desk reporter",
    speaker_role: "reporter",
    quote_mode: "verbatim",
    verbatim_quote: material.excerpt!.slice(0, 40),
    paraphrase: null,
    quote_verification: "verified_substring",
    quote_span: null,
  };
  analysis.source_selection.quoted_voices.push(voice);
  return voice;
}

test("saved-material analysis is not replaced by a demonstration, and corpus source does not fetch", async () => {
  const demo = await handleCreateAnalysis(new Request("http://local/api/analyses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, language: "en", intent: "saved", sourceIds: ["art_missing"] }),
  }), {
    provider: "demo",
    createDemo: async () => {
      throw new Error("demo was not expected");
    },
    saveBundle: async () => undefined,
    cursor: null,
    allowRequest: () => true,
  });
  assert.equal(demo.status, 409);
  assert.match(await demo.text(), /saved_analysis_needs_cursor/);

  const example = JSON.parse(await readFile(path.join(process.cwd(), "docs", "corpus-import.example.json"), "utf8")) as unknown;
  assert.throws(() => normalizeImport(example, FIXTURE_NOW), /reserved_demo_host/);

  const files = await listSource(path.join(process.cwd(), "src", "lib", "corpus"));
  for (const file of files) {
    if (file.endsWith(".test.ts") || file.endsWith("test-fixture.ts")) continue;
    const text = await readFile(file, "utf8");
    assert.equal(/\bfetch\s*\(/.test(text), false, file);
    assert.equal(text.includes("http.request"), false, file);
  }
  const prompt = buildCursorBundlePrompt({
    query: QUERY,
    language: "en",
    materials: harborSelection().resolved.items,
    library: harborSelection().resolved.library,
  });
  assert.match(prompt, /Do not use tools/);
  assert.equal(prompt.includes(KEY), false);
});

function accept(selected: ReturnType<typeof harborSelection>, text: string) {
  return acceptSavedMaterialOutput({
    text,
    query: QUERY,
    language: "en",
    nowIso: "2026-11-13T06:00:00.000Z",
    bundleId: "bnd_savedfixture01",
    secrets: [KEY],
    materials: [selected.material],
    library: selected.resolved.library,
  });
}

function post(body: unknown): Request {
  return new Request("http://local/api/corpus", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deps(store: ReturnType<typeof createCorpusStore>) {
  return { store, allowRequest: () => true, now: () => FIXTURE_NOW, secrets: () => [KEY] };
}

function analysisRequest(sourceIds: string[], key: string): Request {
  return new Request("http://local/api/analyses", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({ query: QUERY, language: "en", intent: "saved", sourceIds }),
  });
}

function serviceFor(
  dir: string,
  saved: AnalysisBundle[],
  onCreate: () => void,
  store: ReturnType<typeof createCorpusStore>,
) {
  const transport = createMockTransport(async (request) => {
    if (request.method === "POST" && request.url.endsWith("/v1/agents")) {
      onCreate();
      const body = request.body as { prompt?: { text?: string } };
      assert.equal(body.prompt?.text?.includes(KEY), false);
      return { status: 200, data: { agent: { id: "bc-corpus" }, run: { id: "run-corpus", status: "RUNNING" } } };
    }
    if (request.method === "GET") {
      const items = await store.search("", "");
      const material = (await store.resolve(items.items.map((item) => item.id))).items[0];
      if (!material) return { status: 200, data: { status: "FINISHED", result: "{}", durationMs: 1 } };
      return { status: 200, data: { status: "FINISHED", result: JSON.stringify(citingBundle(material, QUERY)), durationMs: 4 } };
    }
    return { status: 200, data: {} };
  });
  return createCursorAnalysisService({
    client: createCursorClient({ getApiKey: () => KEY, apiBase: "https://api.cursor.com", transport }),
    storePath: path.join(dir, "jobs.json"),
    persistBundle: async (bundle) => {
      saved.push(bundle);
    },
    getApiKey: () => KEY,
    allowNetwork: () => true,
    pollIntervalMs: 0,
    resolveSources: (ids) => store.resolve(ids),
  });
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
