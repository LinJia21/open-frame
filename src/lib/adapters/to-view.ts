import {
  NARRATIVE_DIMENSION_LABELS,
  VERBATIM_ORIGINS,
  traceFinding,
  type AnalysisBundle,
  type EvidenceItem,
  type NarrativeDimension,
  type NewsArticle,
  type QuoteVerification,
  type VerificationStatus,
} from "@/lib/openframe/openframe";
import { languageFromTag, type Language } from "@/lib/i18n/languages";
import { badgesFromFields, isStanceLabel, reportAuditIssues, statusForReportRow, verbatimIsInSource, visibleFrame } from "@/lib/guards/integrity";
import { UnsupportedSchemaVersionError } from "@/lib/adapters/schema-version";

const DIMENSIONS = Object.keys(NARRATIVE_DIMENSION_LABELS) as NarrativeDimension[];
const GENERIC_TOPIC = "openframe-generic";

export interface DimensionView {
  key: NarrativeDimension;
  label: string;
  summary: string;
  details: string[];
}

export interface ArticleView {
  id: string;
  role: "analysed" | "evidence_only";
  title: string;
  publisher: string;
  fictional: boolean;
  publisherType: string;
  date: string | null;
  author: string | null;
  summary: string;
  url: string;
  contentType: string;
  sourceLabel: string;
  sourceMode: string;
  accessLabel: string;
  accessChips: string[];
  textOrigin: string | null;
  dimensions: DimensionView[];
  articleOnlyNote: string | null;
}

export interface TraceClaimView {
  claimId: string;
  auditId: string | null;
  articleId: string;
  text: string;
  status: VerificationStatus | null;
  confidence: string | null;
  evidence: EvidenceView[];
}

/** A report statement and the claim ids the record actually stores. */
export interface FindingView {
  id: string;
  heading: string;
  text: string;
  strength: string | null;
  /** Null when this record stores no claim id for the statement. */
  claimIds: string[] | null;
  articleIds: string[];
  claims: TraceClaimView[];
}

export interface AuditView {
  id: string;
  claimId: string;
  articleId: string;
  claimText: string;
  status: VerificationStatus;
  explanation: string;
  confidenceLevel: string;
  confidenceRationale: string;
  limitations: string[];
  supporting: EvidenceView[];
  contradicting: EvidenceView[];
  unverifiable: EvidenceView[];
  independentSupporting: number;
  independentContradicting: number;
}

export interface EvidenceView {
  id: string;
  claimId: string;
  articleId: string;
  publisher: string;
  fictional: boolean;
  url: string | null;
  date: string | null;
  excerpt: string | null;
  asQuotation: boolean;
  quoteVerification: QuoteVerification;
  countsTowardVerified: boolean;
  accessLabel: string;
  accessChips: string[];
  textOrigin: string | null;
  /** Set only when the excerpt matches the stored article text. Never "verbatim verified". */
  matchLabel: string | null;
  span: { start: number; end: number } | null;
  summary: string;
  kind: string;
  groupId: string;
}

export interface BriefingView {
  bundleId: string;
  schemaVersion: string;
  subject: string;
  query: string;
  language: Language;
  createdAt: string;
  generatedAt: string;
  generic: boolean;
  demo: boolean;
  notice: string;
  masthead: string;
  integrityIssues: string[];
  sourceLabel: string;
  sourceMode: string;
  analysisLabel: string;
  analysisGeneratedAt: string | null;
  generation: "PRECOMPUTED" | "LIVE_AI";
  /** Present only for request-time analysis. Hidden for pre-generated fixtures. */
  modelName: string | null;
  articles: ArticleView[];
  analysed: ArticleView[];
  comparisonSummary: string;
  shared: Array<{ fact: string; note: string }>;
  divergences: Array<{ dimension: string; description: string }>;
  voices: string;
  gaps: string[];
  audits: AuditView[];
  limitations: string[];
  report: {
    summary: string;
    bottomLine: string;
    bottomLineFindingIds: string[];
    bottomLineClaimIds: string[] | null;
    background: string;
    timeline: Array<{ date: string | null; event: string; sourceIds: string[] }>;
    comparisonSummary: string;
    rows: Array<{ publisher: string; fictional: boolean; argument: string; frame: string; articleId: string }>;
    narrative: string;
    patterns: string[];
    dimensionSummaries: Array<{ label: string; text: string }>;
    claims: Array<{ claimId: string; auditId: string; articleId: string; text: string; status: VerificationStatus | null; statusWithheld: string | null; confidence: string; explanation: string }>;
    gaps: Array<{ gap: string; why: string; absence: string }>;
    questions: string[];
    findings: FindingView[];
    unlinked: FindingView[];
    sources: Array<{ id: string; title: string; publisher: string; fictional: boolean; url: string; date: string | null; usedFor: string[] }>;
    methodology: string;
    warnings: Array<{ code: string; message: string }>;
  };
}

/** Access-restriction chips. Origin is shown separately. */
export function accessChipsFor(article: NewsArticle | undefined): string[] {
  if (!article) return [];
  const chips: string[] = [];
  if (article.paywalled === true) chips.push("Paywalled");
  if (article.accessible_text_origin === "search_snippet" || article.retrieval_method === "web_search_snippet") chips.push("Snippet only");
  return chips;
}

export function accessLabelFor(article: NewsArticle | undefined): string {
  const chips = accessChipsFor(article);
  return chips.length > 0 ? chips.join(" · ") : "No access restriction";
}

function canQuote(article: NewsArticle | undefined): boolean {
  if (!article?.accessible_text) return false;
  if (article.paywalled === true) return false;
  if (!article.accessible_text_origin) return false;
  return (VERBATIM_ORIGINS as readonly string[]).includes(article.accessible_text_origin);
}

function toEvidence(item: EvidenceItem, articlesById: Map<string, NewsArticle>): EvidenceView {
  const article = articlesById.get(item.article_id);
  const passesGuard = item.quote_verification === "verified_substring" && canQuote(article) && verbatimIsInSource(item.excerpt, article?.accessible_text);
  const verification: QuoteVerification = passesGuard
    ? "verified_substring"
    : item.quote_verification === "unverifiable"
      ? "unverifiable"
      : "paraphrase";
  return {
    id: item.id,
    claimId: item.claim_id,
    articleId: item.article_id,
    publisher: article?.publisher.name ?? item.publisher,
    fictional: article?.publisher.fictional_demo_publisher === true,
    url: article?.original_url ?? item.url,
    date: item.publication_date,
    excerpt: item.excerpt,
    asQuotation: passesGuard,
    quoteVerification: verification,
    countsTowardVerified: passesGuard,
    accessLabel: accessLabelFor(article),
    accessChips: accessChipsFor(article),
    textOrigin: article?.accessible_text_origin ?? null,
    matchLabel: passesGuard ? "Matches stored excerpt" : null,
    span: passesGuard && item.excerpt_span ? { start: item.excerpt_span.start, end: item.excerpt_span.end } : null,
    summary: item.summary,
    kind: item.evidence_kind,
    groupId: item.independence_group_id,
  };
}

function mastheadFor(bundle: AnalysisBundle): string {
  if (bundle.analysis_generation === "LIVE_AI" && bundle.data_mode === "DEMO") {
    return "Generated analysis. OpenFrame did not retrieve or verify these sources. Example links are illustrations, not citations.";
  }
  if (bundle.analysis_generation === "LIVE_AI") {
    return "Analysis of saved historical materials. Not a live internet search and not an external fact check. Citations are limited to the materials selected for this run.";
  }
  if (bundle.data_mode === "DEMO") return "Fictional sources. Pre-generated analysis. Not real news and not a live web search.";
  if (bundle.data_mode === "MIXED") return "Mixed sources. Pre-generated analysis. Not a live web search.";
  return "Real sources. Pre-generated analysis. Not a live web search.";
}

function toBriefingViewV120(bundle: AnalysisBundle): BriefingView {
  const articlesById = new Map(bundle.articles.map((article) => [article.id, article]));
  const issues = [
    ...reportAuditIssues(bundle),
    ...verbatimIssues(bundle, articlesById),
    ...stanceIssues(bundle),
  ];
  if (issues.length > 0) {
    console.warn(issues.map((issue) => `${issue.code} ${issue.field}: ${issue.message}`).join("\n"));
  }
  const badge = badgesFromFields({
    dataMode: bundle.data_mode,
    analysisGeneration: bundle.analysis_generation,
    generatedAt: bundle.analysis_metadata?.generated_at ?? bundle.generated_at,
    notice: bundle.data_mode_notice,
  });
  const analyses = new Map(bundle.narrative_comparison.article_analyses.map((analysis) => [analysis.article_id, analysis]));
  const articles: ArticleView[] = bundle.articles.map((article) => {
    const analysis = analyses.get(article.id);
    return {
      id: article.id,
      role: article.analysis_role,
      title: article.title,
      publisher: article.publisher.name,
      fictional: article.publisher.fictional_demo_publisher === true,
      publisherType: article.publisher.publisher_type,
      date: article.publication_date,
      author: article.author,
      summary: article.summary,
      url: article.original_url,
      contentType: article.content_type,
      sourceLabel: badge.sourceLabel,
      sourceMode: article.data_mode,
      accessLabel: accessLabelFor(article),
      accessChips: accessChipsFor(article),
      textOrigin: article.accessible_text_origin,
      dimensions: analysis
        ? DIMENSIONS.map((key) => ({
            key,
            label: NARRATIVE_DIMENSION_LABELS[key],
            summary: visibleFrame(analysis[key].summary) ?? "Hidden",
            details: dimensionDetails(key, analysis, article),
          }))
        : [],
      articleOnlyNote: analysis?.article_level_note ?? null,
    };
  });
  const comparison = bundle.narrative_comparison.cross_article_comparison;
  const findings = bundle.research_report.key_findings.map((finding) => findingFromTrace(bundle, finding.id, finding.statement, finding.strength));
  const bottomIds = bundle.research_report.executive_summary.finding_ids;
  const bottomClaims = bottomIds.flatMap((id) => findings.find((finding) => finding.id === id)?.claims ?? []);
  const bottomClaimIds = [...new Set(bottomClaims.map((claim) => claim.claimId))];
  return {
    bundleId: bundle.bundle_id,
    schemaVersion: bundle.schema_version,
    subject: bundle.research_report.metadata.topic,
    query: bundle.research_report.metadata.research_question,
    language: languageFromTag(bundle.articles[0]?.language ?? "en"),
    createdAt: bundle.generated_at,
    generatedAt: bundle.analysis_metadata?.generated_at ?? bundle.generated_at,
    generic: bundle.articles.some((article) => article.topics?.includes(GENERIC_TOPIC)),
    demo: bundle.data_mode === "DEMO",
    notice: badge.notice,
    masthead: mastheadFor(bundle),
    integrityIssues: [...issues.map((issue) => issue.message), ...badge.issues.map((issue) => issue.message)],
    sourceLabel: badge.sourceLabel,
    sourceMode: bundle.data_mode,
    analysisLabel: badge.analysisLabel ?? "",
    analysisGeneratedAt: badge.analysisLabel ? (bundle.analysis_metadata?.generated_at ?? bundle.generated_at) : null,
    generation: bundle.analysis_generation,
    modelName: bundle.analysis_generation === "LIVE_AI" ? (bundle.analysis_metadata?.model_name ?? null) : null,
    articles,
    analysed: articles.filter((article) => article.role === "analysed"),
    comparisonSummary: comparison.framing_differences,
    shared: comparison.shared_facts.map((fact) => ({ fact: fact.fact, note: fact.independence_note })),
    divergences: comparison.divergences.map((item) => ({
      dimension: NARRATIVE_DIMENSION_LABELS[item.dimension],
      description: item.description,
    })),
    voices: comparison.voice_distribution,
    gaps: comparison.coverage_gaps,
    audits: bundle.evidence_audit.audits.map((audit) => {
      const supporting = audit.supporting_evidence.map((item) => toEvidence(item, articlesById));
      const contradicting = audit.contradicting_evidence.map((item) => toEvidence(item, articlesById));
      const flagged = new Set(audit.unverifiable_evidence_ids);
      const withheld = (item: EvidenceView) => flagged.has(item.id) || item.quoteVerification === "unverifiable";
      return {
        id: audit.id,
        claimId: audit.claim_id,
        articleId: bundle.claim_extraction.claims.find((claim) => claim.id === audit.claim_id)?.article_id ?? "",
        claimText: audit.claim_text,
        status: audit.status,
        explanation: audit.explanation,
        confidenceLevel: audit.confidence.level,
        confidenceRationale: audit.confidence.rationale,
        limitations: audit.confidence_limitations,
        supporting: supporting.filter((item) => !withheld(item)),
        contradicting: contradicting.filter((item) => !withheld(item)),
        unverifiable: [...supporting, ...contradicting].filter(withheld),
        independentSupporting: audit.independent_source_count.supporting,
        independentContradicting: audit.independent_source_count.contradicting,
      };
    }),
    limitations: bundle.research_report.evidence_limitations,
    report: {
      summary: bundle.research_report.executive_summary.text,
      bottomLine: bundle.research_report.executive_summary.bottom_line,
      bottomLineFindingIds: bottomIds,
      bottomLineClaimIds: bottomClaimIds.length > 0 ? bottomClaimIds : null,
      background: bundle.research_report.topic_background.text,
      timeline: bundle.research_report.topic_background.timeline.map((item) => ({
        date: item.date,
        event: item.event,
        sourceIds: item.source_ids,
      })),
      comparisonSummary: bundle.research_report.article_comparison.summary,
      rows: bundle.research_report.article_comparison.rows.map((row) => ({
        publisher: row.publisher,
        fictional: articlesById.get(row.article_id)?.publisher.fictional_demo_publisher === true,
        argument: row.main_argument_short,
        frame: visibleFrame(row.primary_frame) ?? "Hidden",
        articleId: row.article_id,
      })),
      narrative: bundle.research_report.narrative_analysis.text,
      patterns: bundle.research_report.narrative_analysis.key_patterns,
      dimensionSummaries: DIMENSIONS.map((key) => ({
        label: NARRATIVE_DIMENSION_LABELS[key],
        text: bundle.research_report.narrative_analysis.dimension_summaries[key],
      })),
      claims: bundle.research_report.key_claim_verification.map((item) => {
        const shown = statusForReportRow(bundle, item.audit_id, item.status);
        const audit = bundle.evidence_audit.audits.find((entry) => entry.id === item.audit_id);
        return {
          claimId: item.claim_id,
          auditId: item.audit_id,
          articleId: item.article_id,
          text: item.claim_text,
          status: shown.status,
          statusWithheld: shown.withheld,
          confidence: audit?.confidence.level ?? "",
          explanation: item.one_line_explanation,
        };
      }),
      gaps: bundle.research_report.information_gaps.map((gap) => ({
        gap: gap.gap,
        why: gap.why_it_matters,
        absence: gap.absence_interpretation,
      })),
      questions: bundle.research_report.further_research_questions,
      findings,
      unlinked: [
        ...bundle.research_report.narrative_analysis.key_patterns.map((text) => unlinked("Pattern", text)),
        ...DIMENSIONS.map((key) => unlinked(NARRATIVE_DIMENSION_LABELS[key], bundle.research_report.narrative_analysis.dimension_summaries[key])),
        ...bundle.research_report.information_gaps.map((gap) => unlinked("Information gap", gap.gap)),
        ...bundle.research_report.further_research_questions.map((text) => unlinked("Further question", text)),
        ...bundle.research_report.article_comparison.rows.map((row) => ({
          id: row.article_id,
          heading: "Article comparison",
          text: row.main_argument_short,
          strength: null,
          claimIds: null,
          articleIds: articlesById.has(row.article_id) ? [row.article_id] : [],
          claims: [],
        })),
      ],
      sources: bundle.research_report.source_list.map((source) => ({
        id: source.id,
        title: source.title,
        publisher: source.publisher,
        fictional: articlesById.get(source.article_id)?.publisher.fictional_demo_publisher === true,
        url: source.url,
        date: source.publication_date,
        usedFor: source.used_for,
      })),
      methodology: bundle.narrative_comparison.method_notes,
      warnings: bundle.research_report.metadata.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
      })),
    },
  };
}

function unlinked(heading: string, text: string): FindingView {
  return { id: heading, heading, text, strength: null, claimIds: null, articleIds: [], claims: [] };
}

function findingFromTrace(bundle: AnalysisBundle, id: string, text: string, strength: string): FindingView {
  const trace = traceFinding(bundle, id);
  const claims: TraceClaimView[] = (trace?.claims ?? []).map((entry) => ({
    claimId: entry.claim.id,
    auditId: entry.audit?.id ?? null,
    articleId: entry.claim.article_id,
    text: entry.claim.claim_text,
    status: entry.audit?.status ?? null,
    confidence: entry.audit?.confidence.level ?? null,
    evidence: entry.evidence.map((item) => toEvidence(item.evidence, new Map(bundle.articles.map((article) => [article.id, article])))),
  }));
  return {
    id,
    heading: "Finding",
    text,
    strength,
    claimIds: claims.length > 0 ? claims.map((claim) => claim.claimId) : null,
    articleIds: [...new Set(claims.map((claim) => claim.articleId))],
    claims,
  };
}

function verbatimIssues(bundle: AnalysisBundle, articlesById: Map<string, NewsArticle>) {
  const issues: Array<{ code: "VERBATIM_NOT_IN_SOURCE"; message: string; field: string }> = [];
  for (const audit of bundle.evidence_audit.audits) {
    for (const item of [...audit.supporting_evidence, ...audit.contradicting_evidence]) {
      if (item.quote_verification !== "verified_substring") continue;
      const article = articlesById.get(item.article_id);
      if (!canQuote(article) || !verbatimIsInSource(item.excerpt, article?.accessible_text)) {
        issues.push({
          code: "VERBATIM_NOT_IN_SOURCE",
          field: item.id,
          message: `${item.id} is marked verified_substring but failed the substring check. It is shown as a paraphrase and does not count as confirming evidence.`,
        });
      }
    }
  }
  return issues;
}

function stanceIssues(bundle: AnalysisBundle) {
  const issues: Array<{ code: "STANCE_LABEL"; message: string; field: string }> = [];
  bundle.narrative_comparison.article_analyses.forEach((analysis) => {
    analysis.language_framing.frames.forEach((frame, index) => {
      if (isStanceLabel(frame)) {
        issues.push({
          code: "STANCE_LABEL",
          field: `${analysis.article_id}.language_framing.frames.${index}`,
          message: `A frame on ${analysis.article_id} matched the stance-term list and was hidden.`,
        });
      }
    });
  });
  return issues;
}

function dimensionDetails(
  key: NarrativeDimension,
  analysis: AnalysisBundle["narrative_comparison"]["article_analyses"][number],
  article: NewsArticle,
): string[] {
  if (key === "main_argument") {
    return analysis.main_argument.key_actors.map((actor) => `${actor.name} — ${actor.role_in_article}`);
  }
  if (key === "causal_attribution") {
    return analysis.causal_attribution.explanations.map(
      (item) => `${item.cause} → ${item.effect} (${item.asserted_by}; ${item.evidence_offered_in_article})`,
    );
  }
  if (key === "responsibility_attribution") {
    return analysis.responsibility_attribution.attributions.map(
      (item) => `${item.actor}: ${item.responsible_for} (${item.attributed_by})`,
    );
  }
  if (key === "language_framing") {
    return [
      ...analysis.language_framing.frames.flatMap((frame) => {
        const visible = visibleFrame(frame);
        return visible ? [visible] : [];
      }),
      ...analysis.language_framing.notable_terms.flatMap((term) => {
        if (isStanceLabel(term.term) || isStanceLabel(term.usage_note)) return [];
        return [`${term.term}: ${term.usage_note}`];
      }),
      analysis.language_framing.tone_notes && !isStanceLabel(analysis.language_framing.tone_notes)
        ? `Tone: ${analysis.language_framing.tone_notes}`
        : "",
    ].filter(Boolean);
  }
  if (key === "source_selection") {
    return [
      ...analysis.source_selection.selected_facts.map((fact) => fact.fact),
      ...analysis.source_selection.quoted_voices.map((voice) => voiceLine(voice, article)),
      analysis.source_selection.source_mix_note ?? "",
    ].filter(Boolean);
  }
  return analysis.underrepresented_perspectives.items.map((item) => `${item.perspective}: ${item.note}`);
}

function voiceLine(
  voice: AnalysisBundle["narrative_comparison"]["article_analyses"][number]["source_selection"]["quoted_voices"][number],
  article: NewsArticle,
): string {
  if (voice.quote_verification === "verified_substring" && canQuote(article) && verbatimIsInSource(voice.verbatim_quote, article.accessible_text)) {
    const span = voice.quote_span ? ` characters ${voice.quote_span.start}–${voice.quote_span.end}` : "";
    return `${voice.speaker}: “${voice.verbatim_quote}” (Matches stored excerpt${span})`;
  }
  if (voice.quote_verification === "unverifiable") {
    return `${voice.speaker}: ${voice.verbatim_quote ?? voice.paraphrase ?? ""} (Quote not checkable)`;
  }
  return `${voice.speaker}: ${voice.paraphrase ?? voice.verbatim_quote ?? ""} (paraphrase)`;
}

/** Pick the adapter for schema_version. 1.1.0 is not mapped; the page explains that. */
export function toBriefingView(bundle: AnalysisBundle): BriefingView {
  const version: string = bundle.schema_version;
  switch (version) {
    case "1.2.0":
      return toBriefingViewV120(bundle);
    default:
      throw new UnsupportedSchemaVersionError(version);
  }
}

export function toSummary(bundle: AnalysisBundle) {
  const view = toBriefingView(bundle);
  return {
    bundleId: view.bundleId,
    subject: view.subject,
    query: view.query,
    createdAt: view.createdAt,
    generatedAt: view.generatedAt,
    generic: view.generic,
    language: view.language,
    demo: view.demo,
    sourceLabel: view.sourceLabel,
    dataMode: view.sourceMode,
  };
}
