/**
 * Offline token estimate for the primary demo topic.
 * Tokenizer: js-tiktoken o200k_base (approximation; not a model provider tokenizer).
 * No network calls.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getEncoding } from "js-tiktoken";
import { MAX_RETRIES, STAGE_SIZE_ESTIMATES, type PipelineStage } from "../src/lib/openframe/prompts";
import { buildSafeStagePrompt } from "../src/lib/guards/prompts";
import { AnalysisBundleSchema } from "../src/lib/openframe/openframe";

const encoding = getEncoding("o200k_base");
const count = (text: string) => encoding.encode(text).length;
const bundle = AnalysisBundleSchema.parse(
  JSON.parse(readFileSync(join(process.cwd(), "spec", "data", "sample-analysis-ai-animation.json"), "utf8")),
);
const analysed = bundle.articles.filter((article) => article.analysis_role === "analysed");
const schema = (name: string) => readFileSync(join(process.cwd(), "spec", "schemas", name), "utf8");
const common = schema("common.schema.json");
const stages: PipelineStage[] = ["narrative_analysis", "claim_extraction", "evidence_audit", "report"];
const schemaFile: Record<PipelineStage, string> = {
  narrative_analysis: "narrative-comparison.schema.json",
  claim_extraction: "claim-extraction.schema.json",
  evidence_audit: "evidence-audit.schema.json",
  report: "research-report.schema.json",
};
const shared = {
  topic: bundle.research_report.metadata.topic,
  schema_version: bundle.schema_version,
  data_mode: bundle.data_mode,
  generated_at: bundle.generated_at,
  articles_json: JSON.stringify(analysed),
  allowed_article_ids: bundle.articles.map((article) => article.id).join(", "),
  claims_json: JSON.stringify(bundle.claim_extraction.claims),
  evidence_documents_json: JSON.stringify(bundle.articles),
  narrative_json: JSON.stringify(bundle.narrative_comparison),
  claim_extraction_json: JSON.stringify(bundle.claim_extraction),
  evidence_audit_json: JSON.stringify(bundle.evidence_audit),
  id_namespace: "ai_anim_2026",
};

let total = 0;
const lines = [
  "OpenFrame token estimate",
  `topic: ${shared.topic}`,
  "tokenizer: js-tiktoken o200k_base",
  "input: spec/data/sample-analysis-ai-animation.json",
  "",
];
for (const stage of stages) {
  const prompt = buildSafeStagePrompt(stage, { ...shared, json_schema: `${schema(schemaFile[stage])}\n${common}` });
  const input = count(prompt.system) + count(prompt.user);
  total += input;
  const estimate = STAGE_SIZE_ESTIMATES[stage];
  lines.push(
    [
      stage,
      `measured_input_tokens=${input}`,
      `analyst_approx_input_tokens=${estimate.approx_input_tokens}`,
      `analyst_approx_output_tokens=${estimate.approx_output_tokens}`,
      `analyst_recommended_max_tokens=${estimate.recommended_max_tokens}`,
    ].join("\t"),
  );
}
lines.push(
  "",
  `measured_total_input_tokens=${total}`,
  `stages=${stages.length}`,
  `max_retries_per_stage=${MAX_RETRIES}`,
  `api_calls_if_every_stage_succeeds=${stages.length}`,
  `api_calls_if_every_stage_uses_both_retries=${stages.length * (1 + MAX_RETRIES)}`,
  "No network call was made.",
);
process.stdout.write(`${lines.join("\n")}\n`);
