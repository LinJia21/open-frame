import { VERBATIM_ORIGINS, type AnalysisBundle, type EvidenceItem, type NewsArticle } from "@/lib/openframe/openframe";
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

/**
 * analysis_generation and analysis_metadata are written here.
 * Values on the incoming object are not trusted.
 */
function textIsCheckable(article: NewsArticle | undefined): article is NewsArticle & { accessible_text: string } {
  return Boolean(
    article?.accessible_text &&
      article.accessible_text_origin &&
      (VERBATIM_ORIGINS as readonly string[]).includes(article.accessible_text_origin) &&
      article.paywalled !== true,
  );
}

function stampEvidenceItem(item: EvidenceItem, article: NewsArticle | undefined): EvidenceItem {
  if (item.quote_verification === "unverifiable") {
    return { ...item, excerpt_is_verbatim: false, excerpt_span: null };
  }
  if (item.quote_verification === "verified_substring" || item.excerpt_is_verbatim) {
    if (item.excerpt && textIsCheckable(article)) {
      const start = article.accessible_text.indexOf(item.excerpt);
      if (start >= 0) {
        return {
          ...item,
          excerpt_is_verbatim: true,
          quote_verification: "verified_substring",
          excerpt_span: { start, end: start + item.excerpt.length },
        };
      }
    }
    if (!textIsCheckable(article)) return { ...item, excerpt_is_verbatim: false, quote_verification: "unverifiable", excerpt_span: null };
    return { ...item, excerpt_is_verbatim: false, quote_verification: "paraphrase", excerpt_span: null };
  }
  return { ...item, excerpt_is_verbatim: false, quote_verification: "paraphrase", excerpt_span: null };
}

/** Spans, quote verification, and unverifiable ids are written before the bundle is validated. */
export function stampRecordedQuotes(bundle: AnalysisBundle): AnalysisBundle {
  const articles = new Map(bundle.articles.map((article) => [article.id, article]));
  return {
    ...bundle,
    narrative_comparison: {
      ...bundle.narrative_comparison,
      article_analyses: bundle.narrative_comparison.article_analyses.map((analysis) => {
        const article = articles.get(analysis.article_id);
        return {
          ...analysis,
          source_selection: {
            ...analysis.source_selection,
            quoted_voices: analysis.source_selection.quoted_voices.map((voice) => {
              if (voice.quote_verification === "unverifiable") return { ...voice, quote_span: null };
              if ((voice.quote_verification === "verified_substring" || voice.quote_mode === "verbatim") && voice.verbatim_quote && textIsCheckable(article)) {
                const start = article.accessible_text.indexOf(voice.verbatim_quote);
                if (start >= 0) {
                  return {
                    ...voice,
                    quote_mode: "verbatim" as const,
                    quote_verification: "verified_substring" as const,
                    quote_span: { start, end: start + voice.verbatim_quote.length },
                  };
                }
              }
              if (voice.quote_verification === "verified_substring" && !textIsCheckable(article)) {
                return { ...voice, quote_verification: "unverifiable" as const, quote_span: null };
              }
              return {
                ...voice,
                quote_mode: "paraphrase" as const,
                verbatim_quote: null,
                paraphrase: voice.paraphrase ?? voice.verbatim_quote,
                quote_verification: "paraphrase" as const,
                quote_span: null,
              };
            }),
          },
        };
      }),
    },
    evidence_audit: {
      ...bundle.evidence_audit,
      audits: bundle.evidence_audit.audits.map((audit) => {
        const supporting_evidence = audit.supporting_evidence.map((item) => stampEvidenceItem(item, articles.get(item.article_id)));
        const contradicting_evidence = audit.contradicting_evidence.map((item) => stampEvidenceItem(item, articles.get(item.article_id)));
        return {
          ...audit,
          supporting_evidence,
          contradicting_evidence,
          unverifiable_evidence_ids: [...supporting_evidence, ...contradicting_evidence]
            .filter((item) => item.quote_verification === "unverifiable")
            .map((item) => item.id),
        };
      }),
    },
  };
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
