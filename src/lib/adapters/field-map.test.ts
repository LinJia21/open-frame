import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { briefingToMarkdown } from "@/lib/adapters/markdown";
import { toBriefingView } from "@/lib/adapters/to-view";
import { EvidenceBody, PerspectivesBody } from "@/components/briefing/views";
import { messages } from "@/lib/i18n/messages";
import { AnalysisBundleSchema, type AnalysisBundle } from "@/lib/openframe/openframe";
import { sealPrecomputedBundle } from "@/lib/guards/prompts";

function load(name: string): AnalysisBundle {
  return AnalysisBundleSchema.parse(JSON.parse(readFileSync(`spec/data/${name}`, "utf8")));
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".test.ts")) out.push(path);
  }
  return out;
}

test("1.2.0 fields are mapped without hardcoded evidence ids", () => {
  const bundle = load("sample-analysis-ai-animation.json");
  const view = toBriefingView(bundle);
  assert.equal(view.schemaVersion, "1.2.0");
  assert.ok(view.articles.some((article) => article.textOrigin === "search_snippet"));
  assert.ok(view.articles.some((article) => article.textOrigin === "page_capture"));
  const evidenceIds = new Set(
    bundle.evidence_audit.audits.flatMap((audit) => [...audit.supporting_evidence, ...audit.contradicting_evidence].map((item) => item.id)),
  );
  const shownIds = view.audits.flatMap((audit) => [...audit.supporting, ...audit.contradicting, ...audit.unverifiable].map((item) => item.id));
  assert.ok(shownIds.every((id) => evidenceIds.has(id)));
  for (const file of [...walk("src/components"), ...walk("src/app"), ...walk("src/lib/adapters")]) {
    const text = readFileSync(file, "utf8");
    assert.equal(/ev_live_|ev_demo_/.test(text), false, file);
  }
});

test("the paywalled live article shows a Paywalled chip on evidence and perspectives", () => {
  const bundle = load("sample-analysis-ai-animation.json");
  const source = bundle.articles.find((article) => article.id === "art_ev_bloomberg_critterz");
  assert.ok(source);
  assert.equal(source.paywalled, true);
  assert.equal(source.data_mode, "LIVE");
  const view = toBriefingView(bundle);
  const copy = messages.en;
  const perspectives = renderToStaticMarkup(createElement(PerspectivesBody, { view, copy }));
  const evidence = renderToStaticMarkup(createElement(EvidenceBody, { view, copy }));
  for (const html of [perspectives, evidence]) {
    assert.match(html, /Paywalled/);
    assert.match(html, /Snippet only/);
    assert.match(html, /search_snippet/);
    assert.match(html, /art_ev_bloomberg_critterz/);
  }
});

test("unverifiable evidence ids are labeled Quote not checkable and are not counted", () => {
  const bundle = load("sample-analysis-ai-animation.json");
  const view = toBriefingView(bundle);
  const flagged = new Set(bundle.evidence_audit.audits.flatMap((audit) => audit.unverifiable_evidence_ids));
  assert.ok(flagged.size > 0);
  for (const audit of view.audits) {
    const source = bundle.evidence_audit.audits.find((item) => item.id === audit.id);
    assert.ok(source);
    for (const id of source.unverifiable_evidence_ids) {
      assert.equal(audit.supporting.some((item) => item.id === id), false);
      assert.equal(audit.contradicting.some((item) => item.id === id), false);
      const shown = audit.unverifiable.find((item) => item.id === id);
      assert.ok(shown);
      assert.equal(shown.quoteVerification, "unverifiable");
      assert.equal(shown.countsTowardVerified, false);
      assert.equal(shown.asQuotation, false);
      assert.equal(shown.matchLabel, null);
    }
  }
  const markdown = briefingToMarkdown(view);
  assert.match(markdown, /Quote not checkable/);
  assert.equal(/verbatim verified/i.test(markdown), false);
  assert.match(markdown, /Matches stored excerpt/);
});

test("the bottom line follows finding_ids and ignores the sentence text", () => {
  const bundle = load("sample-analysis-ai-animation.json");
  const view = toBriefingView(bundle);
  const linked = new Set(
    bundle.research_report.key_findings
      .filter((finding) => bundle.research_report.executive_summary.finding_ids.includes(finding.id))
      .flatMap((finding) => finding.claim_ids),
  );
  assert.deepEqual(view.report.bottomLineClaimIds, [...linked]);
  bundle.research_report.executive_summary.bottom_line = "A rewritten sentence that names no claim.";
  const again = toBriefingView(bundle);
  assert.deepEqual(again.report.bottomLineClaimIds, view.report.bottomLineClaimIds);
  assert.ok(view.report.timeline.every((event) => event.sourceIds.every((id) => id.startsWith("src_"))));
});

test("a precomputed page does not show an offline model name or live AI", () => {
  const bundle = load("demo-dataset.json");
  bundle.analysis_metadata = {
    generated_at: bundle.analysis_metadata?.generated_at ?? bundle.generated_at,
    model_name: "offline-model-should-stay-hidden",
    prompt_template_id: "hidden-template",
    prompt_version: "9",
  };
  const view = toBriefingView(bundle);
  const markdown = briefingToMarkdown(view);
  const visible = JSON.stringify({ label: view.analysisLabel, masthead: view.masthead, notice: view.notice, markdown });
  assert.equal(visible.includes("offline-model-should-stay-hidden"), false);
  assert.equal(visible.includes("hidden-template"), false);
  assert.equal(/Live AI/i.test(visible), false);
  assert.equal(view.analysisLabel, "Pre-generated Analysis");
  const demoRow = view.report.rows.find((row) => view.articles.find((article) => article.id === row.articleId)?.fictional);
  assert.ok(demoRow);
  assert.equal(demoRow.fictional, true);
});

test("sealing a bundle fills spans before it is parsed", () => {
  const bundle = load("sample-analysis-ai-animation.json");
  const sealed = AnalysisBundleSchema.parse(sealPrecomputedBundle(bundle, bundle.generated_at));
  const verified = sealed.evidence_audit.audits
    .flatMap((audit) => audit.supporting_evidence)
    .find((item) => item.quote_verification === "verified_substring" && item.excerpt);
  assert.ok(verified?.excerpt_span);
  const article = sealed.articles.find((item) => item.id === verified.article_id);
  assert.equal(article?.accessible_text?.slice(verified.excerpt_span.start, verified.excerpt_span.end), verified.excerpt);
});
