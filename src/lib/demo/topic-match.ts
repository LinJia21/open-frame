export type PreparedTopic = "sample" | "demo";

/** Keywords that route a query to an already generated report. Shared by the home search and the fixture selector. */
const DEMO_KEYWORDS = ["plumvale", "northlight", "harbor trade", "fictional demonstration"];

const SAMPLE_KEYWORDS = [
  "ai-generated animation",
  "ai generated animation",
  "traditional film",
  "critterz",
  "人工智能生成",
  "animación generada",
  "animation générée",
  "animation generee",
];

export const PREPARED_REPORT_HREF: Record<PreparedTopic, string> = {
  sample: "/analysis/bnd_ai_animation_2026/perspectives",
  demo: "/analysis/bnd_demo_ai_animation/perspectives",
};

export function matchPreparedTopic(query: string): PreparedTopic | null {
  const normalized = query.toLowerCase().normalize("NFKC");
  if (DEMO_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "demo";
  if (SAMPLE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return "sample";
  return null;
}
