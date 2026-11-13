import { readFileSync } from "node:fs";
import path from "node:path";
import { AnalysisBundleSchema, type AnalysisBundle } from "@/lib/openframe/openframe";
import { sealPrecomputedBundle } from "@/lib/guards/prompts";
import type { Language } from "@/lib/i18n/languages";

const DATA_DIR = path.join(process.cwd(), "spec", "data");

function readFixture(fileName: string): AnalysisBundle {
  const raw: unknown = JSON.parse(readFileSync(path.join(DATA_DIR, fileName), "utf8"));
  const parsed = AnalysisBundleSchema.parse(raw);
  if (parsed.analysis_generation !== "PRECOMPUTED") {
    throw new Error(`${fileName} is not a precomputed fixture.`);
  }
  return parsed;
}

let sampleCache: AnalysisBundle | null = null;
let demoCache: AnalysisBundle | null = null;

function sampleFixture(): AnalysisBundle {
  sampleCache ??= readFixture("sample-analysis-ai-animation.json");
  return sampleCache;
}

function demoFixture(): AnalysisBundle {
  demoCache ??= readFixture("demo-dataset.json");
  return demoCache;
}

export const preparedTopics = [
  {
    id: "sample",
    title: "Is AI-generated Animation Disrupting the Traditional Film and Television Industry?",
    blurb: "Pre-generated analysis of real articles. Source links are the ones in the fixture.",
  },
  {
    id: "demo",
    title: "Northlight Studios fictional demonstration",
    blurb: "The same question, with fictional outlets on reserved domains.",
  },
] as const;

export function fixtureById(id: string): AnalysisBundle | null {
  if (id === sampleFixture().bundle_id) return structuredClone(sampleFixture());
  if (id === demoFixture().bundle_id) return structuredClone(demoFixture());
  return null;
}

export function buildDemoBundle(query: string, language: Language): AnalysisBundle {
  const kind = selectFixture(query);
  const draft = kind === "sample" ? structuredClone(sampleFixture()) : kind === "demo" ? structuredClone(demoFixture()) : buildGeneric(query);
  draft.bundle_id = `bnd_${crypto.randomUUID()}`;
  draft.research_report.metadata.research_question = query;
  if (language !== "en") {
    const note = ` Interface language: ${language}. Fixture text is English.`;
    draft.data_mode_notice = `${draft.data_mode_notice ?? ""}${note}`;
  }
  const sealed = sealPrecomputedBundle(draft, new Date().toISOString());
  return AnalysisBundleSchema.parse(sealed);
}

function selectFixture(query: string): "sample" | "demo" | "generic" {
  const normalized = query.toLowerCase().normalize("NFKC");
  if (normalized.includes("northlight") || normalized.includes("harbor trade") || normalized.includes("fictional demonstration")) {
    return "demo";
  }
  if (
    normalized.includes("ai-generated animation") ||
    normalized.includes("ai generated animation") ||
    normalized.includes("traditional film") ||
    normalized.includes("critterz") ||
    normalized.includes("人工智能生成") ||
    normalized.includes("animación generada") ||
    normalized.includes("animation générée") ||
    normalized.includes("animation generee")
  ) {
    return "sample";
  }
  return "generic";
}

/** Unmatched topics reuse the fictional fixture and say so. The official file is not edited. */
function buildGeneric(query: string): AnalysisBundle {
  const draft = structuredClone(demoFixture());
  const safe = query.replace(/\s+/g, " ").trim().slice(0, 180);
  const topic = "Demonstration template (not an analysis of your topic)";
  draft.narrative_comparison.topic = topic;
  draft.claim_extraction.topic = topic;
  draft.research_report.metadata.topic = topic;
  draft.research_report.metadata.research_question = safe;
  draft.data_mode_notice = `DEMO SOURCE · PRE-GENERATED ANALYSIS — no prepared briefing matched “${safe}”. The articles below are the fictional demonstration set. They are not reporting about that topic.`;
  draft.research_report.executive_summary.text = `${draft.data_mode_notice} ${draft.research_report.executive_summary.text}`;
  const warnings = draft.research_report.metadata.warnings.filter((warning) => warning.code !== "DEMO_DATA");
  draft.research_report.metadata.warnings = [
    { code: "DEMO_DATA", message: draft.data_mode_notice },
    ...warnings,
  ];
  return draft;
}

export function adapterFixtures(): Array<{ name: string; bundle: AnalysisBundle }> {
  return [
    { name: "official-sample", bundle: structuredClone(sampleFixture()) },
    { name: "official-demo", bundle: structuredClone(demoFixture()) },
    { name: "generic-fallback", bundle: buildDemoBundle("quantum bananas on mars", "en") },
    { name: "stamped-sample", bundle: buildDemoBundle(preparedTopics[0].title, "en") },
  ];
}
