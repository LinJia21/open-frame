# Changelog — OpenFrame analytical contract

Versions follow semantic versioning:
- MAJOR: a breaking change, such as removing or renaming a field or enum value, or changing a meaning.
- MINOR: an additive, backward-compatible change.
- PATCH: documentation or example fixes only.

After the freeze, any change bumps the version and is announced to the project lead (总顾问) before release.

## 1.2.0 — 2026-11-12 (audit-fix release; NOT backward-compatible: migration required)

Version 1.2.0 was confirmed by the project lead. Because this release adds required fields and stricter validation, strict semver would call it 2.0.0. The Analyst flagged this; the number was kept at the lead's decision. **1.1.0 data does not validate under 1.2.0.** Migrate it with `scripts/migrate-1.1.0-to-1.2.0.mjs` and follow `MIGRATION-1.1.0-to-1.2.0.md`. No paid APIs, no scope expansion.

Goal: a traceable chain **report finding → claim → audit → evidence → span in the stored article text**, machine-checked and shown in the UI.

### Added
- `NewsArticle.accessible_text_origin`.
- `publisher.fictional_demo_publisher`, plus the label constant `FICTIONAL_DEMO_PUBLISHER_LABEL` ("FICTIONAL DEMO PUBLISHER") and `PROVENANCE_BADGES.publisher`.
- `quote_verification` (`verified_substring` | `unverifiable` | `paraphrase`) with `quote_span` (quoted voices) and `excerpt_span` (evidence). Also `PROVENANCE_BADGES.quote_verification`.
- `Audit.unverifiable_evidence_ids`.
- `ResearchReport.key_findings[]` (`fnd_` ids, `strength`, `claim_ids`, `audit_ids`) and `executive_summary.finding_ids`.
- Zod exports:
  - `INTEGRITY_RULES` and `checkBundleIntegrity()`, which `AnalysisBundleSchema` runs; every issue carries a rule id;
  - `traceFinding()` (finding → claims → audits → evidence → article span, with `counts_toward_verified`) and `resolveSpan()`;
  - `MAX_STRENGTH_FOR_STATUS`, `checkModeUrl`, `isReservedDemoUrl` and `findStanceTerms`.
- `MIGRATION-1.1.0-to-1.2.0.md`, `scripts/migrate-1.1.0-to-1.2.0.mjs` and an expanded `scripts/negtest.ts` (one or more negative cases per rule).

### Changed / fixed (OpenFrame Auditor report v1.1.0, items OF-QA-101 to 113)
- **101 (HIGH)**: `key_claim_verification` rows must resolve and copy the audit's status and confidence (RPT-001/002).
- **102 (HIGH)**:
  - Prompt rule 4: verbatim text comes only from `accessible_text`, never from `summary`.
  - Every verbatim quote or excerpt must be an exact substring at its stored span (QTE-001..005).
  - The sample now stores the verbatim segments extracted from captured pages and PDFs as `accessible_text`. All 25 checkable excerpts resolve exactly. The 7 snippet-only excerpts are `unverifiable` and no longer count toward Verified.
- **103**:
  - Uniqueness across all ids (ID-001).
  - All cross-references resolve (ID-002).
  - `timeline.source_ids` must be `src_` ids (ID-003).
  - Every check-worthy claim has exactly one audit (ID-004).
- **104**: the DEMO/LIVE ⇔ reserved-host rule and the `generated_demo` ⇔ DEMO rule moved into Zod and JSON Schema (URL-001, ORG-001).
- **105**: the Verified rule is enforced (AUD-001); `high` confidence needs a non-snippet primary item or ≥2 checkable groups (AUD-002). This downgraded two sample audits to Partially Supported (medium):
  - `aud_live_01`: Bloomberg's primary record was seen only as a snippet.
  - `aud_live_08`: the Amazon press release was seen only as search text, and all reports share one announcement.
- **106**: a stance-label denylist on analysis prose fields (STN-001; also in JSON Schema for frames, notable terms and primary_frame). It is phrase-based, so "conservative estimate" is still allowed.
- **107**: `fillTemplate` is single-pass; braces inside topics or documents no longer throw.
- **108**:
  - SYSTEM rule 0 says topics, documents, claims and stage outputs are untrusted data, and content is wrapped in `<<<UNTRUSTED_...>>>` markers.
  - The server, not the model, stamps `analysis_generation` and `analysis_metadata`.
- **109**: demo publishers that collided with real names were renamed after web searches: Plumvale Toonworks, Brackenmoor Courier, The Quillowick Review. All demo publisher names end in "(fictional)" and carry `fictional_demo_publisher: true`, which the schema requires for DEMO (PUB-001).
- **110**:
  - The README wording changed from "LIVE sample" to "real-source sample (pre-generated analysis)".
  - A PRECOMPUTED bundle can't have a notice claiming live AI, and vice versa (GEN-002).
  - Badges are derived only from enums.
  - PRECOMPUTED may record the offline model in `analysis_metadata`; this is documented as allowed.
- **111**:
  - The 1.1.0 entry below is corrected (it was not backward-compatible).
  - Release archives are versioned from now on (`openframe-spec-core-v1.2.0.zip`, `openframe-spec-v1.2.0.zip`) with `.sha256` files. Earlier unversioned zips are left untouched.
- **112**: Zod date and datetime checks now reject impossible calendar dates (`2026-02-31`), matching JSON Schema.
- **113**:
  - The CVL excerpt is now the full sentence from the key-findings page.
  - The unsourced assertion is no longer counted as evidence.
  - `aud_live_12` records Variety's "chief operating officer" sentence as supporting evidence; the discrepancy is shown as Disputed (low).

### Report derivation
- The report is derived only from the evidence audit. Each conclusion is a finding linked to claims and audits; its status is copied verbatim; its strength is ≤ its weakest audit (RPT-003..006). The sample has 6 findings and the demo has 3.

### Docs
- `sources/news-source-plan.md` was revised on 2026-11-12, docs only:
  - Guardian Open Platform and the NYT APIs are optional, display-only adapters behind a feature flag and a key check, with graceful degradation;
  - a terms matrix;
  - key application steps (no accounts created);
  - AI-use restrictions flagged for the founder.

## 1.1.0 — 2026-11-12 (corrected in 1.2.0: NOT backward-compatible; 1.0.0 data fails the new `schema_version` const and the new required `analysis_generation`, so migration is required)

### Added
- `analysis_generation` (`"PRECOMPUTED"` | `"LIVE_AI"`) is defined in `common.schema.json`. It is **required** on:
  - NarrativeComparison
  - ClaimExtraction
  - EvidenceAudit
  - ResearchReport
  - the bundle/dataset object

  It does not go on raw NewsArticle records.
- `analysis_metadata` `{generated_at, model_name|null, prompt_template_id|null, prompt_version|null}` is optional, but required when `analysis_generation` is `LIVE_AI`.
- Bundle rule: every analysis part must have the same `analysis_generation` as the bundle.
- Zod: `AnalysisGenerationSchema`, `AnalysisMetadataSchema` and `PROVENANCE_BADGES` (suggested UI badges).
- Prompts:
  - Live runs must output `analysis_generation: "LIVE_AI"`.
  - `PROMPT_TEMPLATE_IDS` and `PROMPT_TEMPLATE_VERSION` added.
  - `STAGE_SIZE_ESTIMATES` added: per-stage input/output size estimates and recommended `max_tokens`.

### Clarified (no structural change)
- `data_mode` (`LIVE` | `DEMO`) is unchanged. It now means **only** whether the source data is real: `LIVE` = a real, retrievable source; `DEMO` = a fictional one. It says nothing about when the analysis was produced.

### Why
- To tell apart three kinds of data that 1.0.0 grouped together:
  - (a) real news sources
  - (b) analysis generated in advance and stored as fixtures
  - (c) analysis generated live by the app's AI call
- Rule: pre-generated content must never be labelled `LIVE_AI`.

### Migration from 1.0.0
- Set `schema_version` to `"1.1.0"`.
- Add `analysis_generation` to each NarrativeComparison, ClaimExtraction, EvidenceAudit, ResearchReport and bundle. Use `"PRECOMPUTED"` for every stored or fixture object. Use `"LIVE_AI"` only for output produced at request time, and add `analysis_metadata` to it.
- Nothing was removed or renamed, but 1.0.0 documents no longer validate without these steps.

## 1.0.0 — 2026-11-12 (frozen; reviewed by project lead)

- First contract: JSON Schemas (draft 2020-12) for `common`, `news-article`, `narrative-comparison`, `claim-extraction`, `evidence-audit`, `research-report` and `bundle`, plus matching Zod v3 types.
- Every record carries `schema_version`, and every record has a unique prefixed id.
- Relations:
  - `claim.article_id` points to `article.id`.
  - `evidence.claim_id` points to `claim.id`, and `evidence.article_id` points to `article.id`.
- Verification statuses are exactly: `Verified`, `Partially Supported`, `Disputed`, `Unverified`, `Contradicted`.
- There are six narrative dimensions: `main_argument`, `causal_attribution`, `responsibility_attribution`, `language_framing`, `source_selection`, `underrepresented_perspectives`.
- Independence counting uses `independence_group_id`. Confidence is qualitative only. Missing data is `null` plus an entry in `missing_fields`. Errors use `{code, message, field, recoverable}`.
- `data_mode` is `LIVE` | `DEMO`.
- Grok prompt templates are provided for each stage, with a Zod validate-and-retry policy.
