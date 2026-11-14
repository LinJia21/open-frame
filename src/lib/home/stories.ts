import { FIXTURE_IDS } from "@/lib/analysis/fixture-ids";
import { fixtureById } from "@/lib/demo/catalog";
import { NEWS_SOURCES } from "@/lib/sources/catalog";
import type { NewsArticle } from "@/lib/openframe/openframe";

export type StoryKind = "saved-fixture-links" | "fictional-demo" | "layout-sample";

/** One fixture article, or the home layout sample, shown on a story page. */
export interface StoryRecord {
  id: string;
  title: string;
  summary: string;
  excerpt: string | null;
  sourceName: string | null;
  sourceDomain: string | null;
  sourceDate: string | null;
  sampleKind: StoryKind;
  bundleId: string | null;
  catalogSourceId: string | null;
  perspectivesHref: string | null;
  evidenceHref: string | null;
  reportHref: string | null;
  externalUrl: string | null;
}

export interface StoryCardModel {
  id: string;
  href: string;
  title: string;
  sourceName: string | null;
  sourceDate: string | null;
  sampleKind: StoryKind;
  catalogSourceId: string | null;
  hasBriefing: boolean;
}

export const LAYOUT_STORY_ID = "layout-ferry";

export const LAYOUT_TITLE =
  "夜航渡轮延误后的港口广播：这是一条虚构的中文长标题，只用来看混排和换行，不是报道。";

const LAYOUT_SUMMARY =
  "这条卡片只用来看标题在卡片里怎么换行。它不是报道，没有来源，没有日期，没有正文，也没有分析。";

export function storyRecords(): StoryRecord[] {
  const records: StoryRecord[] = [];
  for (const bundleId of FIXTURE_IDS) {
    const bundle = fixtureById(bundleId);
    if (!bundle) continue;
    const kind: StoryKind = bundle.data_mode === "DEMO" ? "fictional-demo" : "saved-fixture-links";
    for (const article of bundle.articles) {
      records.push(fromArticle(bundle.bundle_id, article, kind));
    }
  }
  records.push(layoutStory());
  return records;
}

export function storyById(id: string): StoryRecord | null {
  return storyRecords().find((story) => story.id === id) ?? null;
}

export function storyCards(): StoryCardModel[] {
  return storyRecords().map((story) => ({
    id: story.id,
    href: `/stories/${story.id}`,
    title: story.title,
    sourceName: story.sourceName,
    sourceDate: story.sourceDate,
    sampleKind: story.sampleKind,
    catalogSourceId: story.catalogSourceId,
    hasBriefing: Boolean(story.perspectivesHref),
  }));
}

export function storiesForSource(sourceId: string): StoryRecord[] {
  return storyRecords().filter((story) => story.catalogSourceId === sourceId);
}

function layoutStory(): StoryRecord {
  return {
    id: LAYOUT_STORY_ID,
    title: LAYOUT_TITLE,
    summary: LAYOUT_SUMMARY,
    excerpt: null,
    sourceName: null,
    sourceDomain: null,
    sourceDate: null,
    sampleKind: "layout-sample",
    bundleId: null,
    catalogSourceId: null,
    perspectivesHref: null,
    evidenceHref: null,
    reportHref: null,
    externalUrl: null,
  };
}

function fromArticle(bundleId: string, article: NewsArticle, sampleKind: StoryKind): StoryRecord {
  const domain = article.publisher.domain;
  const briefing = `/analysis/${bundleId}`;
  return {
    id: article.id,
    title: article.title.replace(/^\[DEMO — fictional\]\s*/, ""),
    summary: article.summary.replace(/^\[DEMO — fictional\]\s*/, ""),
    excerpt: article.accessible_text,
    sourceName: article.publisher.name,
    sourceDomain: domain,
    sourceDate: article.publication_date?.slice(0, 10) ?? null,
    sampleKind,
    bundleId,
    catalogSourceId: catalogSourceId(domain),
    perspectivesHref: `${briefing}/perspectives#article-${article.id}`,
    evidenceHref: `${briefing}/evidence`,
    reportHref: `${briefing}/report`,
    externalUrl: safeExternal(article.original_url),
  };
}

function catalogSourceId(domain: string | null): string | null {
  if (!domain) return null;
  const host = domain.toLowerCase().replace(/^www\./, "");
  return NEWS_SOURCES.find((source) => source.domain === host)?.id ?? null;
}

function safeExternal(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
