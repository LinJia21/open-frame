/**
 * Schema-valid illustration used only by mock tests.
 * It is not a retrieved article and must not be served as a fixture.
 */
export function mockUnretrievedBundle(topic = "Harbor ferries and weekday crowds"): Record<string, unknown> {
  const at = "2026-11-13T04:00:00.000Z";
  const articleId = "art_mockcursor01";
  const groupId = "grp_mockcursor01";
  const claimId = "clm_mockcursor01";
  const auditId = "aud_mockcursor01";
  const findingId = "fnd_mockcursor01";
  const sourceId = "src_mockcursor01";
  const narrativeId = "nar_mockcursor01";
  return {
    schema_version: "1.2.0",
    bundle_id: "bnd_mockcursor01",
    data_mode: "DEMO",
    data_mode_notice: "Illustrative example hosts only.",
    analysis_generation: "PRECOMPUTED",
    generated_at: at,
    articles: [
      {
        schema_version: "1.2.0",
        id: articleId,
        data_mode: "DEMO",
        analysis_role: "analysed",
        title: "Fictional desk note about the topic",
        publisher: {
          name: "Example Desk",
          domain: "desk.example",
          publisher_type: "blog_or_newsletter",
          fictional_demo_publisher: true,
        },
        publication_date: "2026-11-01",
        original_url: "https://desk.example/notes/harbor",
        author: "A. Example",
        summary: "A fictional desk note used to illustrate framing. It was not retrieved from a publisher.",
        accessible_text: "The desk note says the topic is unresolved and gives no checked figures.",
        accessible_text_origin: "generated_demo",
        access_basis: "own_summary_only",
        retrieval_timestamp: at,
        retrieval_method: "generated_demo",
        language: "en",
        content_type: "analysis",
        paywalled: false,
        dedup: {
          duplicate_of: null,
          syndicated_from: null,
          shared_original_sources: [],
          independence_group_id: groupId,
        },
        missing_fields: [],
      },
    ],
    narrative_comparison: {
      schema_version: "1.2.0",
      id: narrativeId,
      data_mode: "DEMO",
      analysis_generation: "PRECOMPUTED",
      topic,
      article_ids: [articleId],
      article_analyses: [
        {
          schema_version: "1.2.0",
          article_id: articleId,
          main_argument: {
            summary: "The fictional note treats the topic as unresolved.",
            key_actors: [],
          },
          causal_attribution: { summary: "No cause is established in the fictional note.", explanations: [] },
          responsibility_attribution: { summary: "No responsibility is assigned.", attributions: [] },
          language_framing: {
            summary: "The wording stays descriptive and does not cite a retrieved article.",
            frames: ["unresolved illustration"],
            notable_terms: [],
            tone_notes: "Neutral illustration.",
          },
          source_selection: {
            summary: "No retrieved source was available.",
            selected_facts: [],
            quoted_voices: [],
            source_mix_note: "Generated illustration only.",
          },
          underrepresented_perspectives: {
            summary: "A single fictional note cannot show missing coverage.",
            items: [],
          },
          article_level_note: "This reading describes the fictional note only.",
        },
      ],
      cross_article_comparison: {
        shared_facts: [],
        divergences: [
          {
            dimension: "main_argument",
            description: "Only one fictional note is present, so no second frame was compared.",
            article_ids: [articleId],
          },
        ],
        framing_differences: "One fictional note cannot show a real difference in framing.",
        voice_distribution: "No retrieved voices are included.",
        coverage_gaps: ["No article was retrieved."],
      },
      outlet_level_observations: [],
      method_notes: "SpectraX did not retrieve articles. The note is an illustration on a reserved host.",
      missing_fields: [],
    },
    claim_extraction: {
      schema_version: "1.2.0",
      id: "cx_mockcursor01",
      data_mode: "DEMO",
      analysis_generation: "PRECOMPUTED",
      topic,
      claims: [
        {
          schema_version: "1.2.0",
          id: claimId,
          data_mode: "DEMO",
          article_id: articleId,
          claim_text: "The fictional note presents the topic as unresolved.",
          is_verbatim: false,
          claim_type: "institutional",
          assertion_kind: "interpretation",
          location: { section: null, paragraph_index: null, context: "Opening line of the fictional note." },
          attributed_to: { name: null, role: null, attribution_kind: "unattributed" },
          check_worthy: true,
          missing_fields: [],
        },
      ],
      missing_fields: [],
    },
    evidence_audit: {
      schema_version: "1.2.0",
      id: "ea_mockcursor01",
      data_mode: "DEMO",
      analysis_generation: "PRECOMPUTED",
      audits: [
        {
          schema_version: "1.2.0",
          id: auditId,
          data_mode: "DEMO",
          claim_id: claimId,
          claim_text: "The fictional note presents the topic as unresolved.",
          status: "Unverified",
          supporting_evidence: [],
          contradicting_evidence: [],
          original_source_url: null,
          explanation: "Nothing was retrieved, so the illustration cannot support or refute the claim.",
          confidence: { level: "low", rationale: "No retrieved document was available to check." },
          confidence_limitations: ["SpectraX did not retrieve or verify a source."],
          additional_research_needed: ["A retrieved primary document would be required before any stronger label."],
          independent_source_count: { supporting: 0, contradicting: 0 },
          unverifiable_evidence_ids: [],
          audited_at: at,
          missing_fields: [],
        },
      ],
      missing_fields: [],
    },
    research_report: {
      schema_version: "1.2.0",
      id: "rpt_mockcursor01",
      analysis_generation: "PRECOMPUTED",
      metadata: {
        topic,
        research_question: topic,
        data_mode: "DEMO",
        generated_at: at,
        version: "1.0.0",
        generator: "mock-test-fixture",
        warnings: [{ code: "DEMO_DATA", message: "Illustrative reserved hosts only. Nothing was retrieved." }],
      },
      executive_summary: {
        text: "This is a generated illustration. It does not report retrieved news.",
        bottom_line: "No checked finding is available.",
        confidence: { level: "low", rationale: "The note was generated for structure, not retrieved." },
        finding_ids: [findingId],
      },
      key_findings: [
        {
          id: findingId,
          statement: "The illustration does not establish a checked fact about the topic.",
          strength: "not_established",
          claim_ids: [claimId],
          audit_ids: [auditId],
          basis_note: "No retrieved evidence was supplied.",
        },
      ],
      topic_background: {
        text: "Background was not retrieved. The date below only marks the fictional note.",
        timeline: [{ date: "2026-11-01", event: "Fictional desk note dated for illustration.", source_ids: [sourceId] }],
      },
      article_comparison: {
        narrative_comparison_id: narrativeId,
        summary: "One fictional note was compared with itself only as a structural example.",
        rows: [
          {
            article_id: articleId,
            publisher: "Example Desk",
            content_type: "analysis",
            main_argument_short: "The topic is left unresolved.",
            primary_frame: "unresolved illustration",
            independence_group_id: groupId,
          },
        ],
      },
      narrative_analysis: {
        text: "The fictional note uses an unresolved frame and cites nobody.",
        key_patterns: ["Single fictional note"],
        dimension_summaries: {
          main_argument: "Unresolved illustration.",
          causal_attribution: "No cause is established.",
          responsibility_attribution: "No actor is held responsible.",
          language_framing: "Descriptive wording only.",
          source_selection: "No retrieved source.",
          underrepresented_perspectives: "Coverage cannot be judged.",
        },
      },
      key_claim_verification: [
        {
          claim_id: claimId,
          audit_id: auditId,
          article_id: articleId,
          claim_text: "The fictional note presents the topic as unresolved.",
          status: "Unverified",
          confidence_level: "low",
          one_line_explanation: "No retrieved source was available.",
        },
      ],
      evidence_limitations: ["No article was retrieved by SpectraX."],
      information_gaps: [
        {
          gap: "Retrieved reporting is absent.",
          why_it_matters: "A framing comparison needs real articles before anyone treats it as evidence.",
          absence_interpretation: "Absence here means the pipeline did not retrieve sources. It is not evidence about the topic.",
        },
      ],
      further_research_questions: ["Which retrieved articles actually discuss this topic?"],
      source_list: [
        {
          id: sourceId,
          article_id: articleId,
          title: "Fictional desk note about the topic",
          publisher: "Example Desk",
          url: "https://desk.example/notes/harbor",
          publication_date: "2026-11-01",
          author: "A. Example",
          data_mode: "DEMO",
          retrieval_method: "generated_demo",
          access_note: "Reserved example host. Not a retrieved citation.",
          used_for: ["article_analysed"],
        },
      ],
      missing_fields: [],
    },
  };
}
