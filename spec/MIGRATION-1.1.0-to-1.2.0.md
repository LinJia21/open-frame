# Migrating OpenFrame data from 1.1.0 to 1.2.0

1.2.0 is the audit-fix release (OF-QA-101 to 113, plus the traceability requirements). **It is not backward-compatible.** Every 1.1.0 document fails 1.2.0 validation until it is migrated, because:
- the `schema_version` const changed;
- new fields are required;
- validation is stricter.

The version number was set by the project lead. Under strict semver this would be 2.0.0 (see CHANGELOG).

Tool: `scripts/migrate-1.1.0-to-1.2.0.mjs`. Usage: `node scripts/migrate-1.1.0-to-1.2.0.mjs old.json new.json`.

The script never invents evidence and never raises a status. If it can't decide something, it prints a `TODO` line and leaves the record **invalid**, so validation fails until a person fixes it.

## 1. New fields

| Record | Field | Required? | Values / meaning |
|---|---|---|---|
| NewsArticle | `accessible_text_origin` | R (nullable) | `page_capture`, `pdf_text`, `api_response`, `rss_item`, `user_supplied`, `generated_demo`, `search_snippet`, or `null`. Where the stored `accessible_text` came from. Verbatim quotes can only be checked against text whose origin is not `search_snippet`. |
| NewsArticle.publisher | `fictional_demo_publisher` | R | `true` exactly when the article's `data_mode` is `DEMO`; `false` for `LIVE`. The UI shows `FICTIONAL_DEMO_PUBLISHER_LABEL` ("FICTIONAL DEMO PUBLISHER"). |
| QuotedVoice | `quote_verification` | R | `verified_substring` \| `unverifiable` \| `paraphrase` |
| QuotedVoice | `quote_span` | R (nullable) | `{start, end}` into the analysed article's `accessible_text`; required when `verified_substring`. |
| EvidenceItem | `quote_verification` | R | as above |
| EvidenceItem | `excerpt_span` | R (nullable) | `{start, end}` into the evidence article's `accessible_text`; required when `verified_substring`. |
| Audit | `unverifiable_evidence_ids` | R | Ids of this audit's evidence items with `quote_verification: "unverifiable"` (exact set). |
| ResearchReport | `key_findings[]` | R (min 1) | `{id: "fnd_...", statement, strength, claim_ids[] (min 1), audit_ids[] (min 1), basis_note?}` |
| ResearchReport.executive_summary | `finding_ids[]` | R (min 1) | Findings the summary paragraph rests on. |

Spans use JavaScript string indices (UTF-16 code units), with `end` exclusive: `accessible_text.slice(start, end) === text`. In Python, compute them on the `utf-16-le` encoding (byte offset / 2), not on code points.

`strength` values: `established`, `partially_established`, `contested`, `not_established`.

## 2. Stricter validation (new rejections)

Every rule id below appears in the Zod issue message and `params.rule`. The full table is in README section 13.1.
- **RPT-001/002** (OF-QA-101): every `key_claim_verification` row must point to an existing audit, claim and article, and copy `status` and `confidence_level` exactly.
- **RPT-003..006**: findings link to claims and to exactly their audits. Strength is capped by the weakest linked audit. Statements may only name statuses their audits have, and may not use certainty words unless the finding is established. `finding_ids` must resolve.
- **QTE-001..005** (OF-QA-102): verbatim text must be an exact substring of `accessible_text` (claims with `is_verbatim`, evidence excerpts, quoted voices), at the stored span. `unverifiable` is only allowed when the source text can't be checked (null, `search_snippet`, or paywalled). `excerpt_is_verbatim` must equal `quote_verification === "verified_substring"`. `unverifiable_evidence_ids` must match exactly.
- **ID-001..005** (OF-QA-103):
  - ids must be unique across record kinds;
  - every cross-reference must resolve: `article_analyses[].article_id`, `linked_claim_ids`, `rows[].article_id`, `dedup.duplicate_of`, comparison `article_ids`, evidence `article_id`, `source_list[].article_id`;
  - `timeline[].source_ids` must be `source_list[].id` (`src_`), not article ids;
  - every `check_worthy` claim needs exactly one audit.
- **URL-001 / ORG-001** (OF-QA-104):
  - `DEMO` ⇔ reserved host (`.example`, `.test`, `.invalid`, `.localhost`, `example.com/net/org`) for all URLs;
  - `generated_demo` ⇔ `DEMO`;
  - also enforced in JSON Schema.
- **AUD-001/002** (OF-QA-105):
  - Verified needs a checkable primary item, or ≥2 independence groups of checkable support;
  - `high` confidence also needs a non-snippet primary item or ≥2 checkable groups;
  - unverifiable items never count.
- **STN-001** (OF-QA-106): a stance-label denylist on analysis prose (e.g. "left-leaning", "right-wing", "partisan", "liberal media"). Quotes and source text are exempt.
- **GEN-001/002, MOD-001** (OF-QA-110):
  - `analysis_generation` must be consistent across the bundle;
  - `data_mode_notice` may not say "live AI" on a PRECOMPUTED bundle (or "pre-generated" on LIVE_AI);
  - `analysis_metadata` is required for LIVE_AI.
  - PRECOMPUTED may still record the offline model in `analysis_metadata` (allowed on purpose).
- **Dates** (OF-QA-112): Zod now rejects impossible calendar dates such as `2026-02-31`, matching JSON Schema.
- **PUB-001**: `fictional_demo_publisher` must match `data_mode`.

Prompt changes (no data effect):
- untrusted-input rule 0 and untrusted markers;
- verbatim text only from `accessible_text`;
- single-pass `fillTemplate`, so `{{x}}` in a topic no longer throws;
- the server stamps `analysis_generation` / `analysis_metadata`, spans and `unverifiable_evidence_ids`.

## 3. How to transform existing 1.1.0 data

1. Run the script. It does the following:
   - sets `schema_version` to `"1.2.0"` everywhere;
   - derives `accessible_text_origin` from `retrieval_method` (`web_fetch`→`page_capture`, `pdf_download`→`pdf_text`, `web_search_snippet`→`search_snippet`, `api`→`api_response`, `rss`→`rss_item`, `manual_entry`→`user_supplied`, `generated_demo`→`generated_demo`; `null` when `accessible_text` is null);
   - sets `fictional_demo_publisher` from `data_mode`;
   - classifies every verbatim excerpt and quote. Each one becomes one of:
     - an exact substring → `verified_substring` + span;
     - source text not checkable → `unverifiable` (and `excerpt_is_verbatim: false`);
     - otherwise → **TODO**, left invalid.
     
     Non-verbatim items become `paraphrase`.
   - fills `unverifiable_evidence_ids`, and prints a TODO for any Verified audit that relied on unverifiable items;
   - maps `timeline[].source_ids` from article ids to `src_` ids via `source_list`;
   - creates placeholder `key_findings` (one per `key_claim_verification` row, strength = cap of the audit status, with a `basis_note`) and `finding_ids`, and prints a TODO to rewrite them.
2. Work through every TODO by hand:
   - **Quotes not found in `accessible_text`.** In 1.1.0, `accessible_text` was a short extract, so most real-source quotes fall here. Store the captured source text (or the verbatim segments you extracted, joined with " […] ") as `accessible_text` with the correct origin, then re-run. Otherwise, rewrite the item as a paraphrase. Never edit a quote to make it match.
   - **Verified audits with unverifiable evidence.** Re-check AUD-001 and downgrade honestly if the remaining checkable evidence is not enough. In our sample, `aud_live_01` and `aud_live_08` became Partially Supported (medium).
   - **Placeholder findings.** Rewrite them as real conclusions. Keep strength ≤ the weakest audit, and use no status words beyond those of the linked audits.
3. Replace any colliding demo publisher names with clearly fictional ones ending in "(fictional)" (this is editorial, not automatic).
4. Validate: `node scripts/validate.mjs` (Ajv) and `npx tsx scripts/zodcheck.ts` (Zod + `checkBundleIntegrity`).

## 4. Code snippet: server-side span and verification stamping (LIVE_AI)

```ts
import { VERBATIM_ORIGINS, type NewsArticle, type EvidenceItem } from "@/lib/openframe/openframe";

/** Stamp quote_verification + excerpt_span on a model-produced evidence item; never trust the model's own values. */
export function stampEvidence(e: EvidenceItem, article: NewsArticle): EvidenceItem {
  const text = article.accessible_text;
  const checkable = text != null && article.accessible_text_origin != null
    && (VERBATIM_ORIGINS as readonly string[]).includes(article.accessible_text_origin) && article.paywalled !== true;
  if (e.excerpt && e.excerpt_is_verbatim) {
    const start = checkable ? text!.indexOf(e.excerpt) : -1;
    if (start >= 0) return { ...e, quote_verification: "verified_substring", excerpt_span: { start, end: start + e.excerpt.length } };
    if (!checkable) return { ...e, excerpt_is_verbatim: false, quote_verification: "unverifiable", excerpt_span: null };
    // claimed verbatim but not found: downgrade to paraphrase (or retry the stage)
    return { ...e, excerpt_is_verbatim: false, quote_verification: "paraphrase", excerpt_span: null };
  }
  return { ...e, quote_verification: "paraphrase", excerpt_span: null };
}

// After stamping all items of an audit:
// audit.unverifiable_evidence_ids = [...audit.supporting_evidence, ...audit.contradicting_evidence]
//   .filter((x) => x.quote_verification === "unverifiable").map((x) => x.id);
// Then parse the whole bundle with AnalysisBundleSchema (runs checkBundleIntegrity) before saving or rendering.
```

Note: a downgraded item may make an audit fail AUD-001. In that case, re-run the evidence-audit stage with the validation errors (`RETRY_USER_TEMPLATE`), or store the run as failed. Never relabel the status in code.
