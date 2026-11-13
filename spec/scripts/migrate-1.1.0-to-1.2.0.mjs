/**
 * Mechanical 1.1.0 -> 1.2.0 migration. Usage: node migrate-1.1.0-to-1.2.0.mjs in.json out.json
 * Adds/derives every new required field; never invents evidence or upgrades a status. Items it cannot decide are
 * printed as TODO lines and left so that validation FAILS until a person fixes them (no silent "fixes").
 * See MIGRATION-1.1.0-to-1.2.0.md.
 */
import fs from "node:fs";
const [, , inp, outp] = process.argv;
if (!inp || !outp) { console.error("usage: node migrate-1.1.0-to-1.2.0.mjs in.json out.json"); process.exit(2); }
const b = JSON.parse(fs.readFileSync(inp, "utf8"));
const todo = [];
const ORIGIN = { web_fetch: "page_capture", pdf_download: "pdf_text", web_search_snippet: "search_snippet", api: "api_response", rss: "rss_item", manual_entry: "user_supplied", generated_demo: "generated_demo" };
const VERBATIM_OK = new Set(["page_capture", "pdf_text", "api_response", "rss_item", "user_supplied", "generated_demo"]);
const MAX = { Verified: "established", "Partially Supported": "partially_established", Disputed: "contested", Unverified: "not_established", Contradicted: "not_established" };
const insertAfter = (o, after, key, val) => { if (key in o) return; const e = Object.entries(o); const i = e.findIndex(([k]) => k === after); e.splice(i < 0 ? e.length : i + 1, 0, [key, val]); for (const k of Object.keys(o)) delete o[k]; Object.assign(o, Object.fromEntries(e)); };
// 1. schema_version
const walk = (v) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") { if (v.schema_version === "1.1.0") v.schema_version = "1.2.0"; Object.values(v).forEach(walk); } };
walk(b);
// 2. articles: accessible_text_origin, fictional_demo_publisher
const arts = new Map();
for (const a of b.articles ?? []) {
  insertAfter(a, "accessible_text", "accessible_text_origin", a.accessible_text == null ? null : (ORIGIN[a.retrieval_method] ?? "user_supplied"));
  if (a.publisher && !("fictional_demo_publisher" in a.publisher)) a.publisher.fictional_demo_publisher = a.data_mode === "DEMO";
  arts.set(a.id, a);
}
// 3. quotes: verified_substring (+span) | unverifiable | paraphrase
const classify = (articleId, text, where) => {
  const a = arts.get(articleId);
  const checkable = a && a.accessible_text != null && VERBATIM_OK.has(a.accessible_text_origin) && a.paywalled !== true;
  if (checkable && text && a.accessible_text.includes(text)) { const s = a.accessible_text.indexOf(text); return { qv: "verified_substring", span: { start: s, end: s + text.length } }; }
  if (!checkable) return { qv: "unverifiable", span: null };
  todo.push(`${where}: marked verbatim but not an exact substring of ${articleId}.accessible_text -> copy the exact text, store the source text, or rewrite as paraphrase`);
  return { qv: "verified_substring", span: null }; // left invalid on purpose (QTE-002/003)
};
for (const au of b.evidence_audit?.audits ?? []) {
  const unver = [];
  for (const e of [...(au.supporting_evidence ?? []), ...(au.contradicting_evidence ?? [])]) {
    if (!("quote_verification" in e)) {
      if (e.excerpt_is_verbatim && e.excerpt) {
        const { qv, span } = classify(e.article_id, e.excerpt, `evidence ${e.id}`);
        insertAfter(e, "excerpt_is_verbatim", "quote_verification", qv); insertAfter(e, "quote_verification", "excerpt_span", span);
        if (qv === "unverifiable") e.excerpt_is_verbatim = false;
      } else { insertAfter(e, "excerpt_is_verbatim", "quote_verification", "paraphrase"); insertAfter(e, "quote_verification", "excerpt_span", null); }
    }
    if (e.quote_verification === "unverifiable") unver.push(e.id);
  }
  insertAfter(au, "independent_source_count", "unverifiable_evidence_ids", unver);
  if (au.status === "Verified" && unver.length) todo.push(`audit ${au.id}: Verified with unverifiable evidence ${JSON.stringify(unver)} -> re-check AUD-001 (unverifiable items no longer count); downgrade honestly if needed`);
}
for (const aa of b.narrative_comparison?.article_analyses ?? []) for (const q of aa.source_selection?.quoted_voices ?? []) {
  if ("quote_verification" in q) continue;
  if (q.quote_mode === "verbatim") { const { qv, span } = classify(aa.article_id, q.verbatim_quote, `quote by ${q.speaker} in ${aa.article_id}`); q.quote_verification = qv; q.quote_span = span; }
  else { q.quote_verification = "paraphrase"; q.quote_span = null; }
}
// 4. report: timeline source ids, key_findings, executive_summary.finding_ids
const rep = b.research_report;
if (rep) {
  const byArticle = new Map((rep.source_list ?? []).map((s) => [s.article_id, s.id]));
  for (const t of rep.topic_background?.timeline ?? []) t.source_ids = (t.source_ids ?? []).map((id) => byArticle.get(id) ?? id);
  if (!rep.key_findings) {
    const audits = new Map((b.evidence_audit?.audits ?? []).map((a) => [a.id, a]));
    rep.key_findings = (rep.key_claim_verification ?? []).map((k, i) => {
      const au = audits.get(k.audit_id); const status = au?.status ?? k.status;
      return { id: `fnd_migrated_${String(i + 1).padStart(2, "0")}`, statement: `${k.claim_text} (${status})`, strength: MAX[status] ?? "not_established",
        claim_ids: [k.claim_id], audit_ids: [k.audit_id], basis_note: "Auto-generated by migrate-1.1.0-to-1.2.0 from key_claim_verification; replace with an analyst-written finding." };
    });
    todo.push(`research_report.key_findings: ${rep.key_findings.length} placeholder findings generated (one per key_claim_verification row); rewrite them as real conclusions`);
  }
  if (rep.executive_summary && !rep.executive_summary.finding_ids) rep.executive_summary.finding_ids = rep.key_findings.map((f) => f.id);
}
fs.writeFileSync(outp, JSON.stringify(b, null, 2) + "\n");
console.log("migrated", inp, "->", outp);
for (const t of todo) console.log("TODO", t);
