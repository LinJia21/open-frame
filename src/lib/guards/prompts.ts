import { VERBATIM_ORIGINS, type AnalysisBundle } from "@/lib/openframe/openframe";
import { buildStagePrompt, type PipelineStage, type PromptVariable } from "@/lib/openframe/prompts";

/**
 * The 1.2.0 fillTemplate inserts values in one pass, so braces in a topic are literal.
 * This wrapper only forwards to that builder.
 */
export function buildSafeStagePrompt(
  stage: PipelineStage,
  vars: Partial<Record<PromptVariable, string>>,
): { system: string; user: string } {
  return buildStagePrompt(stage, vars);
}

const SERVER_META = {
  model_name: null,
  prompt_template_id: null,
  prompt_version: null,
} as const;

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRecord) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

type VerbatimSource = { kind: "text"; text: string } | { kind: "summary" } | { kind: "none" };

/**
 * Where a verbatim quote may come from. A saved summary is our own paraphrase,
 * not the publisher's words (spec §13), so it is never quoted verbatim.
 */
function verbatimSource(source: unknown): VerbatimSource {
  const record = asRecord(source);
  if (!record) return { kind: "none" };
  const text = record.accessible_text;
  const origin = record.accessible_text_origin;
  if (typeof text !== "string" || text.length === 0) return { kind: "none" };
  if (typeof origin !== "string" || !(VERBATIM_ORIGINS as readonly string[]).includes(origin)) return { kind: "none" };
  if (record.paywalled === true) return { kind: "none" };
  if (record.access_basis === "publisher_summary") return { kind: "summary" };
  return { kind: "text", text };
}

function spanIn(text: string, quote: string): { start: number; end: number } | null {
  const start = text.indexOf(quote);
  return start >= 0 ? { start, end: start + quote.length } : null;
}

function stampEvidenceItem(value: unknown, articles: Map<string, RawRecord>): unknown {
  const item = asRecord(value);
  if (!item) return value;
  const source = verbatimSource(typeof item.article_id === "string" ? articles.get(item.article_id) : undefined);
  const excerpt = typeof item.excerpt === "string" && item.excerpt ? item.excerpt : null;
  const wantsVerbatim = item.quote_verification === "verified_substring" || item.excerpt_is_verbatim === true;
  if (wantsVerbatim) {
    const span = source.kind === "text" && excerpt ? spanIn(source.text, excerpt) : null;
    if (span) return { ...item, excerpt_is_verbatim: true, quote_verification: "verified_substring", excerpt_span: span };
    if (source.kind === "none" && excerpt) return { ...item, excerpt_is_verbatim: false, quote_verification: "unverifiable", excerpt_span: null };
    return { ...item, excerpt_is_verbatim: false, quote_verification: "paraphrase", excerpt_span: null };
  }
  if (item.quote_verification === "unverifiable" && excerpt) {
    return { ...item, excerpt_is_verbatim: false, quote_verification: "unverifiable", excerpt_span: null };
  }
  return { ...item, excerpt_is_verbatim: false, quote_verification: "paraphrase", excerpt_span: null };
}

function stampVoice(value: unknown, article: RawRecord | undefined): unknown {
  const voice = asRecord(value);
  if (!voice) return value;
  const source = verbatimSource(article);
  const verbatim = typeof voice.verbatim_quote === "string" && voice.verbatim_quote ? voice.verbatim_quote : null;
  const claimsVerbatim = voice.quote_mode === "verbatim" || voice.quote_verification === "verified_substring";
  if (claimsVerbatim && verbatim) {
    const span = source.kind === "text" ? spanIn(source.text, verbatim) : null;
    if (span) return { ...voice, quote_mode: "verbatim", quote_verification: "verified_substring", quote_span: span };
    if (source.kind === "none") return { ...voice, quote_mode: "verbatim", quote_verification: "unverifiable", quote_span: null };
    return paraphraseVoice(voice, verbatim);
  }
  if (voice.quote_verification === "unverifiable" && verbatim) {
    return { ...voice, quote_mode: "verbatim", quote_verification: "unverifiable", quote_span: null };
  }
  return paraphraseVoice(voice, verbatim);
}

function paraphraseVoice(voice: RawRecord, verbatim: string | null): RawRecord {
  const paraphrase = typeof voice.paraphrase === "string" && voice.paraphrase ? voice.paraphrase : verbatim;
  return {
    ...voice,
    quote_mode: "paraphrase",
    verbatim_quote: null,
    paraphrase: paraphrase ?? null,
    quote_verification: "paraphrase",
    quote_span: null,
  };
}

function stampNarrative(narrative: RawRecord, articles: Map<string, RawRecord>): RawRecord {
  return {
    ...narrative,
    article_analyses: asArray(narrative.article_analyses).map((value) => {
      const analysis = asRecord(value);
      const source = asRecord(analysis?.source_selection);
      if (!analysis || !source) return value;
      const article = typeof analysis.article_id === "string" ? articles.get(analysis.article_id) : undefined;
      return {
        ...analysis,
        source_selection: {
          ...source,
          quoted_voices: asArray(source.quoted_voices).map((voice) => stampVoice(voice, article)),
        },
      };
    }),
  };
}

function distinctGroups(items: unknown[]): number {
  const groups = new Set<string>();
  for (const value of items) {
    const item = asRecord(value);
    if (item && typeof item.independence_group_id === "string") groups.add(item.independence_group_id);
  }
  return groups.size;
}

function stampAuditPart(evidence: RawRecord, articles: Map<string, RawRecord>): RawRecord {
  return {
    ...evidence,
    audits: asArray(evidence.audits).map((value) => {
      const audit = asRecord(value);
      if (!audit) return value;
      const supporting = asArray(audit.supporting_evidence).map((item) => stampEvidenceItem(item, articles));
      const contradicting = asArray(audit.contradicting_evidence).map((item) => stampEvidenceItem(item, articles));
      const unverifiableIds = [...supporting, ...contradicting]
        .map((item) => asRecord(item))
        .filter((item): item is RawRecord => item !== null && item.quote_verification === "unverifiable")
        .map((item) => item.id)
        .filter((id): id is string => typeof id === "string");
      const independent_source_count = {
        supporting: distinctGroups(supporting),
        contradicting: distinctGroups(contradicting),
      };
      return { ...audit, supporting_evidence: supporting, contradicting_evidence: contradicting, unverifiable_evidence_ids: unverifiableIds, independent_source_count };
    }),
  };
}

/**
 * Compute quote spans, quote verification and unverifiable ids server-side.
 * Works on unvalidated model JSON so the live path never trusts model-computed
 * indices; text that cannot be found is downgraded, never silently kept.
 */
export function stampRawQuotes<T>(raw: T): T {
  const root = asRecord(raw);
  if (!root) return raw;
  const articles = new Map<string, RawRecord>();
  for (const value of asArray(root.articles)) {
    const article = asRecord(value);
    if (article && typeof article.id === "string") articles.set(article.id, article);
  }
  const narrative = asRecord(root.narrative_comparison);
  const evidence = asRecord(root.evidence_audit);
  const next: RawRecord = { ...root };
  if (narrative) next.narrative_comparison = stampNarrative(narrative, articles);
  if (evidence) next.evidence_audit = stampAuditPart(evidence, articles);
  return next as T;
}

/** Spans, quote verification, and unverifiable ids are written before the bundle is validated. */
export function stampRecordedQuotes(bundle: AnalysisBundle): AnalysisBundle {
  return stampRawQuotes(bundle);
}

export function sealPrecomputedBundle(bundle: AnalysisBundle, generatedAt: string): AnalysisBundle {
  const stamped = stampRecordedQuotes(bundle);
  const metadata = { generated_at: generatedAt, ...SERVER_META };
  const seal = <T extends { analysis_generation: AnalysisBundle["analysis_generation"]; analysis_metadata?: AnalysisBundle["analysis_metadata"] }>(part: T): T => ({
    ...part,
    analysis_generation: "PRECOMPUTED",
    analysis_metadata: metadata,
  });
  return {
    ...stamped,
    analysis_generation: "PRECOMPUTED",
    analysis_metadata: metadata,
    narrative_comparison: seal(stamped.narrative_comparison),
    claim_extraction: seal(stamped.claim_extraction),
    evidence_audit: seal(stamped.evidence_audit),
    research_report: seal(stamped.research_report),
  };
}
