import assert from "node:assert/strict";
import { test } from "node:test";
import { timelineLines } from "@/lib/adapters/markdown";
import { classifyStoredBundle } from "@/lib/adapters/schema-version";
import { publicFailure } from "@/lib/analysis/errors";
import { allowRequest } from "@/lib/analysis/rate-limit";

test("a dated timeline is listed and an undated one says so", () => {
  assert.deepEqual(timelineLines([]), ["No timeline data available"]);
  assert.deepEqual(timelineLines([{ date: null, event: "No date was stored." }]), ["No timeline data available"]);
  assert.deepEqual(timelineLines([{ date: "2023-11-09", event: "A dated event." }]), ["- 2023-11-09: A dated event."]);
});

test("an unreadable 1.2.0 record is surfaced instead of dropped", () => {
  const classified = classifyStoredBundle({ bundle_id: "bnd_badshape", schema_version: "1.2.0" });
  assert.equal(classified?.kind, "invalid");
});

test("the eleventh request in a minute is refused", () => {
  const key = `probe-${Date.now()}`;
  for (let count = 0; count < 10; count += 1) assert.equal(allowRequest(key, 1_000), true);
  assert.equal(allowRequest(key, 1_000), false);
  assert.equal(allowRequest(key, 61_000), true);
});

test("API failures do not include server paths", async () => {
  const response = publicFailure(new Error("EACCES: permission denied, open '/workspace/secret/analyses.json'"), {
    message: "The demo store could not be read.",
    status: 500,
    code: "PARSE_FAILED",
    recoverable: true,
  });
  const body = await response.text();
  assert.equal(body.includes("/workspace"), false);
  assert.equal(body.includes("EACCES"), false);
  assert.equal(body.includes("ANALYSIS_PROVIDER"), false);
  assert.match(body, /The demo store could not be read/);
  const payload = JSON.parse(body) as { errors: Array<{ code: string; message: string; field: null; recoverable: boolean }> };
  assert.equal(payload.errors[0]?.code, "PARSE_FAILED");
  assert.equal(payload.errors[0]?.field, null);
  assert.equal(payload.errors[0]?.recoverable, true);
});
