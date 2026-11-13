import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeAnalysisIdParam } from "@/lib/analysis/request-id";
import { storedSchemaVersion } from "@/lib/store/schema-lookup";
import { fixtureById } from "@/lib/demo/catalog";

test("incomplete percent-encoding is a 400, not a thrown URIError", () => {
  const decoded = decodeAnalysisIdParam("bnd_%E0%A4%A");
  assert.equal(decoded.ok, false);
  if (decoded.ok) return;
  assert.equal(decoded.status, 400);
  assert.equal(decoded.code, "INVALID_FORMAT");
});

test("a well-formed unknown-style id that fails the pattern is 404", () => {
  const decoded = decodeAnalysisIdParam("not-a-bundle");
  assert.equal(decoded.ok, false);
  if (decoded.ok) return;
  assert.equal(decoded.status, 404);
});

test("a valid fixture id decodes", () => {
  const decoded = decodeAnalysisIdParam("bnd_ai_animation_2026");
  assert.deepEqual(decoded, { ok: true, id: "bnd_ai_animation_2026" });
});

test("the vendored unsupported-schema QA fixture is visible without the runtime store", () => {
  assert.equal(storedSchemaVersion("bnd_schema_999"), "9.9.9");
});

test("the two prepared briefings are loadable as fixtures", () => {
  assert.equal(fixtureById("bnd_ai_animation_2026")?.bundle_id, "bnd_ai_animation_2026");
  assert.equal(fixtureById("bnd_demo_ai_animation")?.bundle_id, "bnd_demo_ai_animation");
});
