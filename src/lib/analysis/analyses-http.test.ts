import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildDemoBundle } from "@/lib/demo/catalog";
import { handleCancelJob, handleCreateAnalysis, handlePollJob, handleRetryJob, type AnalysisHttpDeps } from "@/lib/analysis/analyses-http";
import { createCursorClient, createMockTransport } from "@/lib/analysis/cursor-client";
import { citingBundle, harborSelection } from "@/lib/corpus/test-fixture";
import { CorpusError } from "@/lib/corpus/types";
import { createCursorAnalysisService } from "@/lib/analysis/cursor-service";
import type { AnalysisBundle } from "@/lib/openframe/openframe";

const fixture = harborSelection();

const KEY = "unit-test-key";
const QUERY = "Harbor ferries and weekday crowds";

test("demo creation stays precomputed and retired or unconfigured providers do not pretend to succeed", async () => {
  const saved: AnalysisBundle[] = [];
  const demo = await handleCreateAnalysis(post({ query: "Plumvale Toonworks fictional demonstration", language: "en" }), deps({
    provider: "demo",
    createDemo: async (input) => buildDemoBundle(input.query, input.language),
    saveBundle: async (bundle) => {
      saved.push(bundle);
    },
  }));
  assert.equal(demo.status, 201);
  const demoBody = (await demo.json()) as { data: AnalysisBundle };
  assert.equal(demoBody.data.analysis_generation, "PRECOMPUTED");
  assert.equal(demoBody.data.data_mode, "DEMO");
  assert.equal(
    demoBody.data.research_report.metadata.topic,
    "Is AI-generated Animation Disrupting the Traditional Film and Television Industry?",
  );
  assert.equal(saved.length, 1);
  assert.equal(saved[0]?.analysis_generation, "PRECOMPUTED");

  const legacy = await handleCreateAnalysis(post({ query: "Northlight Studios fictional demonstration", language: "en" }), deps({
    provider: "demo",
    createDemo: async (input) => buildDemoBundle(input.query, input.language),
    saveBundle: async () => undefined,
  }));
  assert.equal(legacy.status, 201);
  const legacyBody = (await legacy.json()) as { data: AnalysisBundle };
  assert.equal(legacyBody.data.data_mode, "DEMO");
  assert.equal(legacyBody.data.analysis_generation, "PRECOMPUTED");
  assert.equal(
    legacyBody.data.research_report.metadata.topic,
    "Is AI-generated Animation Disrupting the Traditional Film and Television Industry?",
  );

  const retired = await handleCreateAnalysis(post({ query: QUERY, language: "zh" }), deps({ provider: "retired" }));
  assert.equal(retired.status, 501);
  const retiredText = await retired.text();
  assert.match(retiredText, /retired_provider/);
  assert.equal(retiredText.includes(KEY), false);
  assert.equal(retiredText.includes("bundle_id"), false);

  let calls = 0;
  const missing = await handleCreateAnalysis(post({ query: QUERY, language: "en", sourceIds: [fixture.material.id] }), await cursorDeps({
    getApiKey: () => null,
    onCall: () => {
      calls += 1;
    },
  }));
  assert.equal(missing.status, 503);
  assert.match(await missing.text(), /config_not_ready/);
  assert.equal(calls, 0);

  const limited = await handleCreateAnalysis(post({ query: QUERY, language: "en" }), deps({
    provider: "cursor",
    allowRequest: () => false,
    cursor: {
      async start() {
        throw new Error("should not start");
      },
      async poll() {
        return null;
      },
      async retry() {
        throw new Error("should not retry");
      },
      async cancel() {
        throw new Error("should not cancel");
      },
    },
  }));
  assert.equal(limited.status, 429);

  const badKey = await handleCreateAnalysis(
    new Request("http://local/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "bad key" },
      body: JSON.stringify({ query: QUERY, language: "en", model: "grok-4.7" }),
    }),
    await cursorDeps({ getApiKey: () => KEY, onCall: () => undefined }),
  );
  assert.equal(badKey.status, 400);
});

test("the analyses route accepts a mock Cursor run and does not call it a verified live connection", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-http-"));
  try {
    let posts = 0;
    const saved: AnalysisBundle[] = [];
    const deps = await cursorDeps({
      dir,
      getApiKey: () => KEY,
      saved,
      onCall: (request) => {
        if (request.method === "POST" && request.url.endsWith("/v1/agents")) posts += 1;
      },
    });
    const created = await handleCreateAnalysis(
      new Request("http://local/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "route-key-1" },
        body: JSON.stringify({ query: QUERY, language: "en", model: "grok-4.7", sourceIds: [fixture.material.id] }),
      }),
      deps,
    );
    assert.equal(created.status, 202);
    const createdBody = (await created.json()) as { data: { job: { id: string; liveCallVerified: boolean; bundleId: string | null } }; warnings: string[] };
    assert.equal(createdBody.data.job.liveCallVerified, false);
    assert.equal(createdBody.data.job.bundleId, null);
    assert.match(createdBody.warnings.join(" "), /not a live internet search/);
    assert.equal(JSON.stringify(createdBody).includes(KEY), false);
    const duplicate = await handleCreateAnalysis(
      new Request("http://local/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": "route-key-1" },
        body: JSON.stringify({ query: QUERY, language: "en", sourceIds: [fixture.material.id] }),
      }),
      deps,
    );
    assert.equal(duplicate.status, 202);
    assert.equal(posts, 1);
    const polled = await handlePollJob(createdBody.data.job.id, deps);
    assert.equal(polled.status, 200);
    const polledBody = (await polled.json()) as { data: { job: { status: string; bundleId: string; liveCallVerified: boolean } } };
    assert.equal(polledBody.data.job.status, "ready");
    assert.equal(polledBody.data.job.liveCallVerified, false);
    assert.equal(saved[0]?.analysis_generation, "LIVE_AI");
    assert.equal(saved[0]?.data_mode, "LIVE");
    assert.equal(saved[0]?.articles[0]?.original_url, fixture.material.originalUrl);
    assert.equal(saved[0]?.evidence_audit.audits.every((audit) => audit.status === "Unverified"), true);
    const cancelled = await handleCancelJob(createdBody.data.job.id, deps);
    assert.equal(cancelled.status, 200);
    const retry = await handleRetryJob(createdBody.data.job.id, new Request("http://local/retry", { method: "POST", body: "{}" }), deps);
    const retryBody = (await retry.json()) as { data: { job: { status: string } } };
    assert.equal(retry.status, 200);
    assert.equal(retryBody.data.job.status, "ready");
    assert.equal(posts, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

function post(body: unknown): Request {
  return new Request("http://local/api/analyses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deps(overrides: Partial<AnalysisHttpDeps> & Pick<AnalysisHttpDeps, "provider">): AnalysisHttpDeps {
  return {
    createDemo: async () => {
      throw new Error("demo was not expected");
    },
    saveBundle: async () => undefined,
    cursor: null,
    allowRequest: () => true,
    ...overrides,
  };
}

async function cursorDeps(input: {
  dir?: string;
  getApiKey: () => string | null;
  saved?: AnalysisBundle[];
  onCall?: (request: { method: string; url: string }) => void;
}): Promise<AnalysisHttpDeps> {
  const dir = input.dir ?? (await mkdtemp(path.join(tmpdir(), "openframe-http-")));
  const transport = createMockTransport(async (request) => {
    input.onCall?.(request);
    if (request.method === "POST" && request.url.endsWith("/v1/agents")) {
      return { status: 200, data: { agent: { id: "bc-route" }, run: { id: "run-route", status: "RUNNING" } } };
    }
    if (request.method === "GET") {
      return { status: 200, data: { status: "FINISHED", result: JSON.stringify(citingBundle(fixture.material, QUERY)), durationMs: 5 } };
    }
    if (request.url.endsWith("/cancel")) return { status: 200, data: {} };
    return { status: 500, data: {} };
  });
  const service = createCursorAnalysisService({
    client: createCursorClient({ getApiKey: input.getApiKey, apiBase: "https://api.cursor.com", transport }),
    storePath: path.join(dir, "jobs.json"),
    persistBundle: async (bundle) => {
      input.saved?.push(bundle);
    },
    getApiKey: input.getApiKey,
    allowNetwork: () => input.getApiKey() != null,
    pollIntervalMs: 0,
    resolveSources: async (ids) => {
      if (ids.length === 0) throw new CorpusError("no_sources");
      if (ids.some((id) => id !== fixture.material.id)) throw new CorpusError("unknown_source");
      return fixture.resolved;
    },
  });
  return deps({
    provider: "cursor",
    cursor: service,
  });
}
