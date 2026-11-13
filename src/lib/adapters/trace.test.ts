import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AnalysisBundleSchema } from "@/lib/openframe/openframe";
import { toBriefingView } from "@/lib/adapters/to-view";
import { FIXTURE_IDS } from "@/lib/analysis/fixture-ids";

test("1.2.0 bottom line and findings link to stored claim ids", () => {
  const bundle = AnalysisBundleSchema.parse(
    JSON.parse(readFileSync("spec/data/sample-analysis-ai-animation.json", "utf8")),
  );
  const view = toBriefingView(bundle);
  assert.match(view.masthead, /Real sources/);
  assert.equal(view.masthead.includes("Fictional"), false);
  assert.ok(view.report.bottomLineClaimIds);
  assert.ok(view.report.bottomLineClaimIds.every((id) => id.startsWith("clm_")));
  assert.ok(view.report.findings.every((finding) => finding.claimIds && finding.claimIds.length > 0));
  const shown = view.audits.flatMap((audit) => [...audit.supporting, ...audit.contradicting, ...audit.unverifiable]);
  assert.ok(shown.some((item) => item.quoteVerification === "unverifiable"));
  assert.ok(shown.filter((item) => item.quoteVerification === "unverifiable").every((item) => !item.asQuotation && !item.countsTowardVerified));
  assert.ok(shown.filter((item) => item.asQuotation).every((item) => item.quoteVerification === "verified_substring"));
});

test("fixture ids used for 404 checks match the datasets", () => {
  for (const file of ["spec/data/sample-analysis-ai-animation.json", "spec/data/demo-dataset.json"]) {
    const bundle = JSON.parse(readFileSync(file, "utf8")) as { bundle_id: string };
    assert.ok(FIXTURE_IDS.includes(bundle.bundle_id as (typeof FIXTURE_IDS)[number]));
  }
});

test("an unknown schema version is not guessed", () => {
  const bundle = AnalysisBundleSchema.parse(
    JSON.parse(readFileSync("spec/data/demo-dataset.json", "utf8")),
  );
  const broken = { ...bundle, schema_version: "9.9.9" };
  assert.throws(
    () => toBriefingView(broken as typeof bundle),
    (error: unknown) => error instanceof Error && error.name === "UnsupportedSchemaVersionError",
  );
});
