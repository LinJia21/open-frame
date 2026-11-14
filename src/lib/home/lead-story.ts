import { NEWS_SOURCES } from "@/lib/sources/catalog";

export interface LeadQuery {
  sourceId: string;
  title: string;
  date: string | null;
  url: string | null;
}

export interface StoryTitleMatch {
  id: string;
  title: string;
  sourceDomain: string | null;
}

type QueryValue = string | string[] | undefined;

/** A search hit that is only a followed-source title. Unknown sources are rejected. */
export function parseLeadQuery(input: {
  source?: QueryValue;
  title?: QueryValue;
  date?: QueryValue;
  url?: QueryValue;
}): LeadQuery | null {
  const sourceId = first(input.source).trim();
  const title = first(input.title).replace(/\s+/g, " ").trim();
  if (!sourceId || !NEWS_SOURCES.some((source) => source.id === sourceId)) return null;
  if (!title || title.length > 300) return null;
  const dateRaw = first(input.date).trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
  return { sourceId, title, date, url: safeHttp(first(input.url)) };
}

export function leadStoryHref(
  lead: { sourceId: string; title: string; publishedAt: string | null; url: string },
  stories: StoryTitleMatch[],
): string {
  const title = lead.title.replace(/\s+/g, " ").trim();
  if (!title) return `/sources/${lead.sourceId}`;
  const source = NEWS_SOURCES.find((item) => item.id === lead.sourceId);
  const folded = title.toLowerCase();
  const match = stories.find((story) => {
    const storyTitle = story.title.replace(/\s+/g, " ").trim().toLowerCase();
    const sameTitle = storyTitle === folded || storyTitle.includes(folded) || folded.includes(storyTitle);
    if (!sameTitle || storyTitle.length < 12) return false;
    if (!story.sourceDomain || !source) return false;
    return story.sourceDomain.replace(/^www\./, "") === source.domain;
  });
  if (match) return `/stories/${match.id}`;
  const params = new URLSearchParams({ source: lead.sourceId, title });
  const date = lead.publishedAt?.slice(0, 10) ?? "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) params.set("date", date);
  const url = safeHttp(lead.url);
  if (url) params.set("url", url);
  return `/stories/lead?${params.toString()}`;
}

export function safeHttp(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  try {
    const url = new URL(text);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function first(value: QueryValue): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}
