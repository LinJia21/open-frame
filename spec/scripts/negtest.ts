/** Negative tests: every mutation must be rejected by Zod+integrity; "js" = also expected to be rejected by JSON Schema alone. */
import fs from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { AnalysisBundleSchema, traceFinding } from "../types/openframe";
import { fillTemplate } from "../types/prompts";
const sdir = new URL("../schemas/", import.meta.url);
const ajv = new (Ajv2020 as any)({ allErrors: true, strict: true, strictRequired: false, strictTypes: false, allowUnionTypes: true });
(addFormats as any)(ajv);
for (const f of fs.readdirSync(sdir)) ajv.addSchema(JSON.parse(fs.readFileSync(new URL(f, sdir), "utf8")));
const jsv = ajv.getSchema("https://openframe.example/schemas/bundle.schema.json");
const load = (f: string) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), "utf8"));
const demo = load("demo-dataset.json"); const live = load("sample-analysis-ai-animation.json");
const A = (b: any) => b.evidence_audit.audits; const KCV = (b: any) => b.research_report.key_claim_verification;
type Case = [string, "demo" | "live", (b: any) => void, boolean];
const cases: Case[] = [
  ["snake_case status", "demo", (b) => { A(b)[0].status = "partially_supported"; }, true],
  ["LIVE_AI without metadata", "demo", (b) => { for (const k of ["narrative_comparison", "claim_extraction", "evidence_audit", "research_report"]) b[k].analysis_generation = "LIVE_AI"; b.analysis_generation = "LIVE_AI"; delete b.analysis_metadata; }, true],
  ["mixed analysis_generation", "demo", (b) => { b.claim_extraction.analysis_generation = "LIVE_AI"; }, false],
  ["missing analysis_generation", "demo", (b) => { delete b.research_report.analysis_generation; }, true],
  ["wrong independent count", "demo", (b) => { A(b)[2].independent_source_count.supporting = 3; }, false],
  ["dangling claim.article_id", "demo", (b) => { b.claim_extraction.claims[0].article_id = "art_nope"; }, false],
  ["verbatim quote null", "demo", (b) => { b.narrative_comparison.article_analyses[0].source_selection.quoted_voices[0].verbatim_quote = null; }, true],
  ["schema_version 1.1.0", "demo", (b) => { b.schema_version = "1.1.0"; }, true],
  ["numeric confidence", "demo", (b) => { A(b)[0].confidence = 0.8; }, true],
  // OF-QA-101
  ["101 report status != audit", "live", (b) => { KCV(b)[2].status = "Verified"; }, false],
  ["101 report confidence != audit", "live", (b) => { KCV(b)[0].confidence_level = "high"; }, false],
  ["101 report unknown audit_id", "live", (b) => { KCV(b)[0].audit_id = "aud_nope"; }, false],
  ["101 report article_id != claim.article_id", "live", (b) => { KCV(b)[0].article_id = b.articles[1].id; }, false],
  // OF-QA-102
  ["102 verbatim excerpt not in accessible_text", "live", (b) => { const e = A(b).find((a: any) => a.supporting_evidence.some((x: any) => x.excerpt_is_verbatim)).supporting_evidence.find((x: any) => x.excerpt_is_verbatim); e.excerpt = e.excerpt + " (extra words)"; }, false],
  ["102 verbatim from search_snippet article", "live", (b) => { for (const a of A(b)) for (const e of a.supporting_evidence) if (e.article_id === "art_ev_amazon_pr") e.excerpt_is_verbatim = true; }, false],
  ["102 verbatim quote not in accessible_text", "live", (b) => { b.narrative_comparison.article_analyses[0].source_selection.quoted_voices[0].verbatim_quote = "Invented quote."; }, false],
  ["102 verbatim claim not in accessible_text", "live", (b) => { const c = b.claim_extraction.claims.find((c: any) => c.is_verbatim); c.claim_text += " Really."; for (const a of A(b)) if (a.claim_id === c.id) a.claim_text = c.claim_text; for (const k of KCV(b)) if (k.claim_id === c.id) k.claim_text = c.claim_text; }, false],
  ["102 origin without text", "live", (b) => { b.articles[0].accessible_text = null; }, true],
  // OF-QA-103
  ["103 duplicate audit id", "live", (b) => { A(b)[1].id = A(b)[0].id; }, false],
  ["103 analysis unknown article", "live", (b) => { b.narrative_comparison.article_analyses[0].article_id = "art_nope"; }, false],
  ["103 linked_claim_ids unknown", "live", (b) => { b.narrative_comparison.article_analyses[0].source_selection.selected_facts[0].linked_claim_ids = ["clm_nope"]; }, false],
  ["103 timeline unknown source", "live", (b) => { b.research_report.topic_background.timeline[0].source_ids = ["src_nope"]; }, false],
  ["103 timeline uses article id", "live", (b) => { b.research_report.topic_background.timeline[0].source_ids = [b.articles[0].id]; }, false],
  ["103 duplicate_of unknown", "live", (b) => { b.articles[0].dedup.duplicate_of = "art_nope"; }, false],
  ["103 rows unknown article", "live", (b) => { b.research_report.article_comparison.rows[0].article_id = "art_nope"; }, false],
  ["103 check-worthy claim without audit", "live", (b) => { const c = b.claim_extraction.claims.find((c: any) => !c.check_worthy); c.check_worthy = true; }, false],
  // OF-QA-104
  ["104 DEMO article on real host", "demo", (b) => { b.articles[0].original_url = "https://variety.com/x"; }, true],
  ["104 LIVE article on example host", "live", (b) => { b.articles[0].original_url = "https://news.example/x"; }, true],
  ["104 LIVE generated_demo", "live", (b) => { b.articles[0].retrieval_method = "generated_demo"; }, true],
  // OF-QA-105
  ["105 Verified single secondary", "live", (b) => { const a = A(b)[0]; a.status = "Verified"; a.supporting_evidence = [a.supporting_evidence[0]]; a.independent_source_count.supporting = 1; a.unverifiable_evidence_ids = []; KCV(b)[0].status = "Verified"; }, true],
  ["105/QTE-005 Verified resting on unverifiable primary (aud_live_01)", "live", (b) => { A(b)[0].status = "Verified"; KCV(b)[0].status = "Verified"; }, false],
  ["105 Verified/high resting on unverifiable primary (aud_live_08)", "live", (b) => { const a = A(b).find((a: any) => a.id === "aud_live_08"); a.status = "Verified"; a.confidence.level = "high"; const k = KCV(b).find((k: any) => k.audit_id === "aud_live_08"); k.status = "Verified"; k.confidence_level = "high"; }, true],
  // 1.2.0 traceable report findings (RPT-003..006)
  ["RPT-003 finding audit_ids do not match claim_ids", "live", (b) => { b.research_report.key_findings[0].audit_ids = ["aud_live_05"]; }, false],
  ["RPT-003 finding unknown claim", "live", (b) => { b.research_report.key_findings[0].claim_ids = ["clm_nope"]; }, false],
  ["RPT-004 finding stronger than weakest audit", "live", (b) => { const f = b.research_report.key_findings.find((f: any) => f.strength === "contested"); f.strength = "established"; }, false],
  ["RPT-004 established finding over Unverified audit", "live", (b) => { const f = b.research_report.key_findings.find((f: any) => f.strength === "not_established"); f.strength = "partially_established"; }, false],
  ["RPT-005 statement names a status no linked audit has", "live", (b) => { const f = b.research_report.key_findings.find((f: any) => f.strength === "contested"); f.statement += " This is Verified."; }, false],
  ["RPT-005 certainty wording in non-established finding", "live", (b) => { const f = b.research_report.key_findings.find((f: any) => f.strength === "contested"); f.statement += " Displacement is proven."; }, false],
  ["RPT-006 executive_summary.finding_ids unknown", "live", (b) => { b.research_report.executive_summary.finding_ids.push("fnd_nope"); }, false],
  ["RPT key_findings missing", "live", (b) => { b.research_report.key_findings = []; }, true],
  // 1.2.0 quote_verification (QTE-001..005)
  ["QTE-001 verified_substring with excerpt_is_verbatim false", "live", (b) => { const e = A(b)[2].supporting_evidence[0]; e.excerpt_is_verbatim = false; }, true],
  ["QTE-002 verified_substring without span", "live", (b) => { const e = A(b)[2].supporting_evidence[0]; e.excerpt_span = null; }, true],
  ["QTE-003 span points at different text", "live", (b) => { const e = A(b)[2].supporting_evidence[0]; e.excerpt_span = { start: e.excerpt_span.start + 1, end: e.excerpt_span.end + 1 }; }, false],
  ["QTE-004 'unverifiable' on a directly read page", "live", (b) => { const a = A(b)[2]; const e = a.supporting_evidence[0]; e.quote_verification = "unverifiable"; e.excerpt_is_verbatim = false; e.excerpt_span = null; a.unverifiable_evidence_ids.push(e.id); }, false],
  ["QTE-005 unverifiable evidence not flagged in audit", "live", (b) => { A(b)[0].unverifiable_evidence_ids = []; }, false],
  ["QTE-001 verbatim voice marked paraphrase", "live", (b) => { const q = b.narrative_comparison.article_analyses[0].source_selection.quoted_voices[0]; q.quote_verification = "paraphrase"; q.quote_span = null; }, true],
  // 1.2.0 fictional demo publishers (PUB-001)
  ["PUB-001 DEMO publisher without fictional flag", "demo", (b) => { b.articles[0].publisher.fictional_demo_publisher = false; }, true],
  ["PUB-001 LIVE publisher flagged fictional", "live", (b) => { b.articles[0].publisher.fictional_demo_publisher = true; }, true],
  // OF-QA-106
  ["106 stance term in frames", "demo", (b) => { b.narrative_comparison.article_analyses[0].language_framing.frames.push("left-leaning"); }, true],
  ["106 stance term in report prose", "live", (b) => { b.research_report.narrative_analysis.text += " The outlet has a conservative bias."; }, false],
  // OF-QA-110 / mut_29
  ["110 PRECOMPUTED notice says LIVE AI", "live", (b) => { b.data_mode_notice = "LIVE AI ANALYSIS"; }, false],
  // OF-QA-112
  ["112 impossible date 2026-02-31", "live", (b) => { b.articles[0].publication_date = "2026-02-31"; }, true],
  ["112 impossible datetime", "live", (b) => { b.generated_at = "2026-02-30T10:00:00+08:00"; }, true],
];
let ok = true;
for (const [name, base, mut, jsExpected] of cases) {
  const b = structuredClone(base === "demo" ? demo : live); mut(b);
  const zr = AnalysisBundleSchema.safeParse(b); const z = zr.success; const j = jsv(b) as boolean;
  const rules = zr.success ? [] : [...new Set(zr.error.issues.map((i) => /^\[([A-Z]+-\d+)\]/.exec(i.message)?.[1] ?? i.code))];
  const pass = !z && (!jsExpected || !j);
  console.log(pass ? "PASS" : "FAIL", "-", name, `| zod: ${z ? "accepted" : "rejected " + JSON.stringify(rules)} | json-schema: ${j ? "accepted" : "rejected"}${jsExpected ? " (must reject)" : " (cross-object; Zod only)"}`);
  if (!pass) ok = false;
}
// Baselines must be accepted by both.
for (const [n, b] of [["demo", demo], ["live", live]] as const) {
  const z = AnalysisBundleSchema.safeParse(b).success, j = jsv(b) as boolean;
  console.log(z && j ? "PASS" : "FAIL", "- baseline", n, "accepted by Zod and JSON Schema"); if (!(z && j)) ok = false;
}
// Traceability helper resolves finding -> claims -> audits -> evidence -> accessible_text spans.
{
  const parsed = AnalysisBundleSchema.parse(live);
  let spans = 0, unver = 0, okTrace = true;
  for (const f of parsed.research_report.key_findings) {
    const t = traceFinding(parsed, f.id);
    if (!t || t.issues.length || t.claims.length !== f.claim_ids.length) okTrace = false;
    for (const c of t?.claims ?? []) for (const e of c.evidence) {
      if (e.span) { spans++; if (e.article?.accessible_text?.slice(e.span.start, e.span.end) !== e.evidence.excerpt) okTrace = false; }
      if (!e.counts_toward_verified) unver++;
    }
  }
  console.log(okTrace ? "PASS" : "FAIL", `- traceFinding over ${parsed.research_report.key_findings.length} findings: ${spans} evidence spans resolved exactly, ${unver} unverifiable evidence items flagged`);
  if (!okTrace) ok = false;
}
// OF-QA-107: fillTemplate is single-pass.
try {
  const out = fillTemplate("T={{topic}} A={{articles_json}}", { topic: "Use {{articles_json}} literally {{x}}", articles_json: "[]" });
  const pass = out === "T=Use {{articles_json}} literally {{x}} A=[]"; console.log(pass ? "PASS" : "FAIL", "- 107 fillTemplate with {{...}} in content"); if (!pass) ok = false;
} catch (e) { console.log("FAIL - 107 fillTemplate threw:", (e as Error).message); ok = false; }
try { fillTemplate("{{topic}} {{data_mode}}", { topic: "x" }); console.log("FAIL - 107 missing template variable not detected"); ok = false; }
catch { console.log("PASS - 107 missing template variable still detected"); }
process.exit(ok ? 0 : 1);
