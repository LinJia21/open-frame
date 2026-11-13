# OpenFrame AI: analytical specification (schema_version 1.2.0)

Owner: OpenFrame Analyst. Audience: OpenFrame Builder (Next.js/TypeScript) and OpenFrame Auditor.
Status: **1.2.0** (audit-fix release). It adds required fields and stricter validation, so 1.1.0 documents must be migrated: see `MIGRATION-1.1.0-to-1.2.0.md` and `CHANGELOG.md`. Goal of 1.2.0: a traceable chain **report finding → claim → audit → evidence → span of the original article's stored text**, checkable by machine and showable in the UI.

## Contents of this package

| Path | What it is |
|---|---|
| `schemas/*.schema.json` | JSON Schema (draft 2020-12): `common`, `news-article`, `narrative-comparison`, `claim-extraction`, `evidence-audit`, `research-report`, `bundle` |
| `types/openframe.ts` | Zod v3 schemas that mirror the JSON Schemas, plus inferred TypeScript types and helpers |
| `types/prompts.ts` | Grok prompt templates for each stage (system and user), `fillTemplate`, the retry template and size estimates |
| `prompts/` | Readable Markdown copies of the prompts and `prompts.json`, generated from `prompts.ts` |
| `data/demo-dataset.json` | Complete **DEMO** bundle (fictional sources on reserved domains), `analysis_generation: PRECOMPUTED` |
| `data/sample-analysis-ai-animation.json` | Real-source sample (pre-generated analysis): `data_mode: LIVE` sources, `analysis_generation: PRECOMPUTED`, on the AI-animation topic. It is **not** a live AI run |
| `sample-analysis-ai-animation.md` | Readable version of the sample analysis |
| `sources/news-source-plan.md` | Plan for free news sources, with limits and terms checked against official docs |
| `CHANGELOG.md` | Changes in 1.0.0, 1.1.0 and 1.2.0 |
| `MIGRATION-1.1.0-to-1.2.0.md` | Field additions, new required fields, stricter validations, how to transform 1.1.0 data, code snippet |
| `CORE-README.md` | Short notes for the early core package |
| `scripts/` | Validation helpers: `validate.mjs` (Ajv), `zodcheck.ts` (Zod and integrity checks), `negtest.ts` (negative tests, one per rule), `migrate-1.1.0-to-1.2.0.mjs` (mechanical migration). Run `npm i` and then `npm run ajv` / `npm run zod` / `npm run neg`. Run `npm i` in the spec root too, so `types/` can resolve `zod` |

## 1. Research workflow

```
discovery → metadata/legal-access capture → dedup & syndication → narrative analysis → claim extraction → evidence audit → report
```

1. **Discovery.** Query free sources (see `sources/news-source-plan.md`): GDELT, publisher RSS feeds and primary-source press rooms. Create a `NewsArticle` for each hit with `retrieval_timestamp` and `retrieval_method`.
2. **Legal access.** Store a summary in our own words in `summary`. `accessible_text` may hold only text we're legally allowed to store, and `access_basis` must say why (`publisher_summary`, `open_license`, `excerpt_fair_use`, `public_domain`, `own_summary_only`, `none`). Excerpts should stay short (300 characters or less is recommended; the schema allows up to 2,000).
3. **Dedup and syndication.** Fill in `dedup`:
   - `duplicate_of`: the article is a near-verbatim copy of another one.
   - `syndicated_from`: wire copy or a republished press release.
   - `shared_original_sources[]`: the underlying report, event or release the article relies on.
   - `independence_group_id`: the group for the article's primary underlying source.

   Every source used as audit evidence is also registered as an article (`analysis_role: "evidence_only"`), so every `evidence.article_id` resolves.
4. **Narrative analysis.** Analyse each article on six dimensions (section 4), then compare across articles. Observations are about individual articles only.
5. **Claim extraction.** Extract claims with `claim_type`, `assertion_kind`, attribution and location. `claim.article_id` points to the article.
6. **Evidence audit.** Each check-worthy claim gets a status, supporting and contradicting evidence, independence counting, qualitative confidence, limitations and further research.
7. **Report.** Assemble the nine sections and the metadata. Statuses are copied from the audits and never upgraded.

## 2. Data categories, provenance and UI badges (1.1.0; publisher marker 1.2.0)

Two independent fields describe provenance:

| Field | Values | Meaning | Where |
|---|---|---|---|
| `data_mode` | `LIVE` / `DEMO` | **Only whether the source data is real.** `LIVE` = a real, retrievable source with a real URL. `DEMO` = a fictional source on a reserved domain (`.example`, `.test`, `example.com`) | Every record |
| `analysis_generation` | `PRECOMPUTED` / `LIVE_AI` | When and how the analysis was produced. `PRECOMPUTED` = generated in advance and stored as a fixture. `LIVE_AI` = generated at request time by the app's AI call | NarrativeComparison, ClaimExtraction, EvidenceAudit, ResearchReport, bundle (required). Not on raw articles |
| `analysis_metadata` | `{generated_at, model_name\|null, prompt_template_id\|null, prompt_version\|null}` | Optional companion field; **required when `LIVE_AI`** | Same objects |

The three data categories:
- **(a) Real news sources:** articles with `data_mode: LIVE`.
- **(b) Pre-generated analysis:** `analysis_generation: PRECOMPUTED`. This includes everything in `data/`. The sample is `LIVE` + `PRECOMPUTED`; the demo is `DEMO` + `PRECOMPUTED`.
- **(c) Live AI analysis:** `analysis_generation: LIVE_AI`, produced only by the app's runtime AI call. The prompts in `types/prompts.ts` tell the model to output `LIVE_AI`, and the server stamps `analysis_metadata`.

**Rules:**
- Pre-generated content must never be labelled `LIVE_AI`.
- Every analysis part of a bundle must have the same `analysis_generation` as the bundle (Zod enforces this). If live and pre-generated parts are ever combined, ship them as separate bundles.
- A report or bundle summarises its children:
  - `data_mode` is `MIXED` if both LIVE and DEMO articles are present, and the report then needs a `MIXED_DATA` warning.
  - A `DEMO` report needs a `DEMO_DATA` warning.
  - Warnings for paywalls, snippet-only sources and shared sources are listed in `metadata.warnings`.

**UI badge guidance:**

| Condition | Badge | Suggested style |
|---|---|---|
| `data_mode = LIVE` | **Real Source** | neutral |
| `data_mode = DEMO` | **Demo Source** | high-contrast warning colour, always visible, including in exports and screenshots |
| `analysis_generation = PRECOMPUTED` | **Pre-generated Analysis** | info, with `analysis_metadata.generated_at` in a tooltip |
| `analysis_generation = LIVE_AI` | **Live AI Analysis** | info, with `model_name`, `prompt_template_id`, `prompt_version` and `generated_at` in a tooltip |
| bundle `data_mode = MIXED` | both source badges plus a "Mixed sources" banner | warning |
| `publisher.fictional_demo_publisher = true` (1.2.0) | **FICTIONAL DEMO PUBLISHER** next to the publisher name, every place the name appears (cards, tables, source list, exports) | same high-contrast warning style as Demo Source; never hide it |
| `quote_verification = unverifiable` (1.2.0) | **Quote not checkable** on the quote/excerpt, plus the reason from the article (snippet only / paywalled / fetch failed) | muted warning; listed under "Not counted toward Verified" in the audit view |

The labels are exported as `PROVENANCE_BADGES` in `types/openframe.ts`, and the publisher label as `FICTIONAL_DEMO_PUBLISHER_LABEL` (`"FICTIONAL DEMO PUBLISHER"`). Show `data_mode_notice` as a banner on every page that displays a bundle.

**Fictional demo publishers (1.2.0).** Every DEMO article's `publisher` carries `fictional_demo_publisher: true` (schema and Zod require `true` when `data_mode` is `DEMO`, and `false` when `LIVE`; rule PUB-001). Demo publisher names also end in "(fictional)". Names that could collide with real outlets were replaced after web searches on 2026-11-12 (UTC+8): Northlight Studios → **Plumvale Toonworks**, Coastal Courier → **Brackenmoor Courier**, The Lantern Review → **The Quillowick Review**; no exact-name match was found for the new names. Demo person names (e.g. "Rina Castell") are invented as well.

## 3. Verification statuses

Stored values are **exact strings** and must be identical in storage, AI output and the UI. Snake-case variants are invalid.

| Status | Precise meaning | Schema constraints |
|---|---|---|
| **Verified** | The specific proposition is confirmed by a primary source (e.g. the institution's own statement about its own action, or the original document) **or** by at least two independent source groups, with no credible contradicting evidence. "Verified" applies to the proposition stated in `audited_proposition` (e.g. "the survey reported X"), not to any broader implication. | ≥1 supporting item; confidence `medium` or `high`; **AUD-001**: a checkable primary item (`evidence_kind` primary_document / primary_statement / dataset, `quote_verification` ≠ `unverifiable`) or ≥2 independence groups of checkable supporting evidence; **AUD-002**: `high` also needs a directly read (non-snippet) primary item or ≥2 checkable groups |
| **Partially Supported** | Some elements are supported; others are unsupported, overstated (e.g. the right direction but the wrong size) or missing context. | ≥1 supporting item |
| **Disputed** | Credible sources or evidence conflict, and the available evidence doesn't settle the question. | ≥1 contradicting item |
| **Unverified** | Not enough evidence either way, or only the claimant or originator supports it (including single anonymous sources, proprietary data, forecasts and promotional claims). This is the default when unsure. Contradicting evidence may be attached if it is indirect. | none |
| **Contradicted** | The best available reliable evidence directly refutes the proposition. | ≥1 contradicting item |

Other rules:
- **A source's existence does not prove its claim.** Publishing a figure is not evidence that the figure is correct.
- Predictions can't be Verified before their horizon. They are usually Unverified, and can be Contradicted afterwards if the outcome data are direct.
- Opinions get `check_worthy: false` and are not audited. Every `check_worthy: true` claim must have exactly one audit (ID-004).
- **Unverifiable evidence never counts toward Verified** (1.2.0). An evidence item whose source text could not be checked (search snippet only, paywalled, fetch failed) has `quote_verification: "unverifiable"`, is listed in `audit.unverifiable_evidence_ids`, and is shown in the UI as not counted. In the sample this downgraded `aud_live_01` (Katzenberg remark; Bloomberg's own record seen only as a snippet) and `aud_live_08` (Amazon greenlight; press release seen only as search text) from Verified to Partially Supported.

## 4. Narrative dimensions (exactly six)

| Key | Display label | Sub-fields |
|---|---|---|
| `main_argument` | Main Argument | `summary`, `key_actors[]` |
| `causal_attribution` | Causal Attribution | `summary`, `explanations[{cause, effect, asserted_by, evidence_offered_in_article}]` |
| `responsibility_attribution` | Responsibility Attribution | `summary`, `attributions[{actor, responsible_for, attributed_by}]` |
| `language_framing` | Language Framing | `summary`, `frames[]`, `notable_terms[{term, usage_note}]`, `tone_notes` |
| `source_selection` | Source Selection | `summary`, `selected_facts[{fact, linked_claim_ids}]`, `quoted_voices[]`, `source_mix_note` |
| `underrepresented_perspectives` | Underrepresented Perspectives | `summary`, `items[{perspective, note}]` |

Labels are exported as `NARRATIVE_DIMENSION_LABELS`.

Rules:
- `quoted_voices[].verbatim_quote` must match the source character for character. Otherwise use `quote_mode: "paraphrase"` with `verbatim_quote: null`.
- **No political or stance labels** for articles or outlets. Frames are descriptive (e.g. "labour displacement", "tool-not-replacement").
- `outlet_level_observations` are optional, need evidence and a caveat, and **must never be applied to an individual article**. Leave them empty when there are fewer than about 5 articles per outlet.

## 5. Claim typing

- `claim_type` (the subject of the claim):
  - `quantitative`: numbers or measures
  - `historical`: past events or "firsts"
  - `institutional`: roles, decisions, policies of organisations
  - `scientific_technical`: how a technology works
  - `economic`: costs, markets, money
  - `causal`: X causes or caused Y
  - `secondary_claim_types[]` holds additional types.
- `assertion_kind` (what kind of statement it is):
  - `factual_assertion`: stated as fact
  - `opinion`: a value judgement
  - `interpretation`: a reading of evidence
  - `prediction`: about the future
  - `speculation`: a conjecture without basis
- `is_verbatim`: `true` only if `claim_text` is copied exactly. Otherwise it's a faithful paraphrase.
- `attributed_to.attribution_kind` is one of `article_author`, `quoted_source`, `cited_document`, `anonymous_source`, `unattributed`.

## 6. Independence rules

- Every evidence item carries an `independence_group_id`, which identifies the **original material** it ultimately depends on (a press release, report, event, dataset or interview).
- `independent_source_count.{supporting,contradicting}` is the **number of distinct groups** on each side. It must equal `countIndependentSources()`. Zod checks this, and the server recomputes it after AI output.
- Several articles that repeat one press release, wire story or study count as **one** source. In the sample, Variety, Deadline and the LA Times on Amazon's fund share one group, and so do AWN and the TAG page with the CVL report.
- A company's or institution's own statement can verify a claim about **its own action** (e.g. a greenlight), but not claims about effects, costs or quality.
- The same dataset can appear on both sides (e.g. the Atlas); the explanation must say so.

## 7. Confidence and uncertainty

- **Qualitative only:** `confidence: {level: "low"|"medium"|"high", rationale}`. **Numeric credibility or confidence scores are prohibited.**
  - `high`: primary document checked directly, or several independent groups, with no material caveats.
  - `medium`: consistent evidence, but with access limits (snippets, paywalls) or a single group.
  - `low`: indirect, single-source, anonymous, proprietary or conflicting evidence.
- `confidence_limitations[]` (at least 1) names concrete limits. `additional_research_needed[]` says what would change the assessment.

## 8. Missing data and errors

- Unknown or unavailable values are set to `null` **and** added to `missing_fields[]` as `{field, unknown_reason, note}`. Never invent data to fill a field.
- `unknown_reason` is one of: `not_published`, `not_found`, `paywalled`, `fetch_failed`, `not_applicable`, `withheld_for_copyright`, `ambiguous_in_source` (e.g. a timestamp without a time zone, stored as a date only), `demo_placeholder`, `other`.
- The error object is `{code, message, field|null, recoverable, details?}`.
  - Codes: `MISSING_REQUIRED_FIELD`, `INVALID_FORMAT`, `SOURCE_UNREACHABLE`, `PAYWALLED`, `RATE_LIMITED`, `PARSE_FAILED`, `VALIDATION_FAILED`, `INSUFFICIENT_EVIDENCE`, `COPYRIGHT_RESTRICTED`, `DUPLICATE_RECORD`, `UNKNOWN_REFERENCE`, `UNKNOWN`.
  - Records can carry `errors[]`.
- API failure envelope: `{ ok: false, errors: [...] }` (`ApiErrorResponseSchema`). Success envelope: `{ ok: true, data, warnings }`.
- Dates are ISO 8601: `YYYY-MM-DD`, or date-time with an offset. Field names are English snake_case.

## 9. Ids and relations

- Every article, claim, evidence item, audit and so on has a unique id with a prefix: `art_`, `nar_`, `cx_`, `clm_`, `ea_`, `aud_`, `ev_`, `grp_`, `rep_`, `src_`, `fnd_` (report finding, 1.2.0), `bnd_`. Ids are unique across all record kinds (ID-001).
- Relations:
  - `claim.article_id` points to `article.id`.
  - `evidence.claim_id` points to `claim.id`, and `evidence.article_id` points to `article.id`.
  - `audit.claim_id` points to `claim.id`.
  - `report.source_list[].article_id` points to `article.id`.
  - `report.topic_background.timeline[].source_ids` point to `report.source_list[].id` (`src_...`), not to article ids (ID-003).
  - `report.key_claim_verification[]`: `audit_id` → audit, whose `claim_id` and the claim's `article_id` must match the row (RPT-001).
  - `report.key_findings[]` (1.2.0): `claim_ids` → claims, `audit_ids` → exactly the audits of those claims (RPT-003). `report.executive_summary.finding_ids` → findings (RPT-006).
  - `narrative_comparison.article_analyses[].article_id`, `selected_facts[].linked_claim_ids`, `cross_article_comparison.*.article_ids`, `article_comparison.rows[].article_id`, `dedup.duplicate_of` all resolve (ID-002).
- `checkBundleIntegrity()` (run by `AnalysisBundleSchema`) checks all of these; see section 13 for the rule ids.

## 10. Versioning and change policy

- Every schema and every record carries `schema_version` (a const). The current value is **"1.2.0"**. Versions follow semver: MAJOR = breaking, MINOR = additive, PATCH = docs or examples.
- **Exception, recorded openly:** 1.2.0 is **not** backward-compatible (new required fields, stricter validation; 1.1.0 data fails). Under strict semver it would be 2.0.0. The project lead chose 1.2.0 for the hackathon; the CHANGELOG and `MIGRATION-1.1.0-to-1.2.0.md` say so. Likewise, 1.1.0 was not backward-compatible with 1.0.0 data (required `analysis_generation`, new `schema_version` const), contrary to what its CHANGELOG entry first said; that entry is corrected.
- Release archives carry the version in the filename from 1.2.0 on (`openframe-spec-core-v1.2.0.zip`, `openframe-spec-v1.2.0.zip`), each with a `.sha256` file. Older archives are kept unchanged.
- **1.0.0 is frozen as shipped.** After the freeze, **any change bumps the version and must be announced to the project lead (总顾问) before release.** Changes are recorded in `CHANGELOG.md` with a migration note. Nothing changes silently.
- Report revisions (`research_report.metadata.version`, plus `correction_log`) are versioned separately from the schema. Bump them when correcting a report after an audit.

## 11. Next.js integration

Suggested layout (this package doesn't touch the app codebase):

```
lib/openframe/openframe.ts      ← types/openframe.ts
lib/openframe/prompts.ts        ← types/prompts.ts
lib/openframe/schemas/*.json    ← schemas/ (optional: for Ajv or structured-output requests)
fixtures/openframe/*.json       ← data/ (PRECOMPUTED fixtures)
```

Dependencies: `zod@^3` (tested with 3.25.76). TypeScript strict mode is OK: tested with TS 5.9.3 and 7.0.2.

Example App Router route that validates and serves a bundle:

```ts
// app/api/analysis/[id]/route.ts
import { NextResponse } from "next/server";
import { AnalysisBundleSchema, zodToOpenFrameErrors, type ApiResult, type AnalysisBundle } from "@/lib/openframe/openframe";
import demo from "@/fixtures/openframe/demo-dataset.json";
import sample from "@/fixtures/openframe/sample-analysis-ai-animation.json";

const FIXTURES: Record<string, unknown> = { bnd_demo_ai_animation: demo, bnd_ai_animation_2026: sample };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const raw = FIXTURES[id];
  if (!raw) {
    return NextResponse.json<ApiResult<never>>({ ok: false, errors: [{ code: "UNKNOWN_REFERENCE", message: `No bundle ${id}`, field: "id", recoverable: false }] }, { status: 404 });
  }
  const parsed = AnalysisBundleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<ApiResult<never>>({ ok: false, errors: zodToOpenFrameErrors(parsed.error) }, { status: 500 });
  }
  const warnings = parsed.data.research_report.metadata.warnings.map((w) => `${w.code}: ${w.message}`);
  return NextResponse.json<ApiResult<AnalysisBundle>>({ ok: true, data: parsed.data, warnings });
}
```

Example of a live stage with validation and retry:

```ts
import { buildStagePrompt, RETRY_USER_TEMPLATE, fillTemplate, MAX_RETRIES, PROMPT_TEMPLATE_IDS, PROMPT_TEMPLATE_VERSION, type PromptVariable } from "@/lib/openframe/prompts";
import { ClaimExtractionSchema, zodToOpenFrameErrors } from "@/lib/openframe/openframe";

async function runClaimExtraction(callLLM: (sys: string, user: string) => Promise<string>, vars: Partial<Record<PromptVariable, string>>) {
  const { system, user } = buildStagePrompt("claim_extraction", vars);
  let out = await callLLM(system, user);
  for (let attempt = 0; ; attempt++) {
    let json: unknown;
    try { json = JSON.parse(out); } catch { json = null; }
    if (json && typeof json === "object") {
      // server stamps live provenance (never trust the model for this)
      Object.assign(json, { analysis_generation: "LIVE_AI", analysis_metadata: { generated_at: new Date().toISOString(), model_name: process.env.GROK_MODEL ?? null, prompt_template_id: PROMPT_TEMPLATE_IDS.claim_extraction, prompt_version: PROMPT_TEMPLATE_VERSION } });
    }
    const r = ClaimExtractionSchema.safeParse(json);
    if (r.success) return { ok: true as const, data: r.data };
    if (attempt >= MAX_RETRIES) return { ok: false as const, errors: zodToOpenFrameErrors(r.error) };
    out = await callLLM(system, fillTemplate(RETRY_USER_TEMPLATE, { validation_errors: JSON.stringify(r.error.issues), previous_output: out }));
  }
}
```

After Zod, the bundle-level `checkBundleIntegrity()` runs automatically inside `AnalysisBundleSchema`. For a LIVE_AI run, assemble the four stage outputs into a bundle, compute spans and `unverifiable_evidence_ids` server-side, then parse the bundle; never persist or render a bundle that fails. Verbatim text must be an exact substring of the cited article's `accessible_text` (never `summary`).

Traceability drill-down for the UI (1.2.0), "why does the report say this?":

```ts
import { traceFinding, FICTIONAL_DEMO_PUBLISHER_LABEL, type AnalysisBundle } from "@/lib/openframe/openframe";

export function findingDrilldown(bundle: AnalysisBundle, findingId: string) {
  const t = traceFinding(bundle, findingId); // finding -> claims -> audits -> evidence -> accessible_text span
  if (!t) return null;
  return t.claims.map((c) => ({
    claim: c.claim.claim_text,
    status: c.audit?.status, // copied from the audit; never recomputed in the UI
    evidence: c.evidence.map((e) => ({
      side: e.side,
      publisher: e.article?.publisher.name + (e.article?.publisher.fictional_demo_publisher ? ` · ${FICTIONAL_DEMO_PUBLISHER_LABEL}` : ""),
      // highlight article.accessible_text.slice(span.start, span.end) when span is present
      span: e.span,
      note: e.counts_toward_verified ? null : "Quote not checkable: not counted toward Verified",
    })),
  }));
}
```

UI notes:
- Show status chips using the exact status strings.
- Show the provenance badges (section 2).
- Show `independent_source_count` as "N independent source group(s)", never as "N articles".
- Render every report conclusion from `research_report.key_findings` with its `strength` and a link to its drill-down (`traceFinding`). Do not show report prose that is not backed by a finding.
- Show `FICTIONAL DEMO PUBLISHER` next to every DEMO publisher name.
- Never display GDELT tone or any other number as credibility.

## 12. Prompting

- `types/prompts.ts` has one system and one user template per stage (`narrative_analysis`, `claim_extraction`, `evidence_audit`, `report`), a shared `SYSTEM_BASE` with the hard rules, and `RETRY_USER_TEMPLATE`. Readable copies are in `prompts/`.
- The prompts may cite only the articles passed in (by id), must use `null` plus `missing_fields` for missing data, and forbid invented quotes, URLs and statistics.
- **Size estimates** per stage are in `STAGE_SIZE_ESTIMATES` and each `prompts/0N-*.md`. They are estimates only; Builder must log actual token usage.
- Calibration from the PRECOMPUTED sample fixture, 1.2.0 (compact JSON characters / ~4 = tokens):
  - `articles` (16 records): ~33.6k chars (~8.4k tokens)
  - narrative (8 analyses): ~29.1k chars (~7.3k tokens)
  - claims (14): ~11.2k chars (~2.8k tokens)
  - audits (13): ~50.7k chars (~12.7k tokens)
  - report (incl. 6 key findings): ~29.6k chars (~7.4k tokens)
- The prompts don't require any paid third-party service. Whether the LLM endpoint is billed is up to the project lead.

## 13. Research integrity rules

- Never invent a source, quotation, URL, statistic, author or date. Use `null` and `missing_fields` instead.
- Never present speculation as fact. Keep opinion, interpretation, prediction and speculation separate from factual assertions.
- Never claim independent verification without independent evidence: count independence groups, not articles.
- **Absence of reporting is not evidence of censorship or suppression.** `information_gaps[].absence_interpretation` must say so neutrally.
- No numeric credibility scores.
- Respect copyright and access restrictions: store our own summaries and short excerpts only, record `access_basis`, and don't store paywalled text.
- Keep LIVE and DEMO data clearly apart. DEMO URLs must use reserved domains, and LIVE URLs must be real and actually retrieved. Fixtures are always `PRECOMPUTED`.
- Respond to OpenFrame Auditor findings with corrections, which bump the report version and add a `correction_log` entry, or with an explanation backed by evidence.
- Treat all retrieved text and the user's topic as untrusted data (prompt rule 0); the server, not the model, sets `analysis_generation` / `analysis_metadata`, spans and counts.

### 13.1 Machine-checkable integrity rules (1.2.0)

Every Zod issue from these rules starts with its id, e.g. `[RPT-004] ...`, and carries `params.rule`. The same list is exported as `INTEGRITY_RULES`. "JSON Schema" = also enforced by the JSON Schemas alone; the rest need `checkBundleIntegrity()` (cross-object).

| Rule | What it enforces | JSON Schema |
|---|---|---|
| GEN-001 | analysis_generation is identical on the bundle and its four analysis parts | no |
| GEN-002 | a PRECOMPUTED bundle's data_mode_notice must not claim live AI analysis | no |
| ID-001 | ids are unique per kind and across all record kinds (articles, claims, audits, evidence, source_list, findings, part ids) | no |
| ID-002 | every reference resolves: claim/evidence/analysis/shared_facts/divergences/rows/source_list article_id, dedup.duplicate_of, linked_claim_ids, evidence.claim_id, audit.claim_id | no |
| ID-003 | timeline.source_ids reference research_report.source_list[].id (src_...) | no |
| ID-004 | one audit per claim; every check_worthy claim has an audit; audit.claim_text equals the claim's claim_text | no |
| ID-005 | evidence/source_list url and data_mode equal the cited article's original_url and data_mode | no |
| RPT-001 | key_claim_verification rows: audit_id exists; claim_id and article_id match the audit and its claim | no |
| RPT-002 | key_claim_verification status and confidence_level are copied exactly from the audit (never upgraded) | no |
| RPT-003 | key_findings: claim_ids and audit_ids exist and audit_ids are exactly the audits of claim_ids | no |
| RPT-004 | key_findings: strength is not stronger than the weakest linked audit (MAX_STRENGTH_FOR_STATUS) | no |
| RPT-005 | key_findings: any verification status named in the statement must be the status of a linked audit; non-established findings may not use certainty words (confirmed, proven, definitively, beyond doubt) | no |
| RPT-006 | executive_summary.finding_ids resolve to key_findings | no |
| QTE-001 | quote_verification agrees with quote_mode / excerpt_is_verbatim (verbatim => verified_substring\|unverifiable; paraphrase => paraphrase) | yes |
| QTE-002 | a span (quote_span / excerpt_span) is present exactly when quote_verification is verified_substring | yes |
| QTE-003 | verified_substring text equals accessible_text.slice(span.start, span.end) of the cited article, whose accessible_text_origin allows verbatim (not search_snippet); verbatim claims are exact substrings | no |
| QTE-004 | unverifiable is allowed only when the cited article's text genuinely cannot be checked (accessible_text null, origin search_snippet, or paywalled) | no |
| QTE-005 | audit.unverifiable_evidence_ids lists exactly the audit's unverifiable evidence; unverifiable evidence never counts toward Verified | no |
| AUD-001 | Verified requires a checkable primary source or >= 2 independent groups of checkable supporting evidence | partly (can't recount groups) |
| AUD-002 | Verified/high additionally requires a directly read (non-snippet) primary source or >= 2 checkable groups | partly |
| PUB-001 | publisher.fictional_demo_publisher is true exactly when the article's data_mode is DEMO | yes |
| URL-001 | DEMO records use reserved demo hosts; LIVE records never do and never use retrieval_method generated_demo | yes |
| ORG-001 | accessible_text_origin is null exactly when accessible_text is null; origin generated_demo requires data_mode DEMO | yes |
| STN-001 | no political/ideological stance terms in analysis text (STANCE_TERMS_RE) | frames, notable terms, primary_frame only |
| MOD-001 | bundle/report data_mode consistent with record data_modes (LIVE/DEMO/MIXED) | no |

Report derivation (the report is derived **only** from the evidence audit):
- Per-claim status and confidence in `key_claim_verification` are copied exactly from the audit (RPT-002).
- Each report-level conclusion is a `key_findings[]` item with `claim_ids[]` and `audit_ids[]` (RPT-003).
- A finding's `strength` can't exceed its weakest linked audit (RPT-004): Verified → `established`; Partially Supported → `partially_established`; Disputed → `contested`; Unverified / Contradicted → `not_established`. Example: a finding linked to a Disputed and a Partially Supported audit can be at most `contested`.
- A statement may only name statuses its linked audits have, and a non-established finding may not use certainty words such as "confirmed" or "proven" (RPT-005). Prose cannot be fully machine-checked; reviewers still read it.

Quote verification (`quote_verification` on evidence items and quoted voices):
- `verified_substring`: exact substring of the cited article's `accessible_text`, with a span (`excerpt_span` / `quote_span`, JavaScript string indices, end exclusive) such that `accessible_text.slice(start, end) === text` (QTE-002/003). Verbatim claims (`is_verbatim: true`) must be exact substrings too.
- `unverifiable`: presented as the source's words, but the source text can't be checked (article `accessible_text` null, `accessible_text_origin: "search_snippet"`, or `paywalled: true`; QTE-004). It is listed in `audit.unverifiable_evidence_ids` and never counts toward Verified (QTE-005, AUD-001).
- `paraphrase`: our own wording. `excerpt_is_verbatim` is kept for compatibility and must equal `quote_verification === "verified_substring"` (QTE-001).

## 14. Validation performed (1.2.0, 2026-11-12 UTC+8)

- Ajv 8 (draft 2020-12, strict mode with `strictTypes` off, `ajv-formats`) compiled all 7 schemas. Both data files are valid against `bundle.schema.json`.
- Zod + `checkBundleIntegrity()`: both data files pass. Sample: 16 articles, 14 claims, 13 audits, 32 evidence items, 25 `verified_substring` excerpts whose spans resolve exactly, 7 `unverifiable` snippet excerpts (each listed in its audit), 6 key findings. `traceFinding` resolves every finding down to article text spans.
- `scripts/negtest.ts`: 53 negative cases, one or more per rule (each rejected, with the rule id reported), both baselines accepted, `traceFinding` check, and the `fillTemplate` single-pass check.
- The Auditor's harness was re-run on copies (nothing under the Auditor's folder was changed): the 31 fixtures migrated with `scripts/migrate-1.1.0-to-1.2.0.mjs` are all rejected by Zod except the valid baseline and `mut_28` (accepted by design, see CHANGELOG); `audit_spec.py` reports no semantic findings on either data file; the prompt checks pass (injection guard, topic guard, braces in content, prompts.json/md parity, enum parity).
- `tsc --noEmit` (strict) passes on TypeScript 5.9.3 and 7.0.2.
- Every verbatim quote and excerpt in the real-source sample (pre-generated analysis) was extracted programmatically from captured page or PDF text. Snippet-only text is stored, but only as `unverifiable`.

## 15. Field reference: required and optional fields
(Generated from the JSON Schemas. **R** = required, which may still be `null` where the type allows it; **O** = optional. Fields added in 1.2.0 say so in their notes.)

### NewsArticle

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `analysis_role` | R | string — analysed = included in narrative comparison and claim extraction; evidence_only = retrieved source document used only as audit evidence. |
| `title` | R | string |
| `publisher` | R | object |
| `publication_date` | R | nullable_date |
| `original_url` | R | url |
| `author` | R | string \| null |
| `summary` | R | string — Neutral analyst summary in own words. |
| `accessible_text` | R | string \| null — Only legally accessible text per access_basis. The ONLY text verbatim quotes/excerpts may be copied from. |
| `accessible_text_origin` | R | accessible_text_origin |
| `access_basis` | R | access_basis |
| `retrieval_timestamp` | R | iso_datetime |
| `retrieval_method` | R | retrieval_method |
| `language` | R | language |
| `content_type` | R | content_type |
| `paywalled` | O | boolean \| null |
| `dedup` | R | object |
| `topics` | O | array of string |
| `provenance` | O | provenance |
| `missing_fields` | R | missing_fields |
| `errors` | O | array of error |

### NewsArticle.publisher

| Field | Req | Type / notes |
|---|---|---|
| `name` | R | string |
| `domain` | R | string \| null |
| `publisher_type` | R | publisher_type |
| `fictional_demo_publisher` | R | boolean — Added in 1.2.0. true exactly when data_mode is DEMO; UI shows the label 'FICTIONAL DEMO PUBLISHER'. |

### NarrativeComparison

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `analysis_generation` | R | analysis_generation |
| `analysis_metadata` | O | analysis_metadata |
| `topic` | R | string |
| `article_ids` | R | array of id |
| `article_analyses` | R | array of article_analysis |
| `cross_article_comparison` | R | object |
| `outlet_level_observations` | R | array of object — Optional outlet-level generalisations; each needs evidence + caveat and must never be applied to an individual article's analysis. |
| `method_notes` | R | string |
| `provenance` | O | provenance |
| `missing_fields` | R | missing_fields |
| `errors` | O | array of error |

### ArticleAnalysis ($defs.article_analysis)

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `article_id` | R | id |
| `main_argument` | R | object — Main Argument |
| `causal_attribution` | R | object — Causal Attribution |
| `responsibility_attribution` | R | object — Responsibility Attribution |
| `language_framing` | R | object — Language Framing |
| `source_selection` | R | object — Source Selection |
| `underrepresented_perspectives` | R | object — Underrepresented Perspectives |
| `article_level_note` | R | string — States that observations describe this article only. |

### QuotedVoice

| Field | Req | Type / notes |
|---|---|---|
| `speaker` | R | string |
| `speaker_role` | R | string \| null |
| `speaker_category` | O | string |
| `quote_mode` | R | string |
| `verbatim_quote` | R | string \| null — Exact characters from the source; null for paraphrase. |
| `paraphrase` | R | string \| null |
| `quote_verification` | R | quote_verification |
| `quote_span` | R | nullable_text_span |

### ClaimExtraction

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `analysis_generation` | R | analysis_generation |
| `analysis_metadata` | O | analysis_metadata |
| `topic` | R | string |
| `claims` | R | array of claim |
| `provenance` | O | provenance |
| `missing_fields` | R | missing_fields |
| `errors` | O | array of error |

### Claim

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `article_id` | R | id — -> NewsArticle.id the claim was extracted from. |
| `claim_text` | R | string |
| `is_verbatim` | R | boolean |
| `claim_type` | R | claim_type |
| `secondary_claim_types` | O | array of claim_type |
| `assertion_kind` | R | assertion_kind |
| `location` | R | object |
| `attributed_to` | R | object |
| `original_source_hint` | O | anyOf |
| `check_worthy` | R | boolean |
| `missing_fields` | R | missing_fields |

### EvidenceAudit

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `analysis_generation` | R | analysis_generation |
| `analysis_metadata` | O | analysis_metadata |
| `audits` | R | array of audit |
| `independence_groups` | O | array of object |
| `provenance` | O | provenance |
| `missing_fields` | R | missing_fields |
| `errors` | O | array of error |

### Audit

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `claim_id` | R | id |
| `claim_text` | R | string |
| `audited_proposition` | O | string \| null |
| `status` | R | verification_status |
| `supporting_evidence` | R | array of evidence_item |
| `contradicting_evidence` | R | array of evidence_item |
| `original_source_url` | R | nullable_url |
| `explanation` | R | string |
| `confidence` | R | confidence |
| `confidence_limitations` | R | array of string |
| `additional_research_needed` | R | array of string |
| `independent_source_count` | R | object — Computed = number of DISTINCT independence_group_id values on each side. |
| `unverifiable_evidence_ids` | R | array of id — Added in 1.2.0. Exactly the ids of this audit's evidence items with quote_verification 'unverifiable' (rule QTE-005). Flag them in the UI. |
| `audited_at` | O | iso_datetime |
| `missing_fields` | R | missing_fields |

### EvidenceItem

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `data_mode` | R | data_mode |
| `claim_id` | R | id — -> Claim.id this evidence is assessed against. |
| `article_id` | R | id — -> NewsArticle.id of the source document the evidence comes from (every evidence source is registered as an article record, analysis_role evidence_only if not analysed). |
| `url` | R | nullable_url |
| `publisher` | R | string |
| `publication_date` | R | nullable_date |
| `excerpt` | R | string \| null |
| `excerpt_is_verbatim` | R | boolean — true only if excerpt is an exact substring of the cited article's accessible_text and that text's origin is not search_snippet (cross-object rule). |
| `quote_verification` | R | quote_verification |
| `excerpt_span` | R | nullable_text_span |
| `summary` | R | string |
| `evidence_kind` | R | evidence_kind |
| `independence_group_id` | R | id |
| `retrieval_method` | R | retrieval_method |
| `accessed_at` | R | iso_datetime |

### ResearchReport

| Field | Req | Type / notes |
|---|---|---|
| `schema_version` | R | schema_version |
| `id` | R | id |
| `analysis_generation` | R | analysis_generation |
| `analysis_metadata` | O | analysis_metadata |
| `metadata` | R | object |
| `executive_summary` | R | object |
| `key_findings` | R | array of object — Added in 1.2.0. Every report-level conclusion with its claims and audits. Rules RPT-003..RPT-005 (cross-object, checkBundleIntegrity): audit_ids are exactly the audits of claim_ids; strength not stronger than the weakest linked audit; statement names no status the linked audits lack. |
| `topic_background` | R | object |
| `article_comparison` | R | object |
| `narrative_analysis` | R | object |
| `key_claim_verification` | R | array of object |
| `evidence_limitations` | R | array of string |
| `information_gaps` | R | array of object |
| `further_research_questions` | R | array of string |
| `source_list` | R | array of object |
| `missing_fields` | R | missing_fields |
| `errors` | O | array of error |

### ResearchReport.metadata

| Field | Req | Type / notes |
|---|---|---|
| `topic` | R | string |
| `research_question` | R | string |
| `data_mode` | R | bundle_data_mode |
| `generated_at` | R | iso_datetime |
| `version` | R | string — Report revision (semver), bumped on corrections. |
| `generator` | O | string \| null |
| `coverage_window` | O | anyOf |
| `warnings` | R | array of object |
| `correction_log` | O | array of object |

### ResearchReport.executive_summary

| Field | Req | Type / notes |
|---|---|---|
| `text` | R | string |
| `bottom_line` | R | string |
| `confidence` | R | confidence |
| `finding_ids` | R | array of id — Added in 1.2.0. -> key_findings[].id (rule RPT-006). |

### ResearchReport.key_findings[] (1.2.0)

| Field | Req | Type / notes |
|---|---|---|
| `id` | R | id |
| `statement` | R | string |
| `strength` | R | finding_strength |
| `claim_ids` | R | array of id |
| `audit_ids` | R | array of id |
| `basis_note` | O | string \| null |

### Bundle

| Field | Req | Type / notes |
|---|---|---|
| `$schema` | O | string |
| `schema_version` | R | schema_version |
| `bundle_id` | R | id |
| `data_mode` | R | bundle_data_mode |
| `data_mode_notice` | O | string \| null |
| `analysis_generation` | R | analysis_generation |
| `analysis_metadata` | O | analysis_metadata |
| `generated_at` | R | iso_datetime |
| `articles` | R | array of news-article.schema.json |
| `narrative_comparison` | R | narrative-comparison.schema.json |
| `claim_extraction` | R | claim-extraction.schema.json |
| `evidence_audit` | R | evidence-audit.schema.json |
| `research_report` | R | research-report.schema.json |

### Enums (common.schema.json)

- `data_mode`: `LIVE`, `DEMO`
- `analysis_generation`: `PRECOMPUTED`, `LIVE_AI`
- `bundle_data_mode`: `LIVE`, `DEMO`, `MIXED`
- `access_basis`: `publisher_summary`, `open_license`, `excerpt_fair_use`, `public_domain`, `own_summary_only`, `none`
- `retrieval_method`: `web_fetch`, `pdf_download`, `web_search_snippet`, `api`, `rss`, `manual_entry`, `generated_demo`
- `accessible_text_origin`: `page_capture`, `pdf_text`, `search_snippet`, `api_response`, `rss_item`, `user_supplied`, `generated_demo`, `null`
- `quote_verification`: `verified_substring`, `unverifiable`, `paraphrase`
- `finding_strength`: `established`, `partially_established`, `contested`, `not_established`
- `confidence_level`: `low`, `medium`, `high`
- `unknown_reason`: `not_published`, `not_found`, `paywalled`, `fetch_failed`, `not_applicable`, `withheld_for_copyright`, `ambiguous_in_source`, `demo_placeholder`, `other`
- `error_code`: `MISSING_REQUIRED_FIELD`, `INVALID_FORMAT`, `SOURCE_UNREACHABLE`, `PAYWALLED`, `RATE_LIMITED`, `PARSE_FAILED`, `VALIDATION_FAILED`, `INSUFFICIENT_EVIDENCE`, `COPYRIGHT_RESTRICTED`, `DUPLICATE_RECORD`, `UNKNOWN_REFERENCE`, `UNKNOWN`
- `claim_type`: `quantitative`, `historical`, `institutional`, `scientific_technical`, `economic`, `causal`
- `assertion_kind`: `factual_assertion`, `opinion`, `interpretation`, `prediction`, `speculation`
- `verification_status`: `Verified`, `Partially Supported`, `Disputed`, `Unverified`, `Contradicted`
- `evidence_kind`: `primary_document`, `primary_statement`, `dataset`, `original_reporting`, `secondary_reporting`, `expert_analysis`
- `content_type`: `news_report`, `analysis`, `opinion`, `press_release`, `interview`, `research_report`, `union_statement`, `official_notice`, `job_posting`, `other`
- `publisher_type`: `trade_press`, `mainstream_news`, `specialist_outlet`, `wire_service`, `union_or_guild`, `company`, `research_org`, `government`, `blog_or_newsletter`, `other`
- `narrative_dimension`: `main_argument`, `causal_attribution`, `responsibility_attribution`, `language_framing`, `source_selection`, `underrepresented_perspectives`

