import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { CursorConfigError } from "@/lib/analysis/cursor-config";
import {
  createCursorClient,
  createDefaultTransport,
  createMockTransport,
  type TransportRequest,
} from "@/lib/analysis/cursor-client";
import { citingBundle, harborSelection } from "@/lib/corpus/test-fixture";
import { CorpusError } from "@/lib/corpus/types";
import { createCursorAnalysisService, type CursorAnalysisService } from "@/lib/analysis/cursor-service";
import type { AnalysisBundle } from "@/lib/openframe/openframe";

const KEY = "unit-test-key";
const QUERY = "Harbor ferries and weekday crowds";
const fixture = harborSelection();

function runInput(query: string, idempotencyKey: string | null) {
  return { query, language: "en" as const, idempotencyKey, sourceIds: [fixture.material.id] };
}

test("the default transport does not call fetch unless outbound calls are enabled", async () => {
  let called = false;
  const client = createCursorClient({
    getApiKey: () => KEY,
    apiBase: "https://api.cursor.com",
    transport: createDefaultTransport({
      allowNetwork: () => false,
      fetchImpl: async () => {
        called = true;
        return new Response("{}", { status: 200 });
      },
    }),
  });
  await assert.rejects(() => client.createNoRepoAgent({ name: "openframe-analysis", promptText: "hello" }), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "network_disabled");
    return true;
  });
  assert.equal(called, false);
});

test("a missing key and a non-pinned model never reach the transport", async () => {
  let calls = 0;
  const transport = createMockTransport(async () => {
    calls += 1;
    return { status: 500, data: {} };
  });
  const missing = createCursorClient({ getApiKey: () => null, apiBase: "https://api.cursor.com", transport });
  await assert.rejects(() => missing.createNoRepoAgent({ name: "n", promptText: "p" }), (error: unknown) => {
    assert.equal((error as { code?: string }).code, "config_not_ready");
    return true;
  });
  const wrongModel = createCursorClient({
    getApiKey: () => KEY,
    apiBase: "https://api.cursor.com",
    modelPin: { modelId: "grok-4.7", effort: "medium", fast: "false" },
    transport,
  });
  await assert.rejects(() => wrongModel.createNoRepoAgent({ name: "n", promptText: "p" }), (error: unknown) => {
    assert.ok(error instanceof CursorConfigError);
    assert.equal(error.code, "model_pin_violation");
    return true;
  });
  assert.equal(calls, 0);
});

test("create, poll, dedupe, auth, timeout, schema, and retry use the documented Cursor routes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-"));
  try {
    const seen: TransportRequest[] = [];
    let resultText = JSON.stringify(citingBundle(fixture.material, QUERY));
    const transport = createMockTransport(async (request) => {
      seen.push(request);
      if (request.method === "POST" && request.url.endsWith("/v1/agents")) {
        const body = request.body as { model?: { id?: string; params?: unknown }; repos?: unknown; env?: unknown; prompt?: { text?: string } };
        assert.equal(body.model?.id, "grok-4.5");
        assert.deepEqual(body.model?.params, [
          { id: "effort", value: "medium" },
          { id: "fast", value: "false" },
        ]);
        assert.equal(body.repos, undefined);
        assert.equal(body.env, undefined);
        assert.equal(request.headers.Authorization, `Basic ${Buffer.from(`${KEY}:`).toString("base64")}`);
        assert.equal(request.headers.Authorization.includes("Bearer"), false);
        assert.equal(body.prompt?.text?.includes(KEY), false);
        assert.match(body.prompt?.text ?? "", /fixture-outlet\.org/);
        assert.match(body.prompt?.text ?? "", /not a live internet search/i);
        assert.equal((body.prompt?.text ?? "").split("UNTRUSTED_DOCUMENTS>>>").length, 2);
        return { status: 200, data: { agent: { id: "bc-test" }, run: { id: "run-1", status: "RUNNING" } } };
      }
      if (request.method === "GET") {
        return { status: 200, data: { status: "FINISHED", result: resultText, durationMs: 12 } };
      }
      if (request.method === "POST" && request.url.endsWith("/runs")) {
        return { status: 200, data: { run: { id: "run-2", status: "CREATING" } } };
      }
      if (request.url.endsWith("/cancel")) return { status: 200, data: { id: "run-1" } };
      throw new Error(`unexpected ${request.method} ${request.url}`);
    });
    const saved: AnalysisBundle[] = [];
    const { service } = build(dir, transport, saved);
    const first = await service.start(runInput(QUERY, "idem-key-1"));
    const second = await service.start(runInput(QUERY, "idem-key-2"));
    assert.equal(first.id, second.id);
    assert.equal(seen.filter((call) => call.method === "POST" && call.url.endsWith("/v1/agents")).length, 1);
    const ready = await service.poll(first.id);
    assert.equal(ready?.status, "ready");
    assert.equal(ready?.liveCallVerified, false);
    assert.equal(ready?.evidencePosture, "saved_materials_not_externally_verified");
    assert.equal(ready?.liveInternetSearch, false);
    assert.equal(ready?.sourceCount, 1);
    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.analysis_generation, "LIVE_AI");
    assert.equal(saved[0]?.data_mode, "LIVE");
    assert.equal(saved[0]?.articles[0]?.original_url, fixture.material.originalUrl);
    assert.equal(saved[0]?.articles[0]?.publisher.name, "Test Fixture Desk");
    assert.equal(JSON.stringify(ready).includes(KEY), false);
    const again = await service.poll(first.id);
    assert.equal(again?.status, "ready");
    assert.equal(seen.filter((call) => call.method === "GET").length, 1);

    resultText = "not json";
    const badDir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-bad-"));
    const badSeen: TransportRequest[] = [];
    const badTransport = createMockTransport(async (request) => {
      badSeen.push(request);
      if (request.method === "POST" && request.url.endsWith("/v1/agents")) {
        return { status: 200, data: { agent: { id: "bc-bad" }, run: { id: "run-bad", status: "RUNNING" } } };
      }
      if (request.method === "GET") return { status: 200, data: { status: "FINISHED", result: resultText, durationMs: 1 } };
      if (request.method === "POST" && request.url.endsWith("/runs")) {
        resultText = JSON.stringify(citingBundle(fixture.material, QUERY));
        return { status: 200, data: { run: { id: "run-fix", status: "CREATING" } } };
      }
      throw new Error(`unexpected ${request.method} ${request.url}`);
    });
    const badSaved: AnalysisBundle[] = [];
    const bad = build(badDir, badTransport, badSaved, { pollIntervalMs: 0 });
    const failed = await bad.service.start(runInput(QUERY, null));
    const rejected = await bad.service.poll(failed.id);
    assert.equal(rejected?.errorCode, "invalid_json");
    assert.equal(badSaved.length, 0);
    await assert.rejects(() => bad.service.retry(failed.id, false), /confirmation_required/);
    assert.equal(badSeen.filter((call) => call.method === "POST").length, 1);
    const retried = await bad.service.retry(failed.id, true);
    assert.equal(retried.status, "running");
    assert.equal(badSeen.filter((call) => call.url === "https://api.cursor.com/v1/agents").length, 1);
    assert.equal(badSeen.filter((call) => call.url.endsWith("/v1/agents/bc-bad/runs")).length, 1);
    const fixed = await bad.service.poll(failed.id);
    assert.equal(fixed?.status, "ready");
    assert.equal(badSaved.length, 1);
    await rm(badDir, { recursive: true, force: true });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("auth failure, rate limit, timeout, unsafe output, and secret echo do not create a second paid run", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-err-"));
  try {
    let mode: "auth" | "rate" | "unsafe" | "echo" = "auth";
    const calls: string[] = [];
    const transport = createMockTransport(async (request) => {
      calls.push(`${request.method} ${request.url}`);
      if (mode === "auth") return { status: 401, data: { message: KEY } };
      if (mode === "rate") return { status: 429, data: {} };
      if (request.method === "POST" && request.url.endsWith("/cancel")) return { status: 200, data: {} };
      if (request.method === "POST") return { status: 200, data: { agent: { id: "bc-e" }, run: { id: "run-e", status: "RUNNING" } } };
      if (mode === "unsafe") {
        const text = JSON.stringify(citingBundle(fixture.material, QUERY)).replaceAll(fixture.material.originalUrl, "javascript:alert(1)");
        return { status: 200, data: { status: "FINISHED", result: text } };
      }
      return { status: 200, data: { status: "FINISHED", result: `the secret is ${KEY}` } };
    });
    const saved: AnalysisBundle[] = [];
    const { service, storePath } = build(dir, transport, saved);
    const auth = await service.start(runInput(QUERY, null));
    assert.equal(auth.errorCode, "auth_failed");
    assert.equal(calls.length, 1);
    const again = await service.start(runInput(QUERY, null));
    assert.equal(again.id, auth.id);
    assert.equal(calls.length, 1);
    const stored = await readFile(storePath, "utf8");
    assert.equal(stored.includes(KEY), false);

    mode = "rate";
    const rateDir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-rate-"));
    const rateCalls: string[] = [];
    const rateTransport = createMockTransport(async (request) => {
      rateCalls.push(request.url);
      return { status: 429, data: { message: KEY } };
    });
    const rate = build(rateDir, rateTransport, []);
    const limited = await rate.service.start(runInput("Another harbor question", null));
    assert.equal(limited.errorCode, "rate_limited");
    await rate.service.poll(limited.id);
    assert.equal(rateCalls.length, 1);
    assert.equal((await readFile(rate.storePath, "utf8")).includes(KEY), false);
    await rm(rateDir, { recursive: true, force: true });

    mode = "unsafe";
    const unsafeDir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-url-"));
    let clock = Date.parse("2026-11-13T00:00:00.000Z");
    const unsafeCalls: string[] = [];
    const unsafeTransport = createMockTransport(async (request) => {
      unsafeCalls.push(`${request.method} ${request.url}`);
      if (request.method === "POST" && request.url.endsWith("/v1/agents")) {
        return { status: 200, data: { agent: { id: "bc-t" }, run: { id: "run-t", status: "RUNNING" } } };
      }
      if (request.url.endsWith("/cancel")) return { status: 200, data: {} };
      return { status: 200, data: { status: "FINISHED", result: JSON.stringify(citingBundle(fixture.material, "Clock topic for timeout")) } };
    });
    const timeoutService = build(unsafeDir, unsafeTransport, [], { now: () => clock, timeoutMs: 1_000, pollIntervalMs: 0 });
    const started = await timeoutService.service.start(runInput("Clock topic for timeout", null));
    clock += 10_000;
    const expired = await timeoutService.service.poll(started.id);
    assert.equal(expired?.status, "expired");
    assert.equal(unsafeCalls.filter((call) => call.startsWith("POST") && call.endsWith("/v1/agents")).length, 1);
    assert.equal(unsafeCalls.some((call) => call.includes("/cancel")), true);
    await rm(unsafeDir, { recursive: true, force: true });

    const echoDir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-echo-"));
    const echoTransport = createMockTransport(async (request) => {
      if (request.method === "POST") return { status: 200, data: { agent: { id: "bc-s" }, run: { id: "run-s", status: "RUNNING" } } };
      return { status: 200, data: { status: "FINISHED", result: `{"leak":"${KEY}"}` } };
    });
    const echo = build(echoDir, echoTransport, []);
    const echoJob = await echo.service.start(runInput("Echo topic should fail closed", null));
    const echoResult = await echo.service.poll(echoJob.id);
    assert.equal(echoResult?.errorCode, "sensitive_echo");
    assert.equal((await readFile(echo.storePath, "utf8")).includes(KEY), false);
    assert.equal(JSON.stringify(echoResult).includes(KEY), false);
    await rm(echoDir, { recursive: true, force: true });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a finished run that names a real outlet is rejected and not stored", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-cursor-unsafe-"));
  try {
    const saved: AnalysisBundle[] = [];
    const transport = createMockTransport(async (request) => {
      if (request.method === "POST") return { status: 200, data: { agent: { id: "bc-u" }, run: { id: "run-u", status: "RUNNING" } } };
      const text = JSON.stringify(citingBundle(fixture.material, QUERY)).replaceAll(
        fixture.material.originalUrl,
        "https://www.nytimes.com/2026/11/01/example.html",
      );
      return { status: 200, data: { status: "FINISHED", result: text } };
    });
    const { service } = build(dir, transport, saved);
    const job = await service.start(runInput(QUERY, null));
    const polled = await service.poll(job.id);
    assert.equal(polled?.errorCode, "invented_source");
    assert.equal(saved.length, 0);
    assert.equal(polled?.bundleId, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

function build(
  dir: string,
  transport: ReturnType<typeof createMockTransport>,
  saved: AnalysisBundle[],
  extra: { now?: () => number; timeoutMs?: number; pollIntervalMs?: number } = {},
): { service: CursorAnalysisService; storePath: string } {
  const storePath = path.join(dir, "cursor-jobs.json");
  const client = createCursorClient({
    getApiKey: () => KEY,
    apiBase: "https://api.cursor.com",
    transport,
  });
  const service = createCursorAnalysisService({
    client,
    storePath,
    persistBundle: async (bundle) => {
      saved.push(bundle);
    },
    getApiKey: () => KEY,
    allowNetwork: () => true,
    resolveSources: async (ids) => {
      if (ids.length === 0) throw new CorpusError("no_sources");
      if (ids.some((id) => id !== fixture.material.id)) throw new CorpusError("unknown_source");
      return fixture.resolved;
    },
    pollIntervalMs: extra.pollIntervalMs ?? 0,
    timeoutMs: extra.timeoutMs,
    now: extra.now,
  });
  return { service, storePath };
}
