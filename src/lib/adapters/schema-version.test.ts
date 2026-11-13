import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { toBriefingView } from "@/lib/adapters/to-view";
import {
  classifyStoredBundle,
  partitionBundles,
  unsupportedSchemaHttpStatus,
  UnsupportedSchemaVersionError,
} from "@/lib/adapters/schema-version";
import type { AnalysisBundle } from "@/lib/openframe/openframe";

test("a demo bundle copied to schema_version 9.9.9 is refused without a guessed mapping", () => {
  const demo = JSON.parse(readFileSync("spec/data/demo-dataset.json", "utf8")) as AnalysisBundle & { schema_version: string };
  const copy = { ...demo, schema_version: "9.9.9", bundle_id: "bnd_schema_999" };
  const classified = classifyStoredBundle(copy);
  assert.ok(classified);
  assert.equal(classified.kind, "unsupported");
  if (classified.kind !== "unsupported") return;
  assert.equal(classified.schemaVersion, "9.9.9");
  assert.equal(classified.bundleId, "bnd_schema_999");

  const error = new UnsupportedSchemaVersionError(classified.schemaVersion).toPayload();
  assert.deepEqual(error, {
    code: "UNSUPPORTED_SCHEMA_VERSION",
    message: "schema_version 9.9.9 is not supported. Supported versions: 1.2.0.",
    field: "schema_version",
    recoverable: false,
  });
  assert.equal(JSON.stringify(error).includes("stack"), false);

  assert.throws(() => toBriefingView(copy as AnalysisBundle), (thrown: unknown) => {
    assert.ok(thrown instanceof UnsupportedSchemaVersionError);
    assert.equal(thrown.toPayload().code, "UNSUPPORTED_SCHEMA_VERSION");
    assert.equal(thrown.message.includes("9.9.9"), true);
    return true;
  });

  const mixed = partitionBundles([copy, demo]);
  assert.equal(mixed.ready.length, 1);
  assert.equal(mixed.ready[0]?.bundle_id, demo.bundle_id);
  assert.equal(mixed.ready[0]?.schema_version, "1.2.0");
  assert.equal(mixed.unsupported.length, 1);
  assert.equal(unsupportedSchemaHttpStatus("9.9.9"), 422);
  assert.equal(unsupportedSchemaHttpStatus("1.2.0"), null);
  assert.equal(unsupportedSchemaHttpStatus(null), 422);
});
