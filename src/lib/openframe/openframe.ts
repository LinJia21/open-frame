/**
 * OpenFrame analytical contract — Zod (v3) schemas + inferred TypeScript types.
 * Mirrors schemas/*.schema.json (JSON Schema draft 2020-12), schema_version 1.2.0.
 * Cross-object rules that JSON Schema cannot express (ids resolve, report rows equal audits, verbatim substrings,
 * stance-term denylist, distinct-group counting) live in checkBundleIntegrity(), which AnalysisBundleSchema runs.
 * Drop into `lib/openframe/openframe.ts` in the Next.js app. Server- and client-safe.
 * Owner: OpenFrame Analyst. Changing any field/enum requires a semver bump + notice (README §Versioning).
 */
import { z } from "zod";

export const SCHEMA_VERSION = "1.2.0" as const;
export const SchemaVersionSchema = z.literal(SCHEMA_VERSION);

/* ------------------------------- Common ------------------------------- */
export const IdSchema = z.string().regex(/^[a-z]{2,4}_[A-Za-z0-9_-]{1,64}$/, "Invalid OpenFrame id");
/** Source reality ONLY: LIVE = real retrievable source, DEMO = fictional source. */
export const DataModeSchema = z.enum(["LIVE", "DEMO"]);
/** Added in 1.1.0. PRECOMPUTED = generated in advance (fixtures) — never label as LIVE_AI. LIVE_AI = produced at request time. */
export const AnalysisGenerationSchema = z.enum(["PRECOMPUTED", "LIVE_AI"]);
/** Real calendar check (rejects e.g. 2026-02-31 and 2026-11-12T25:00+08:00). */
function isRealCalendarDate(y: number, m: number, d: number): boolean {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
function isRealDateTime(v: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-](\d{2}):(\d{2}))$/.exec(v);
  if (!m) return false;
  const [, y, mo, d, h, mi, sec, , oh, om] = m;
  return isRealCalendarDate(+y!, +mo!, +d!) && +h! <= 23 && +mi! <= 59 && (sec === undefined || +sec <= 59) && (oh === undefined || (+oh <= 23 && +om! <= 59));
}
/** ISO 8601 date-time WITH offset and a real calendar date (1.2.0: calendar check added). */
export const IsoDateTimeSchema = z.string().datetime({ offset: true }).refine(isRealDateTime, "Invalid calendar date-time");
/** ISO 8601 calendar date YYYY-MM-DD; z.string().date() rejects impossible dates such as 2026-02-31 (1.2.0). */
export const IsoDateSchema = z.string().date("Expected a real calendar date YYYY-MM-DD").refine((v) => isRealCalendarDate(+v.slice(0, 4), +v.slice(5, 7), +v.slice(8, 10)), "Invalid calendar date");
/** Added in 1.1.0. Optional; required when analysis_generation is LIVE_AI. May also accompany PRECOMPUTED (records the offline model/prompt used); it never makes an analysis "live". */
export const AnalysisMetadataSchema = z.object({
  generated_at: IsoDateTimeSchema,
  model_name: z.string().nullable(),
  prompt_template_id: z.string().nullable(),
  prompt_version: z.string().nullable(),
}).strict();
/** Display label for publishers of DEMO records (publisher.fictional_demo_publisher === true). Show it next to the publisher name. */
export const FICTIONAL_DEMO_PUBLISHER_LABEL = "FICTIONAL DEMO PUBLISHER" as const;
/** Suggested UI badges. */
export const PROVENANCE_BADGES = {
  data_mode: { LIVE: "Real Source", DEMO: "Demo Source" },
  analysis_generation: { PRECOMPUTED: "Pre-generated Analysis", LIVE_AI: "Live AI Analysis" },
  publisher: { fictional_demo_publisher: FICTIONAL_DEMO_PUBLISHER_LABEL },
  quote_verification: { verified_substring: "Verbatim (checked against stored text)", unverifiable: "Quote not checkable (snippet/paywall/fetch failed)", paraphrase: "Paraphrase" },
} as const;
const GenFields = { analysis_generation: AnalysisGenerationSchema, analysis_metadata: AnalysisMetadataSchema.optional() };
function requireMetaWhenLive(o: { analysis_generation: string; analysis_metadata?: unknown }, ctx: z.RefinementCtx) {
  if (o.analysis_generation === "LIVE_AI" && !o.analysis_metadata)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["analysis_metadata"], message: "analysis_metadata is required when analysis_generation is LIVE_AI" });
}
export const BundleDataModeSchema = z.enum(["LIVE", "DEMO", "MIXED"]);
export const NullableDateSchema = z.union([IsoDateSchema, IsoDateTimeSchema]).nullable();
export const UrlSchema = z.string().url().regex(/^https?:\/\//, "Must be http(s)");
export const NullableUrlSchema = UrlSchema.nullable();
/** Hosts reserved for documentation/testing (RFC 2606/6761) — the only hosts allowed in DEMO URLs; forbidden in LIVE URLs. */
export const RESERVED_DEMO_HOST = /(^|\.)(example\.(com|org|net)|[a-z0-9-]+\.example|[a-z0-9-]+\.test|[a-z0-9-]+\.invalid|example|test|invalid|localhost)$/i;
export function isReservedDemoUrl(url: string): boolean {
  const m = /^https?:\/\/([^/?#:]+)/i.exec(url);
  return !!m && RESERVED_DEMO_HOST.test(m[1]!);
}
/** 1.2.0 rule (OF-QA-104): DEMO => reserved host; LIVE => not a reserved host and never retrieval_method generated_demo. */
function checkModeUrl(mode: "LIVE" | "DEMO", url: string | null, method: string | null, path: (string | number)[], ctx: z.RefinementCtx) {
  if (url !== null && mode === "DEMO" && !isReservedDemoUrl(url))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: "[URL-001] DEMO records must use a reserved demo host (example.com/.org/.net, *.example, *.test, *.invalid)" });
  if (url !== null && mode === "LIVE" && isReservedDemoUrl(url))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: "[URL-001] LIVE records must not use a reserved demo host" });
  if (mode === "LIVE" && method === "generated_demo")
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["retrieval_method"], message: "[URL-001] retrieval_method generated_demo requires data_mode DEMO" });
}
export const LanguageSchema = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/);

export const AccessBasisSchema = z.enum(["publisher_summary", "open_license", "excerpt_fair_use", "public_domain", "own_summary_only", "none"]);
export const RetrievalMethodSchema = z.enum(["web_fetch", "pdf_download", "web_search_snippet", "api", "rss", "manual_entry", "generated_demo"]);
/**
 * Added in 1.2.0 (OF-QA-102). Where NewsArticle.accessible_text came from. null iff accessible_text is null.
 * page_capture = text copied from the fetched page; pdf_text = text extracted from the PDF; search_snippet = a search-engine
 * snippet (NOT the publisher page; never usable for verbatim quotes); api_response / rss_item = publisher API / feed text;
 * user_supplied = pasted by the user; generated_demo = fictional demo text.
 */
export const AccessibleTextOriginSchema = z.enum(["page_capture", "pdf_text", "search_snippet", "api_response", "rss_item", "user_supplied", "generated_demo"]);
/**
 * Added in 1.2.0. How a quote/excerpt was checked.
 * verified_substring = exact substring of the cited article's accessible_text at the stored span;
 * unverifiable = presented as the source's words but the source text could not be checked (search snippet only, paywalled,
 *   fetch failed, or no stored accessible_text); NEVER counts toward Verified and is listed in audit.unverifiable_evidence_ids;
 * paraphrase = our own wording.
 */
export const QuoteVerificationSchema = z.enum(["verified_substring", "unverifiable", "paraphrase"]);
/** Character span in the article's accessible_text: JavaScript string (UTF-16 code unit) indices, end exclusive, i.e. text.slice(start, end). */
export const TextSpanSchema = z.object({ start: z.number().int().min(0), end: z.number().int().min(1) }).strict().refine((x) => x.end > x.start, "end must be > start");
/** Origins from which verbatim quotes/excerpts may be taken. */
export const VERBATIM_ORIGINS: ReadonlyArray<z.infer<typeof AccessibleTextOriginSchema>> = ["page_capture", "pdf_text", "api_response", "rss_item", "user_supplied", "generated_demo"];
export const ConfidenceLevelSchema = z.enum(["low", "medium", "high"]);
/** Qualitative only. Numeric credibility scores are prohibited. */
export const ConfidenceSchema = z.object({ level: ConfidenceLevelSchema, rationale: z.string().min(10) }).strict();

export const UnknownReasonSchema = z.enum(["not_published", "not_found", "paywalled", "fetch_failed", "not_applicable", "withheld_for_copyright", "ambiguous_in_source", "demo_placeholder", "other"]);
export const MissingFieldSchema = z.object({ field: z.string(), unknown_reason: UnknownReasonSchema, note: z.string().nullable().optional() }).strict();
export const MissingFieldsSchema = z.array(MissingFieldSchema);

export const ErrorCodeSchema = z.enum(["MISSING_REQUIRED_FIELD", "INVALID_FORMAT", "SOURCE_UNREACHABLE", "PAYWALLED", "RATE_LIMITED", "PARSE_FAILED", "VALIDATION_FAILED", "INSUFFICIENT_EVIDENCE", "COPYRIGHT_RESTRICTED", "DUPLICATE_RECORD", "UNKNOWN_REFERENCE", "UNKNOWN"]);
export const OpenFrameErrorSchema = z.object({
  code: ErrorCodeSchema, message: z.string(), field: z.string().nullable(), recoverable: z.boolean(),
  details: z.record(z.unknown()).nullable().optional(),
}).strict();
export const ApiErrorResponseSchema = z.object({ ok: z.literal(false), errors: z.array(OpenFrameErrorSchema).min(1) }).strict();

export const ProvenanceSchema = z.object({
  data_mode: DataModeSchema, retrieval_method: RetrievalMethodSchema, retrieved_at: IsoDateTimeSchema,
  retrieved_by: z.string(), notes: z.string().nullable().optional(),
}).strict();

export const ClaimTypeSchema = z.enum(["quantitative", "historical", "institutional", "scientific_technical", "economic", "causal"]);
export const AssertionKindSchema = z.enum(["factual_assertion", "opinion", "interpretation", "prediction", "speculation"]);
/** Exact storage = AI output = UI strings. */
export const VerificationStatusSchema = z.enum(["Verified", "Partially Supported", "Disputed", "Unverified", "Contradicted"]);
export const VERIFICATION_STATUSES = VerificationStatusSchema.options;
export const EvidenceKindSchema = z.enum(["primary_document", "primary_statement", "dataset", "original_reporting", "secondary_reporting", "expert_analysis"]);
/** Evidence kinds that count as a primary source for the Verified rule (OF-QA-105). */
export const PRIMARY_EVIDENCE_KINDS: ReadonlyArray<z.infer<typeof EvidenceKindSchema>> = ["primary_document", "primary_statement", "dataset"];
export const ContentTypeSchema = z.enum(["news_report", "analysis", "opinion", "press_release", "interview", "research_report", "union_statement", "official_notice", "job_posting", "other"]);
export const PublisherTypeSchema = z.enum(["trade_press", "mainstream_news", "specialist_outlet", "wire_service", "union_or_guild", "company", "research_org", "government", "blog_or_newsletter", "other"]);

export const NarrativeDimensionSchema = z.enum(["main_argument", "causal_attribution", "responsibility_attribution", "language_framing", "source_selection", "underrepresented_perspectives"]);
export const NARRATIVE_DIMENSION_LABELS: Record<z.infer<typeof NarrativeDimensionSchema>, string> = {
  main_argument: "Main Argument",
  causal_attribution: "Causal Attribution",
  responsibility_attribution: "Responsibility Attribution",
  language_framing: "Language Framing",
  source_selection: "Source Selection",
  underrepresented_perspectives: "Underrepresented Perspectives",
};

const ErrorsField = z.array(OpenFrameErrorSchema).optional();
const NS = z.string().nullable();

/* ----------------------------- News article ---------------------------- */
export const NewsArticleSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  analysis_role: z.enum(["analysed", "evidence_only"]),
  title: z.string().min(1),
  /** fictional_demo_publisher (1.2.0): true exactly when data_mode is DEMO; UI shows FICTIONAL_DEMO_PUBLISHER_LABEL. */
  publisher: z.object({ name: z.string().min(1), domain: NS, publisher_type: PublisherTypeSchema, fictional_demo_publisher: z.boolean() }).strict(),
  publication_date: NullableDateSchema,
  original_url: UrlSchema,
  author: NS,
  summary: z.string().min(1),
  accessible_text: z.string().max(2000).nullable(),
  accessible_text_origin: AccessibleTextOriginSchema.nullable(),
  access_basis: AccessBasisSchema,
  retrieval_timestamp: IsoDateTimeSchema,
  retrieval_method: RetrievalMethodSchema,
  language: LanguageSchema,
  content_type: ContentTypeSchema,
  paywalled: z.boolean().nullable().optional(),
  dedup: z.object({
    duplicate_of: IdSchema.nullable(),
    syndicated_from: NS,
    shared_original_sources: z.array(z.object({ description: z.string(), url: NullableUrlSchema, independence_group_id: IdSchema }).strict()),
    independence_group_id: IdSchema,
    dedup_notes: NS.optional(),
  }).strict(),
  topics: z.array(z.string()).optional(),
  provenance: ProvenanceSchema.optional(),
  missing_fields: MissingFieldsSchema,
  errors: ErrorsField,
}).strict().superRefine((a, ctx) => {
  if (a.access_basis === "none" && a.accessible_text !== null)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accessible_text"], message: "must be null when access_basis is 'none'" });
  if ((a.accessible_text === null) !== (a.accessible_text_origin === null))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accessible_text_origin"], message: "[ORG-001] must be null exactly when accessible_text is null" });
  if (a.accessible_text_origin === "generated_demo" && a.data_mode !== "DEMO")
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accessible_text_origin"], message: "[ORG-001] generated_demo text requires data_mode DEMO" });
  checkModeUrl(a.data_mode, a.original_url, a.retrieval_method, ["original_url"], ctx);
  if (a.publisher.fictional_demo_publisher !== (a.data_mode === "DEMO"))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["publisher", "fictional_demo_publisher"], message: "[PUB-001] must be true when data_mode is DEMO and false when LIVE" });
});

/* ------------------------- Narrative comparison ------------------------ */
export const QuotedVoiceSchema = z.object({
  speaker: z.string(),
  speaker_role: NS,
  speaker_category: z.enum(["executive", "creator_or_artist", "union_or_guild", "worker", "analyst_or_researcher", "journalist", "official", "audience", "anonymous", "other"]).optional(),
  quote_mode: z.enum(["verbatim", "paraphrase"]),
  verbatim_quote: z.string().max(400).nullable(),
  paraphrase: NS,
  quote_verification: QuoteVerificationSchema,
  quote_span: TextSpanSchema.nullable(),
}).strict().superRefine((q, ctx) => {
  if (q.quote_mode === "verbatim" && q.quote_verification === "paraphrase")
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quote_verification"], message: "[QTE-001] verbatim quote must be verified_substring or unverifiable" });
  if (q.quote_mode === "paraphrase" && q.quote_verification !== "paraphrase")
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quote_verification"], message: "[QTE-001] paraphrase must have quote_verification 'paraphrase'" });
  if ((q.quote_span !== null) !== (q.quote_verification === "verified_substring"))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["quote_span"], message: "[QTE-002] quote_span is required for verified_substring and must be null otherwise" });
  if (q.quote_mode === "verbatim" && !q.verbatim_quote)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["verbatim_quote"], message: "required when quote_mode is 'verbatim'" });
  if (q.quote_mode === "paraphrase") {
    if (q.verbatim_quote !== null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["verbatim_quote"], message: "must be null for paraphrase" });
    if (!q.paraphrase) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["paraphrase"], message: "required for paraphrase" });
  }
});

export const KeyActorSchema = z.object({
  name: z.string(),
  actor_type: z.enum(["person", "company", "union_or_guild", "government", "research_org", "industry_body", "technology", "group", "other"]),
  role_in_article: z.string(),
}).strict();

export const ArticleAnalysisSchema = z.object({
  schema_version: SchemaVersionSchema,
  article_id: IdSchema,
  main_argument: z.object({ summary: z.string(), key_actors: z.array(KeyActorSchema) }).strict(),
  causal_attribution: z.object({
    summary: z.string(),
    explanations: z.array(z.object({
      cause: z.string(), effect: z.string(), asserted_by: z.string(),
      evidence_offered_in_article: z.enum(["data", "named_source", "anonymous_source", "none", "unclear"]),
    }).strict()),
  }).strict(),
  responsibility_attribution: z.object({
    summary: z.string(),
    attributions: z.array(z.object({ actor: z.string(), responsible_for: z.string(), attributed_by: z.string() }).strict()),
  }).strict(),
  language_framing: z.object({
    summary: z.string(),
    frames: z.array(z.string()),
    notable_terms: z.array(z.object({ term: z.string(), usage_note: z.string() }).strict()),
    tone_notes: NS,
  }).strict(),
  source_selection: z.object({
    summary: z.string(),
    selected_facts: z.array(z.object({ fact: z.string(), linked_claim_ids: z.array(IdSchema) }).strict()),
    quoted_voices: z.array(QuotedVoiceSchema),
    source_mix_note: NS,
  }).strict(),
  underrepresented_perspectives: z.object({
    summary: z.string(),
    items: z.array(z.object({ perspective: z.string(), note: z.string() }).strict()),
  }).strict(),
  article_level_note: z.string(),
}).strict();

export const NarrativeComparisonSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  ...GenFields,
  topic: z.string(),
  article_ids: z.array(IdSchema).min(1),
  article_analyses: z.array(ArticleAnalysisSchema).min(1),
  cross_article_comparison: z.object({
    shared_facts: z.array(z.object({ fact: z.string(), article_ids: z.array(IdSchema), independence_note: z.string() }).strict()),
    divergences: z.array(z.object({ dimension: NarrativeDimensionSchema, description: z.string(), article_ids: z.array(IdSchema).min(1) }).strict()),
    framing_differences: z.string(),
    voice_distribution: z.string(),
    coverage_gaps: z.array(z.string()),
  }).strict(),
  outlet_level_observations: z.array(z.object({
    publisher: z.string(), observation: z.string(),
    evidence: z.array(z.object({ description: z.string(), url: NullableUrlSchema }).strict()).min(1),
    sample_size_note: z.string(), caveat: z.string(),
  }).strict()),
  method_notes: z.string(),
  provenance: ProvenanceSchema.optional(),
  missing_fields: MissingFieldsSchema,
  errors: ErrorsField,
}).strict().superRefine(requireMetaWhenLive);

/* --------------------------- Claim extraction -------------------------- */
export const ClaimSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  article_id: IdSchema,
  claim_text: z.string().min(1).max(600),
  is_verbatim: z.boolean(),
  claim_type: ClaimTypeSchema,
  secondary_claim_types: z.array(ClaimTypeSchema).optional(),
  assertion_kind: AssertionKindSchema,
  location: z.object({ section: NS, paragraph_index: z.number().int().min(0).nullable(), context: z.string().max(400).nullable() }).strict(),
  attributed_to: z.object({
    name: NS, role: NS,
    attribution_kind: z.enum(["article_author", "quoted_source", "cited_document", "anonymous_source", "unattributed"]),
  }).strict(),
  original_source_hint: z.object({ description: z.string(), url: NullableUrlSchema }).strict().nullable().optional(),
  check_worthy: z.boolean(),
  missing_fields: MissingFieldsSchema,
}).strict();

export const ClaimExtractionSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  ...GenFields,
  topic: z.string(),
  claims: z.array(ClaimSchema),
  provenance: ProvenanceSchema.optional(),
  missing_fields: MissingFieldsSchema,
  errors: ErrorsField,
}).strict().superRefine(requireMetaWhenLive);

/* ---------------------------- Evidence audit --------------------------- */
export const EvidenceItemSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  claim_id: IdSchema,
  article_id: IdSchema,
  url: NullableUrlSchema,
  publisher: z.string(),
  publication_date: NullableDateSchema,
  excerpt: z.string().max(500).nullable(),
  /** Kept for 1.1.0 compatibility; must equal (quote_verification === "verified_substring"). */
  excerpt_is_verbatim: z.boolean(),
  quote_verification: QuoteVerificationSchema,
  excerpt_span: TextSpanSchema.nullable(),
  summary: z.string(),
  evidence_kind: EvidenceKindSchema,
  independence_group_id: IdSchema,
  retrieval_method: RetrievalMethodSchema,
  accessed_at: IsoDateTimeSchema,
}).strict().superRefine((e, ctx) => {
  if (e.excerpt_is_verbatim && !e.excerpt)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["excerpt"], message: "excerpt_is_verbatim requires a non-empty excerpt" });
  if (e.excerpt_is_verbatim !== (e.quote_verification === "verified_substring"))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["excerpt_is_verbatim"], message: "[QTE-001] excerpt_is_verbatim must be true exactly when quote_verification is verified_substring" });
  if ((e.excerpt_span !== null) !== (e.quote_verification === "verified_substring"))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["excerpt_span"], message: "[QTE-002] excerpt_span is required for verified_substring and must be null otherwise" });
  if (e.quote_verification === "unverifiable" && !e.excerpt)
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["excerpt"], message: "[QTE-004] unverifiable needs the purported excerpt text" });
  checkModeUrl(e.data_mode, e.url, e.retrieval_method, ["url"], ctx);
});

/** The ONLY valid way to count independent sources: distinct independence groups. */
export function countIndependentSources(items: ReadonlyArray<{ independence_group_id: string }>): number {
  return new Set(items.map((e) => e.independence_group_id)).size;
}

export const AuditSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  claim_id: IdSchema,
  claim_text: z.string(),
  audited_proposition: NS.optional(),
  status: VerificationStatusSchema,
  supporting_evidence: z.array(EvidenceItemSchema),
  contradicting_evidence: z.array(EvidenceItemSchema),
  original_source_url: NullableUrlSchema,
  explanation: z.string().min(20),
  confidence: ConfidenceSchema,
  confidence_limitations: z.array(z.string()).min(1),
  additional_research_needed: z.array(z.string()),
  independent_source_count: z.object({ supporting: z.number().int().min(0), contradicting: z.number().int().min(0) }).strict(),
  /** 1.2.0: ids of evidence items (either side) whose quote_verification is "unverifiable" — flagged in the UI; never count toward Verified. */
  unverifiable_evidence_ids: z.array(IdSchema),
  audited_at: IsoDateTimeSchema.optional(),
  missing_fields: MissingFieldsSchema,
}).strict().superRefine((a, ctx) => {
  const add = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
  if ((a.status === "Verified" || a.status === "Partially Supported") && a.supporting_evidence.length === 0)
    add(["supporting_evidence"], `status '${a.status}' requires supporting evidence`);
  if ((a.status === "Disputed" || a.status === "Contradicted") && a.contradicting_evidence.length === 0)
    add(["contradicting_evidence"], `status '${a.status}' requires contradicting evidence`);
  if (a.status === "Verified" && a.confidence.level === "low") add(["confidence", "level"], "Verified cannot have low confidence");
  // OF-QA-105: Verified requires a primary source OR >= 2 independent groups; "high" additionally requires that the
  // primary source was read directly (not only as a search snippet) unless >= 2 independent groups support it.
  // Only checkable evidence (quote_verification !== "unverifiable") counts (QTE-005).
  const unver = [...a.supporting_evidence, ...a.contradicting_evidence].filter((e) => e.quote_verification === "unverifiable").map((e) => e.id);
  if (JSON.stringify([...unver].sort()) !== JSON.stringify([...a.unverifiable_evidence_ids].sort()))
    add(["unverifiable_evidence_ids"], `[QTE-005] must list exactly the unverifiable evidence ids: ${JSON.stringify(unver)}`);
  if (a.status === "Verified") {
    const checkable = a.supporting_evidence.filter((e) => e.quote_verification !== "unverifiable");
    const groups = countIndependentSources(checkable);
    const primary = checkable.filter((e) => PRIMARY_EVIDENCE_KINDS.includes(e.evidence_kind));
    if (primary.length === 0 && groups < 2)
      add(["status"], "[AUD-001] Verified requires a checkable primary source (primary_document/primary_statement/dataset, not unverifiable) or >= 2 independent groups of checkable supporting evidence");
    if (a.confidence.level === "high" && groups < 2 && !primary.some((e) => e.retrieval_method !== "web_search_snippet"))
      add(["confidence", "level"], "[AUD-002] Verified/high requires a directly read primary source or >= 2 independent groups of checkable supporting evidence");
  }
  [...a.supporting_evidence, ...a.contradicting_evidence].forEach((e, i) => {
    if (e.claim_id !== a.claim_id) add(["evidence", i, "claim_id"], `[ID-002] evidence ${e.id} claim_id must equal audit claim_id`);
  });
  const s = countIndependentSources(a.supporting_evidence);
  const c = countIndependentSources(a.contradicting_evidence);
  if (a.independent_source_count.supporting !== s) add(["independent_source_count", "supporting"], `expected ${s}`);
  if (a.independent_source_count.contradicting !== c) add(["independent_source_count", "contradicting"], `expected ${c}`);
});

export const EvidenceAuditSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  data_mode: DataModeSchema,
  ...GenFields,
  audits: z.array(AuditSchema),
  independence_groups: z.array(z.object({ id: IdSchema, description: z.string(), origin_url: NullableUrlSchema }).strict()).optional(),
  provenance: ProvenanceSchema.optional(),
  missing_fields: MissingFieldsSchema,
  errors: ErrorsField,
}).strict().superRefine(requireMetaWhenLive);

/* ---------------------------- Research report -------------------------- */
export const ReportWarningCodeSchema = z.enum(["DEMO_DATA", "MIXED_DATA", "PAYWALL_LIMITED", "SNIPPET_ONLY_SOURCES", "SMALL_SAMPLE", "SHARED_ORIGINAL_SOURCE", "STALE_DATA", "TITLE_OR_FACT_DISCREPANCY", "OTHER"]);

/**
 * Report-level finding strength (1.2.0). A finding may not be stronger than its weakest linked audit:
 * Verified -> up to established; Partially Supported -> up to partially_established; Disputed -> up to contested;
 * Unverified / Contradicted -> not_established.
 */
export const FindingStrengthSchema = z.enum(["established", "partially_established", "contested", "not_established"]);
export const FINDING_STRENGTH_RANK: Record<z.infer<typeof FindingStrengthSchema>, number> = { established: 3, partially_established: 2, contested: 1, not_established: 0 };
export const MAX_STRENGTH_FOR_STATUS: Record<z.infer<typeof VerificationStatusSchema>, z.infer<typeof FindingStrengthSchema>> = {
  Verified: "established", "Partially Supported": "partially_established", Disputed: "contested", Unverified: "not_established", Contradicted: "not_established",
};
export const KeyFindingSchema = z.object({
  id: IdSchema, // fnd_...
  statement: z.string().min(10),
  strength: FindingStrengthSchema,
  claim_ids: z.array(IdSchema).min(1),
  audit_ids: z.array(IdSchema).min(1),
  basis_note: NS.optional(),
}).strict();

export const ResearchReportSchema = z.object({
  schema_version: SchemaVersionSchema,
  id: IdSchema,
  ...GenFields,
  metadata: z.object({
    topic: z.string(),
    research_question: z.string(),
    data_mode: BundleDataModeSchema,
    generated_at: IsoDateTimeSchema,
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    generator: NS.optional(),
    coverage_window: z.object({ from: NullableDateSchema, to: NullableDateSchema }).strict().nullable().optional(),
    warnings: z.array(z.object({ code: ReportWarningCodeSchema, message: z.string() }).strict()),
    correction_log: z.array(z.object({ version: z.string(), date: IsoDateTimeSchema, change: z.string(), reason: z.string() }).strict()).optional(),
  }).strict(),
  /** finding_ids (1.2.0): the key_findings the summary rests on. */
  executive_summary: z.object({ text: z.string(), bottom_line: z.string(), confidence: ConfidenceSchema, finding_ids: z.array(IdSchema).min(1) }).strict(),
  /** 1.2.0: every report-level conclusion, traceable to claims and audits (rules RPT-001..RPT-006). */
  key_findings: z.array(KeyFindingSchema).min(1),
  topic_background: z.object({
    text: z.string(),
    /** source_ids -> research_report.source_list[].id (src_...). */
    timeline: z.array(z.object({ date: NullableDateSchema, event: z.string(), source_ids: z.array(IdSchema) }).strict()),
  }).strict(),
  article_comparison: z.object({
    narrative_comparison_id: IdSchema.nullable(),
    summary: z.string(),
    rows: z.array(z.object({
      article_id: IdSchema, publisher: z.string(), content_type: ContentTypeSchema,
      main_argument_short: z.string(), primary_frame: z.string(), independence_group_id: IdSchema,
    }).strict()),
  }).strict(),
  narrative_analysis: z.object({
    text: z.string(),
    key_patterns: z.array(z.string()),
    dimension_summaries: z.object({
      main_argument: z.string(), causal_attribution: z.string(), responsibility_attribution: z.string(),
      language_framing: z.string(), source_selection: z.string(), underrepresented_perspectives: z.string(),
    }).strict(),
  }).strict(),
  key_claim_verification: z.array(z.object({
    claim_id: IdSchema, audit_id: IdSchema, article_id: IdSchema, claim_text: z.string(),
    status: VerificationStatusSchema, confidence_level: ConfidenceLevelSchema, one_line_explanation: z.string(),
  }).strict()),
  evidence_limitations: z.array(z.string()),
  information_gaps: z.array(z.object({ gap: z.string(), why_it_matters: z.string(), absence_interpretation: z.string() }).strict()),
  further_research_questions: z.array(z.string()),
  source_list: z.array(z.object({
    id: IdSchema, article_id: IdSchema, title: z.string(), publisher: z.string(), url: UrlSchema,
    publication_date: NullableDateSchema, author: NS, data_mode: DataModeSchema,
    retrieval_method: RetrievalMethodSchema, access_note: NS,
    used_for: z.array(z.enum(["article_analysed", "evidence", "background", "primary_source"])),
  }).strict().superRefine((s, ctx) => checkModeUrl(s.data_mode, s.url, s.retrieval_method, ["url"], ctx))),
  missing_fields: MissingFieldsSchema,
  errors: ErrorsField,
}).strict().superRefine((r, ctx) => {
  requireMetaWhenLive(r, ctx);
  if (r.metadata.data_mode !== "LIVE" && !r.metadata.warnings.some((w) => w.code === "DEMO_DATA" || w.code === "MIXED_DATA"))
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["metadata", "warnings"], message: "DEMO/MIXED reports must carry a DEMO_DATA or MIXED_DATA warning" });
});

/* ------------------------- Bundle (API payload) ------------------------ */
export const AnalysisBundleSchema = z.object({
  $schema: z.string().optional(),
  schema_version: SchemaVersionSchema,
  bundle_id: IdSchema,
  data_mode: BundleDataModeSchema,
  data_mode_notice: NS.optional(),
  ...GenFields,
  generated_at: IsoDateTimeSchema,
  articles: z.array(NewsArticleSchema),
  narrative_comparison: NarrativeComparisonSchema,
  claim_extraction: ClaimExtractionSchema,
  evidence_audit: EvidenceAuditSchema,
  research_report: ResearchReportSchema,
}).strict().superRefine((b, ctx) => {
  requireMetaWhenLive(b, ctx);
  for (const i of checkBundleIntegrity(b)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: i.path, message: i.message, params: { rule: i.rule } });
});

/* ----------------------- Stance-term denylist (OF-QA-106) ----------------------- */
/**
 * Political/ideological stance terms that must never appear in analysis text (frames, summaries, report prose).
 * Deliberately phrase-based so neutral uses ("workers who left", "a conservative estimate") are not blocked.
 */
export const STANCE_TERMS_RE = new RegExp([
  "\\b(?:far|hard|centre|center|alt|extreme|ultra)[- ]?(?:left|right)\\b",
  "\\b(?:left|right)[- ](?:wing(?:ers?)?|lean(?:ing|s)?|of[- ]cent(?:er|re)|bias(?:ed)?|slant(?:ed)?)\\b",
  "\\b(?:left|right)ists?\\b",
  "\\bpartisan(?:ship)?\\b",
  "\\b(?:liberal|conservative|progressive|leftist|rightist|reactionary)[- ](?:bias(?:ed)?|media|outlets?|slant(?:ed)?|lean(?:ing)?|agenda|press|newspapers?|stance)\\b",
  "\\bpolitical(?:ly)?[- ](?:bias(?:ed)?|slant(?:ed)?|lean(?:ing)?|stance|alignment|aligned)\\b",
  "\\bideologically[- ](?:driven|biased|slanted|aligned)\\b",
].join("|"), "i");
/** Paths (regex on dotted path) whose strings are quoted third-party text and are NOT stance-checked. */
const STANCE_SKIP = /(^|\.)(verbatim_quote|claim_text|excerpt|title|accessible_text|original_url|url|context)$/;
export function findStanceTerms(value: unknown, path = "$"): { path: string; match: string }[] {
  if (typeof value === "string") {
    const m = STANCE_SKIP.test(path) ? null : STANCE_TERMS_RE.exec(value);
    return m ? [{ path, match: m[0] }] : [];
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => findStanceTerms(v, `${path}[${i}]`).map((x) => x));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => findStanceTerms(v, `${path}.${k}`));
  return [];
}

/* ----------------------- Bundle integrity (cross-object) ----------------------- */
/**
 * Machine-checkable cross-object rules (1.2.0). Every issue message starts with its rule id, e.g. "[RPT-002] ...".
 * Documented in README §Integrity rules. Enforced by AnalysisBundleSchema (superRefine) and scripts/zodcheck.ts.
 */
export const INTEGRITY_RULES = {
  "GEN-001": "analysis_generation is identical on the bundle and its four analysis parts",
  "GEN-002": "a PRECOMPUTED bundle's data_mode_notice must not claim live AI analysis",
  "ID-001": "ids are unique per kind and across all record kinds (articles, claims, audits, evidence, source_list, findings, part ids)",
  "ID-002": "every reference resolves: claim/evidence/analysis/shared_facts/divergences/rows/source_list article_id, dedup.duplicate_of, linked_claim_ids, evidence.claim_id, audit.claim_id",
  "ID-003": "timeline.source_ids reference research_report.source_list[].id (src_...)",
  "ID-004": "one audit per claim; every check_worthy claim has an audit; audit.claim_text equals the claim's claim_text",
  "ID-005": "evidence/source_list url and data_mode equal the cited article's original_url and data_mode",
  "RPT-001": "key_claim_verification rows: audit_id exists; claim_id and article_id match the audit and its claim",
  "RPT-002": "key_claim_verification status and confidence_level are copied exactly from the audit (never upgraded)",
  "RPT-003": "key_findings: claim_ids and audit_ids exist and audit_ids are exactly the audits of claim_ids",
  "RPT-004": "key_findings: strength is not stronger than the weakest linked audit (MAX_STRENGTH_FOR_STATUS)",
  "RPT-005": "key_findings: any verification status named in the statement must be the status of a linked audit; non-established findings may not use certainty words (confirmed, proven, definitively, beyond doubt)",
  "RPT-006": "executive_summary.finding_ids resolve to key_findings",
  "QTE-003": "verified_substring text equals accessible_text.slice(span.start, span.end) of the cited article, whose accessible_text_origin allows verbatim (not search_snippet); verbatim claims are exact substrings",
  "QTE-004": "unverifiable is allowed only when the cited article's text genuinely cannot be checked (accessible_text null, origin search_snippet, or paywalled)",
  "STN-001": "no political/ideological stance terms in analysis text (STANCE_TERMS_RE)",
  "MOD-001": "bundle/report data_mode consistent with record data_modes (LIVE/DEMO/MIXED)",
  // Record-level rules (enforced inside the record schemas; listed here so every rule id is documented in one place)
  "ORG-001": "accessible_text_origin is null exactly when accessible_text is null; origin generated_demo requires data_mode DEMO",
  "PUB-001": "publisher.fictional_demo_publisher is true exactly when the article's data_mode is DEMO",
  "URL-001": "DEMO records use reserved demo hosts; LIVE records never do and never use retrieval_method generated_demo",
  "QTE-001": "quote_verification agrees with quote_mode / excerpt_is_verbatim (verbatim => verified_substring|unverifiable; paraphrase => paraphrase)",
  "QTE-002": "a span (quote_span / excerpt_span) is present exactly when quote_verification is verified_substring",
  "QTE-005": "audit.unverifiable_evidence_ids lists exactly the audit's unverifiable evidence; unverifiable evidence never counts toward Verified",
  "AUD-001": "Verified requires a checkable primary source or >= 2 independent groups of checkable supporting evidence",
  "AUD-002": "Verified/high additionally requires a directly read (non-snippet) primary source or >= 2 checkable groups",
} as const;
export type IntegrityRuleId = keyof typeof INTEGRITY_RULES;
export type IntegrityIssue = { rule: IntegrityRuleId; path: (string | number)[]; message: string };
type BundleLike = z.infer<typeof AnalysisBundleShape>;
const AnalysisBundleShape = z.object({
  articles: z.array(NewsArticleSchema), narrative_comparison: NarrativeComparisonSchema, claim_extraction: ClaimExtractionSchema,
  evidence_audit: EvidenceAuditSchema, research_report: ResearchReportSchema,
  data_mode: BundleDataModeSchema, analysis_generation: AnalysisGenerationSchema, data_mode_notice: NS.optional(),
});
const LIVE_AI_CLAIM_RE = /live[ _-]?ai|generated live|real[- ]time analysis/i;
const LIVE_AI_NEGATED_RE = /not (?:a |by a |by |produced by a |generated by a )?(?:live[ _-]?ai|generated live|real[- ]time)/i;
const CERTAINTY_RE = /\b(?:confirmed|proven|definitively|undeniabl\w*|beyond (?:any )?doubt|indisputabl\w*)\b/i;

export function checkBundleIntegrity(b: BundleLike): IntegrityIssue[] {
  const out: IntegrityIssue[] = [];
  const add = (rule: IntegrityRuleId, path: (string | number)[], message: string) => out.push({ rule, path, message: `[${rule}] ${message}` });
  const parts = [["narrative_comparison", b.narrative_comparison], ["claim_extraction", b.claim_extraction], ["evidence_audit", b.evidence_audit], ["research_report", b.research_report]] as const;
  parts.forEach(([k, part]) => { if (part.analysis_generation !== b.analysis_generation) add("GEN-001", [k, "analysis_generation"], `must equal bundle analysis_generation (${b.analysis_generation})`); });
  if (b.analysis_generation === "PRECOMPUTED" && b.data_mode_notice && LIVE_AI_CLAIM_RE.test(b.data_mode_notice) && !LIVE_AI_NEGATED_RE.test(b.data_mode_notice))
    add("GEN-002", ["data_mode_notice"], "PRECOMPUTED bundle notice must not claim live AI analysis");

  const dupCheck = (ids: string[], path: (string | number)[], what: string) => {
    const seen = new Set<string>();
    ids.forEach((id) => { if (seen.has(id)) add("ID-001", path, `duplicate ${what} id ${id}`); seen.add(id); });
  };
  const rep = b.research_report; const nc = b.narrative_comparison;
  const articles = new Map(b.articles.map((a) => [a.id, a]));
  const claims = new Map(b.claim_extraction.claims.map((c) => [c.id, c]));
  const audits = b.evidence_audit.audits;
  const auditById = new Map(audits.map((a) => [a.id, a]));
  const sourceIds = new Set(rep.source_list.map((s) => s.id));
  const findingIds = new Set(rep.key_findings.map((f) => f.id));
  const allEvidence = audits.flatMap((a, ai) => [
    ...a.supporting_evidence.map((e, j) => ({ e, path: ["evidence_audit", "audits", ai, "supporting_evidence", j] as (string | number)[] })),
    ...a.contradicting_evidence.map((e, j) => ({ e, path: ["evidence_audit", "audits", ai, "contradicting_evidence", j] as (string | number)[] })),
  ]);
  dupCheck(b.articles.map((a) => a.id), ["articles"], "article");
  dupCheck(b.claim_extraction.claims.map((c) => c.id), ["claim_extraction", "claims"], "claim");
  dupCheck(audits.map((a) => a.id), ["evidence_audit", "audits"], "audit");
  dupCheck(allEvidence.map((x) => x.e.id), ["evidence_audit"], "evidence");
  dupCheck(rep.source_list.map((s) => s.id), ["research_report", "source_list"], "source_list");
  dupCheck(rep.key_findings.map((f) => f.id), ["research_report", "key_findings"], "finding");
  dupCheck(nc.article_analyses.map((a) => a.article_id), ["narrative_comparison", "article_analyses"], "article_analyses.article_id");
  dupCheck([...articles.keys(), ...claims.keys(), ...auditById.keys(), ...allEvidence.map((x) => x.e.id), ...sourceIds, ...findingIds,
    nc.id, b.claim_extraction.id, b.evidence_audit.id, rep.id], [], "record (global)");

  const needArticle = (id: string, path: (string | number)[]) => { if (!articles.has(id)) add("ID-002", path, `unknown article ${id}`); };
  const needClaim = (id: string, path: (string | number)[]) => { if (!claims.has(id)) add("ID-002", path, `unknown claim ${id}`); };
  b.articles.forEach((a, i) => { if (a.dedup.duplicate_of !== null) needArticle(a.dedup.duplicate_of, ["articles", i, "dedup", "duplicate_of"]); });
  b.claim_extraction.claims.forEach((c, i) => needArticle(c.article_id, ["claim_extraction", "claims", i, "article_id"]));
  allEvidence.forEach(({ e, path }) => {
    needArticle(e.article_id, [...path, "article_id"]);
    needClaim(e.claim_id, [...path, "claim_id"]);
    const art = articles.get(e.article_id);
    if (art && e.url !== null && e.url !== art.original_url) add("ID-005", [...path, "url"], `evidence ${e.id}: url must equal article ${art.id}.original_url`);
    if (art && e.data_mode !== art.data_mode) add("ID-005", [...path, "data_mode"], `evidence ${e.id}: data_mode must equal article ${art.id}.data_mode`);
  });
  dupCheck(audits.map((a) => a.claim_id), ["evidence_audit", "audits"], "audit claim_id (one audit per claim)");
  audits.forEach((a, i) => {
    needClaim(a.claim_id, ["evidence_audit", "audits", i, "claim_id"]);
    const c = claims.get(a.claim_id);
    if (c && a.claim_text !== c.claim_text) add("ID-004", ["evidence_audit", "audits", i, "claim_text"], `must equal claim ${c.id}.claim_text`);
  });
  const audited = new Set(audits.map((a) => a.claim_id));
  b.claim_extraction.claims.forEach((c, i) => { if (c.check_worthy && !audited.has(c.id)) add("ID-004", ["claim_extraction", "claims", i], `check-worthy claim ${c.id} has no audit`); });
  const ncIds = new Set(nc.article_ids);
  nc.article_ids.forEach((id, i) => needArticle(id, ["narrative_comparison", "article_ids", i]));
  nc.article_analyses.forEach((aa, i) => {
    needArticle(aa.article_id, ["narrative_comparison", "article_analyses", i, "article_id"]);
    if (!ncIds.has(aa.article_id)) add("ID-002", ["narrative_comparison", "article_analyses", i, "article_id"], `${aa.article_id} is not listed in narrative_comparison.article_ids`);
    aa.source_selection.selected_facts.forEach((f, j) => f.linked_claim_ids.forEach((cid, k) =>
      needClaim(cid, ["narrative_comparison", "article_analyses", i, "source_selection", "selected_facts", j, "linked_claim_ids", k])));
  });
  (["shared_facts", "divergences"] as const).forEach((key) => nc.cross_article_comparison[key].forEach((f, i) =>
    f.article_ids.forEach((id, k) => needArticle(id, ["narrative_comparison", "cross_article_comparison", key, i, "article_ids", k]))));
  if (rep.article_comparison.narrative_comparison_id !== null && rep.article_comparison.narrative_comparison_id !== nc.id)
    add("ID-002", ["research_report", "article_comparison", "narrative_comparison_id"], `must be ${nc.id} or null`);
  rep.article_comparison.rows.forEach((r, i) => needArticle(r.article_id, ["research_report", "article_comparison", "rows", i, "article_id"]));
  rep.topic_background.timeline.forEach((t, i) => t.source_ids.forEach((sid, k) => {
    if (!sourceIds.has(sid)) add("ID-003", ["research_report", "topic_background", "timeline", i, "source_ids", k], `unknown source_list id ${sid} (timeline.source_ids reference research_report.source_list[].id)`);
  }));
  rep.source_list.forEach((s, i) => {
    needArticle(s.article_id, ["research_report", "source_list", i, "article_id"]);
    const art = articles.get(s.article_id);
    if (art && s.url !== art.original_url) add("ID-005", ["research_report", "source_list", i, "url"], `must equal article ${art.id}.original_url`);
    if (art && s.data_mode !== art.data_mode) add("ID-005", ["research_report", "source_list", i, "data_mode"], `must equal article ${art.id}.data_mode`);
  });

  // ---- Report derives only from the audit set (OF-QA-101 + 1.2.0 traceability)
  rep.key_claim_verification.forEach((k, i) => {
    const p = ["research_report", "key_claim_verification", i];
    const au = auditById.get(k.audit_id);
    needClaim(k.claim_id, [...p, "claim_id"]);
    needArticle(k.article_id, [...p, "article_id"]);
    if (!au) { add("RPT-001", [...p, "audit_id"], `unknown audit ${k.audit_id}`); return; }
    if (au.claim_id !== k.claim_id) add("RPT-001", [...p, "claim_id"], `must equal audit ${au.id}.claim_id (${au.claim_id})`);
    const c = claims.get(k.claim_id);
    if (c && c.article_id !== k.article_id) add("RPT-001", [...p, "article_id"], `must equal claim ${c.id}.article_id (${c.article_id})`);
    if (au.status !== k.status) add("RPT-002", [...p, "status"], `must equal audit ${au.id}.status (${au.status})`);
    if (au.confidence.level !== k.confidence_level) add("RPT-002", [...p, "confidence_level"], `must equal audit ${au.id}.confidence.level (${au.confidence.level})`);
  });
  dupCheck(rep.key_claim_verification.map((k) => k.audit_id), ["research_report", "key_claim_verification"], "key_claim_verification audit_id");
  rep.key_findings.forEach((f, i) => {
    const p = ["research_report", "key_findings", i];
    f.claim_ids.forEach((cid, k) => { if (!claims.has(cid)) add("RPT-003", [...p, "claim_ids", k], `unknown claim ${cid}`); });
    const linked = f.audit_ids.map((aid, k) => { const a = auditById.get(aid); if (!a) add("RPT-003", [...p, "audit_ids", k], `unknown audit ${aid}`); return a; }).filter((a): a is NonNullable<typeof a> => !!a);
    const auditedClaims = new Set(linked.map((a) => a.claim_id));
    const wanted = new Set(f.claim_ids);
    if (auditedClaims.size !== wanted.size || [...wanted].some((c) => !auditedClaims.has(c)))
      add("RPT-003", [...p, "audit_ids"], `audit_ids must be exactly the audits of claim_ids (audits cover ${JSON.stringify([...auditedClaims])})`);
    if (!linked.length) return;
    const maxRank = Math.min(...linked.map((a) => FINDING_STRENGTH_RANK[MAX_STRENGTH_FOR_STATUS[a.status]]));
    if (FINDING_STRENGTH_RANK[f.strength] > maxRank) {
      const weakest = linked.reduce((w, a) => FINDING_STRENGTH_RANK[MAX_STRENGTH_FOR_STATUS[a.status]] < FINDING_STRENGTH_RANK[MAX_STRENGTH_FOR_STATUS[w.status]] ? a : w);
      add("RPT-004", [...p, "strength"], `'${f.strength}' is stronger than the weakest linked audit ${weakest.id} (${weakest.status} allows at most '${MAX_STRENGTH_FOR_STATUS[weakest.status]}')`);
    }
    const statuses = new Set(linked.map((a) => a.status));
    for (const st of VERIFICATION_STATUSES) if (new RegExp(`(?<![A-Za-z])${st}(?![A-Za-z])`).test(f.statement) && !statuses.has(st)) add("RPT-005", [...p, "statement"], `names status '${st}' but no linked audit has that status`);
    if (f.strength !== "established" && CERTAINTY_RE.test(f.statement)) add("RPT-005", [...p, "statement"], `non-established finding uses certainty wording ("${CERTAINTY_RE.exec(f.statement)![0]}")`);
  });
  rep.executive_summary.finding_ids.forEach((fid, k) => { if (!findingIds.has(fid)) add("RPT-006", ["research_report", "executive_summary", "finding_ids", k], `unknown finding ${fid}`); });

  // ---- Quotes (OF-QA-102 + 1.2.0 quote_verification)
  const checkVerified = (articleId: string, text: string, span: { start: number; end: number } | null, path: (string | number)[], what: string) => {
    const art = articles.get(articleId);
    if (!art) return;
    if (art.accessible_text === null || art.accessible_text_origin === null) { add("QTE-003", path, `${what}: verbatim but article ${art.id} has no accessible_text`); return; }
    if (!VERBATIM_ORIGINS.includes(art.accessible_text_origin)) { add("QTE-003", path, `${what}: verbatim not allowed from accessible_text_origin '${art.accessible_text_origin}' (article ${art.id}); use quote_verification 'unverifiable'`); return; }
    if (span) { if (art.accessible_text.slice(span.start, span.end) !== text) add("QTE-003", path, `${what}: text != article ${art.id}.accessible_text.slice(${span.start}, ${span.end})`); }
    else if (!art.accessible_text.includes(text)) add("QTE-003", path, `${what}: verbatim text is not an exact substring of article ${art.id}.accessible_text`);
  };
  const checkUnverifiable = (articleId: string, path: (string | number)[], what: string) => {
    const art = articles.get(articleId);
    if (art && !(art.accessible_text === null || art.accessible_text_origin === "search_snippet" || art.paywalled === true))
      add("QTE-004", path, `${what}: 'unverifiable' but article ${art.id} has checkable accessible_text (${art.accessible_text_origin}); verify it or paraphrase`);
  };
  allEvidence.forEach(({ e, path }) => {
    if (e.quote_verification === "verified_substring" && e.excerpt) checkVerified(e.article_id, e.excerpt, e.excerpt_span, [...path, "excerpt"], `evidence ${e.id}`);
    if (e.quote_verification === "unverifiable") checkUnverifiable(e.article_id, [...path, "quote_verification"], `evidence ${e.id}`);
  });
  b.claim_extraction.claims.forEach((c, i) => { if (c.is_verbatim) checkVerified(c.article_id, c.claim_text, null, ["claim_extraction", "claims", i, "claim_text"], `claim ${c.id}`); });
  nc.article_analyses.forEach((aa, i) => aa.source_selection.quoted_voices.forEach((q, j) => {
    const p = ["narrative_comparison", "article_analyses", i, "source_selection", "quoted_voices", j];
    if (q.quote_verification === "verified_substring" && q.verbatim_quote) checkVerified(aa.article_id, q.verbatim_quote, q.quote_span, [...p, "verbatim_quote"], `quote by ${q.speaker}`);
    if (q.quote_verification === "unverifiable") checkUnverifiable(aa.article_id, [...p, "quote_verification"], `quote by ${q.speaker}`);
  }));

  // ---- Stance denylist (OF-QA-106)
  const stanceTargets: [string, unknown][] = [["narrative_comparison", nc], ["evidence_audit", b.evidence_audit], ["research_report", rep],
    ...b.articles.map((a, i) => [`articles[${i}].summary`, a.summary] as [string, unknown])];
  stanceTargets.forEach(([root, v]) => findStanceTerms(v, `$.${root}`).forEach((h) => add("STN-001", [h.path], `stance term "${h.match}" is not allowed (describe framing neutrally)`)));

  // ---- data_mode consistency
  const modes = new Set<string>([
    ...b.articles.map((a) => a.data_mode), nc.data_mode, b.claim_extraction.data_mode, b.evidence_audit.data_mode,
    ...b.claim_extraction.claims.map((c) => c.data_mode), ...audits.map((a) => a.data_mode), ...allEvidence.map((x) => x.e.data_mode),
  ]);
  if (b.data_mode === "LIVE" && modes.has("DEMO")) add("MOD-001", ["data_mode"], "LIVE bundle contains DEMO records; use MIXED");
  if (b.data_mode === "DEMO" && modes.has("LIVE")) add("MOD-001", ["data_mode"], "DEMO bundle contains LIVE records; use MIXED");
  if (rep.metadata.data_mode !== b.data_mode) add("MOD-001", ["research_report", "metadata", "data_mode"], "must equal bundle data_mode");
  b.claim_extraction.claims.forEach((c, i) => { const a = articles.get(c.article_id); if (a && c.data_mode !== a.data_mode) add("MOD-001", ["claim_extraction", "claims", i, "data_mode"], `must equal article ${a.id}.data_mode`); });
  return out;
}

/* ----------------------- Traceability helper (1.2.0) ----------------------- */
export type TraceSpan = { article_id: string; text: string; start: number; end: number } | null;
export type TraceEvidence = { evidence: EvidenceItem; side: "supporting" | "contradicting"; article: NewsArticle | undefined; span: TraceSpan; counts_toward_verified: boolean };
export type TraceClaim = { claim: Claim; source_article: NewsArticle | undefined; claim_span: TraceSpan; audit: Audit | undefined; evidence: TraceEvidence[] };
export type FindingTrace = { finding: KeyFinding; claims: TraceClaim[]; issues: IntegrityIssue[] };

/** Resolve a span in an article's accessible_text (null if not checkable). */
export function resolveSpan(article: NewsArticle | undefined, text: string | null, span: { start: number; end: number } | null): TraceSpan {
  if (!article?.accessible_text || !text) return null;
  if (span && article.accessible_text.slice(span.start, span.end) === text) return { article_id: article.id, text, ...span };
  const i = article.accessible_text.indexOf(text);
  return i < 0 ? null : { article_id: article.id, text, start: i, end: i + text.length };
}

/**
 * finding -> claims -> audits -> evidence -> article accessible_text span. For UI drill-down ("why does the report say this?").
 * Only verified_substring evidence gets a span; unverifiable evidence is returned with span null and counts_toward_verified false.
 */
export function traceFinding(b: AnalysisBundle, findingId: string): FindingTrace | null {
  const f = b.research_report.key_findings.find((x) => x.id === findingId);
  if (!f) return null;
  const articles = new Map(b.articles.map((a) => [a.id, a]));
  const claims = new Map(b.claim_extraction.claims.map((c) => [c.id, c]));
  const auditsByClaim = new Map(b.evidence_audit.audits.filter((a) => f.audit_ids.includes(a.id)).map((a) => [a.claim_id, a]));
  const issues = checkBundleIntegrity(b).filter((i) => i.path[0] === "research_report" && i.path[1] === "key_findings" && i.path[2] === b.research_report.key_findings.indexOf(f));
  return {
    finding: f, issues,
    claims: f.claim_ids.flatMap((cid) => {
      const claim = claims.get(cid); if (!claim) return [];
      const audit = auditsByClaim.get(cid); const source_article = articles.get(claim.article_id);
      const ev = (side: "supporting" | "contradicting", items: EvidenceItem[]): TraceEvidence[] => items.map((e) => {
        const article = articles.get(e.article_id);
        return { evidence: e, side, article, span: e.quote_verification === "verified_substring" ? resolveSpan(article, e.excerpt, e.excerpt_span) : null, counts_toward_verified: e.quote_verification !== "unverifiable" };
      });
      return [{ claim, source_article, claim_span: claim.is_verbatim ? resolveSpan(source_article, claim.claim_text, null) : null, audit,
        evidence: audit ? [...ev("supporting", audit.supporting_evidence), ...ev("contradicting", audit.contradicting_evidence)] : [] }];
    }),
  };
}

/* ---------------------------- Inferred types --------------------------- */
export type Id = z.infer<typeof IdSchema>;
export type DataMode = z.infer<typeof DataModeSchema>;
export type AnalysisGeneration = z.infer<typeof AnalysisGenerationSchema>;
export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;
export type BundleDataMode = z.infer<typeof BundleDataModeSchema>;
export type AccessBasis = z.infer<typeof AccessBasisSchema>;
export type RetrievalMethod = z.infer<typeof RetrievalMethodSchema>;
export type Confidence = z.infer<typeof ConfidenceSchema>;
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type MissingField = z.infer<typeof MissingFieldSchema>;
export type UnknownReason = z.infer<typeof UnknownReasonSchema>;
export type OpenFrameError = z.infer<typeof OpenFrameErrorSchema>;
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type Provenance = z.infer<typeof ProvenanceSchema>;
export type ClaimType = z.infer<typeof ClaimTypeSchema>;
export type AssertionKind = z.infer<typeof AssertionKindSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>;
export type NarrativeDimension = z.infer<typeof NarrativeDimensionSchema>;
export type NewsArticle = z.infer<typeof NewsArticleSchema>;
export type AccessibleTextOrigin = z.infer<typeof AccessibleTextOriginSchema>;
export type QuoteVerification = z.infer<typeof QuoteVerificationSchema>;
export type KeyFinding = z.infer<typeof KeyFindingSchema>;
export type FindingStrength = z.infer<typeof FindingStrengthSchema>;
export type QuotedVoice = z.infer<typeof QuotedVoiceSchema>;
export type KeyActor = z.infer<typeof KeyActorSchema>;
export type ArticleAnalysis = z.infer<typeof ArticleAnalysisSchema>;
export type NarrativeComparison = z.infer<typeof NarrativeComparisonSchema>;
export type Claim = z.infer<typeof ClaimSchema>;
export type ClaimExtraction = z.infer<typeof ClaimExtractionSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type Audit = z.infer<typeof AuditSchema>;
export type EvidenceAudit = z.infer<typeof EvidenceAuditSchema>;
export type ResearchReport = z.infer<typeof ResearchReportSchema>;
export type AnalysisBundle = z.infer<typeof AnalysisBundleSchema>;

export type ApiSuccess<T> = { ok: true; data: T; warnings: string[] };
export type ApiResult<T> = ApiSuccess<T> | ApiErrorResponse;

/** Convert a ZodError into OpenFrame error objects. */
export function zodToOpenFrameErrors(err: z.ZodError): OpenFrameError[] {
  return err.issues.map((i) => ({
    code: i.code === "invalid_type" && i.received === "undefined" ? "MISSING_REQUIRED_FIELD" : "VALIDATION_FAILED",
    message: i.message,
    field: i.path.length ? i.path.join(".") : null,
    recoverable: false,
  }));
}

