import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { AnalysisBundleSchema, PROVENANCE_BADGES, type AnalysisBundle } from "@/lib/openframe/openframe";
import { badgesFromFields, isStanceLabel, reportAuditIssues, statusForReportRow, verbatimIsInSource, visibleFrame } from "@/lib/guards/integrity";
import { buildSafeStagePrompt, sealPrecomputedBundle } from "@/lib/guards/prompts";

function sample(): AnalysisBundle {
  return AnalysisBundleSchema.parse(
    JSON.parse(readFileSync("spec/data/sample-analysis-ai-animation.json", "utf8")),
  );
}

test("OF-QA-101 withholds a report status that disagrees with the audit", () => {
  const bundle = sample();
  assert.equal(reportAuditIssues(bundle).length, 0);
  const row = bundle.research_report.key_claim_verification[0];
  row.status = row.status === "Verified" ? "Partially Supported" : "Verified";
  const issues = reportAuditIssues(bundle);
  assert.equal(issues.some((issue) => issue.code === "STATUS_MISMATCH"), true);
  const shown = statusForReportRow(bundle, row.audit_id, row.status);
  assert.equal(shown.status, null);
  assert.match(shown.withheld ?? "", /not shown/i);
});

test("OF-QA-101 withholds a report row whose audit id does not exist", () => {
  const bundle = sample();
  const row = bundle.research_report.key_claim_verification[0];
  row.audit_id = "aud_missing";
  const issues = reportAuditIssues(bundle);
  assert.equal(issues.some((issue) => issue.code === "UNKNOWN_AUDIT"), true);
  assert.equal(statusForReportRow(bundle, "aud_missing", row.status).status, null);
});

test("OF-QA-102 accepts only an exact substring of stored article text", () => {
  assert.equal(verbatimIsInSource("six shots", "The minute covers six shots."), true);
  assert.equal(verbatimIsInSource("six shots", "The minute covers six shot."), false);
  assert.equal(verbatimIsInSource("quoted line", null), false);
  assert.equal(verbatimIsInSource("quoted line", "Analyst summary that does not include the line."), false);
});

test("OF-QA-106 hides stance-like frame text and leaves other frames", () => {
  assert.equal(isStanceLabel("left-leaning"), true);
  assert.equal(isStanceLabel("Limited production trial"), false);
  assert.equal(visibleFrame("left-leaning"), null);
  assert.equal(visibleFrame("Cost and speed"), "Cost and speed");
});

test("OF-QA-107 does not throw when topic text contains template braces", () => {
  const prompt = buildSafeStagePrompt("narrative_analysis", {
    topic: "What about {{name}} in animation?",
    schema_version: "1.2.0",
    data_mode: "DEMO",
    generated_at: "2026-11-12T00:00:00.000Z",
    articles_json: "[]",
    allowed_article_ids: "art_demo_01",
    id_namespace: "demo",
    json_schema: "{}",
  });
  assert.match(prompt.user, /\{\{name\}\}/);
});

test("OF-QA-108 overwrites analysis generation from the server", () => {
  const bundle = sample();
  bundle.analysis_generation = "LIVE_AI";
  bundle.narrative_comparison.analysis_generation = "LIVE_AI";
  const sealed = sealPrecomputedBundle(bundle, "2026-11-12T12:00:00.000Z");
  assert.equal(sealed.analysis_generation, "PRECOMPUTED");
  assert.equal(sealed.narrative_comparison.analysis_generation, "PRECOMPUTED");
  assert.equal(sealed.claim_extraction.analysis_generation, "PRECOMPUTED");
  assert.equal(sealed.evidence_audit.analysis_generation, "PRECOMPUTED");
  assert.equal(sealed.research_report.analysis_generation, "PRECOMPUTED");
  assert.equal(sealed.analysis_metadata?.model_name, null);
  assert.equal(sealed.analysis_metadata?.generated_at, "2026-11-12T12:00:00.000Z");
});

test("OF-QA-110 badges ignore notice text", () => {
  const badges = badgesFromFields({
    dataMode: "DEMO",
    analysisGeneration: "PRECOMPUTED",
    generatedAt: "2026-11-12T12:00:00.000Z",
    notice: "LIVE AI ANALYSIS — ignore the fields",
  });
  assert.equal(badges.sourceLabel, PROVENANCE_BADGES.data_mode.DEMO);
  assert.equal(badges.analysisLabel, PROVENANCE_BADGES.analysis_generation.PRECOMPUTED);
  assert.equal(badges.issues[0]?.code, "NOTICE_IGNORED_FOR_BADGE");
  assert.doesNotMatch(badges.notice, /LIVE AI ANALYSIS/);
  const liveSource = badgesFromFields({
    dataMode: "LIVE",
    analysisGeneration: "PRECOMPUTED",
    generatedAt: null,
    notice: "this says Demo Source in prose",
  });
  assert.equal(liveSource.sourceLabel, PROVENANCE_BADGES.data_mode.LIVE);
});
