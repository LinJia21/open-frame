import { fixtureById } from "@/lib/demo/catalog";
import { LAYOUT_STORY_ID, LAYOUT_TITLE } from "@/lib/home/stories";
import type { AnalysisBundle } from "@/lib/openframe/openframe";

/**
 * Homepage cards. Heat is absent on purpose: no fixture records a heat number.
 * Status counts stay available for the settings page and are not a verdict.
 */
export interface HomeEventCard {
  bundleId: string | null;
  perspectivesHref: string | null;
  evidenceHref: string | null;
  title: string;
  sourceName: string | null;
  sourceDate: string | null;
  sampleKind: "saved-fixture-links" | "fictional-demo" | "layout-sample";
  storyHref: string;
  generatedAt: string | null;
  articleCount: number | null;
  outletCount: number | null;
  datedFrom: string | null;
  datedTo: string | null;
  undatedCount: number | null;
  statusCounts: Array<{ status: string; count: number }>;
}

const SAMPLE_ID = "bnd_ai_animation_2026";
const DEMO_ID = "bnd_demo_ai_animation";

const LAYOUT_SAMPLE: HomeEventCard = {
  bundleId: null,
  perspectivesHref: null,
  evidenceHref: null,
  title: LAYOUT_TITLE,
  sourceName: null,
  sourceDate: null,
  sampleKind: "layout-sample",
  storyHref: `/stories/${LAYOUT_STORY_ID}`,
  generatedAt: null,
  articleCount: null,
  outletCount: null,
  datedFrom: null,
  datedTo: null,
  undatedCount: null,
  statusCounts: [],
};

export interface HomeCardView {
  bundleId: string | null;
  perspectivesHref: string | null;
  evidenceHref: string | null;
  title: string;
  sourceName: string | null;
  sourceDate: string | null;
  sampleKind: HomeEventCard["sampleKind"];
  storyHref: string;
}

export function homeCardViews(): HomeCardView[] {
  return homeEventCards().map((card) => ({
    bundleId: card.bundleId,
    perspectivesHref: card.perspectivesHref,
    evidenceHref: card.evidenceHref,
    title: card.title,
    sourceName: card.sourceName,
    sourceDate: card.sourceDate,
    sampleKind: card.sampleKind,
    storyHref: card.storyHref,
  }));
}

export function homeEventCards(): HomeEventCard[] {
  const sample = fixtureById(SAMPLE_ID);
  const demo = fixtureById(DEMO_ID);
  if (!sample || !demo) return [LAYOUT_SAMPLE];
  return [
    toCard(sample, "saved-fixture-links", "Cannes Buzz"),
    toCard(demo, "fictional-demo", "Employment Bulletin"),
    LAYOUT_SAMPLE,
  ];
}

function toCard(bundle: AnalysisBundle, sampleKind: HomeEventCard["sampleKind"], leadIncludes: string): HomeEventCard {
  const lead = bundle.articles.find((article) => article.title.includes(leadIncludes)) ?? bundle.articles[0];
  const dates = bundle.articles
    .map((article) => article.publication_date?.slice(0, 10) ?? null)
    .filter((date): date is string => Boolean(date))
    .sort();
  const counts = new Map<string, number>();
  for (const audit of bundle.evidence_audit.audits) {
    counts.set(audit.status, (counts.get(audit.status) ?? 0) + 1);
  }
  const rawTitle = lead?.title ?? bundle.research_report.metadata.topic;
  return {
    bundleId: bundle.bundle_id,
    perspectivesHref: `/analysis/${bundle.bundle_id}/perspectives`,
    evidenceHref: `/analysis/${bundle.bundle_id}/evidence`,
    title: rawTitle.replace(/^\[DEMO — fictional\]\s*/, ""),
    sourceName: lead?.publisher.name ?? null,
    sourceDate: lead?.publication_date?.slice(0, 10) ?? null,
    sampleKind,
    storyHref: lead ? `/stories/${lead.id}` : `/stories/${LAYOUT_STORY_ID}`,
    generatedAt: bundle.generated_at,
    articleCount: bundle.articles.length,
    outletCount: new Set(bundle.articles.map((article) => article.publisher.name)).size,
    datedFrom: dates[0] ?? null,
    datedTo: dates[dates.length - 1] ?? null,
    undatedCount: bundle.articles.filter((article) => !article.publication_date).length,
    statusCounts: [...counts.entries()].map(([status, count]) => ({ status, count })),
  };
}
