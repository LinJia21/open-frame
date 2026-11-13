/** Zod + cross-object integrity check (checkBundleIntegrity runs inside AnalysisBundleSchema). Usage: tsx zodcheck.ts <bundle.json>... */
import fs from "node:fs";
import { AnalysisBundleSchema, VERBATIM_ORIGINS } from "../types/openframe";
let fail = 0;
for (const p of process.argv.slice(2)) {
  const raw = JSON.parse(fs.readFileSync(p, "utf8"));
  const r = AnalysisBundleSchema.safeParse(raw);
  if (!r.success) { fail = 1; console.log("ZOD/INTEGRITY FAIL", p, JSON.stringify(r.error.issues.slice(0, 20), null, 1)); continue; }
  const b = r.data;
  const ev = b.evidence_audit.audits.flatMap((a) => [...a.supporting_evidence, ...a.contradicting_evidence]);
  const art = new Map(b.articles.map((a) => [a.id, a]));
  const verb = ev.filter((e) => e.excerpt_is_verbatim);
  // Belt-and-braces: the auditor's exact-substring rule, recomputed here.
  const bad = verb.filter((e) => { const a = art.get(e.article_id)!; return !(a.accessible_text ?? "").includes(e.excerpt ?? "\u0000") || !VERBATIM_ORIGINS.includes(a.accessible_text_origin!); });
  if (b.analysis_generation !== "PRECOMPUTED") { fail = 1; console.log("FIXTURE FAIL", p, "fixtures must be PRECOMPUTED"); }
  if (bad.length) { fail = 1; console.log("VERBATIM FAIL", p, bad.map((e) => e.id)); continue; }
  const statuses = b.evidence_audit.audits.reduce<Record<string, number>>((m, a) => ((m[a.status] = (m[a.status] ?? 0) + 1), m), {});
  console.log("ZOD+INTEGRITY OK", p, `articles=${b.articles.length} claims=${b.claim_extraction.claims.length} audits=${b.evidence_audit.audits.length} evidence=${ev.length} verbatim_excerpts=${verb.length} (all exact substrings)`, JSON.stringify(statuses));
}
process.exit(fail);
