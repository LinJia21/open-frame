"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FeedCard } from "@/components/home/feed-card";
import { ScopeNav } from "@/components/home/scope-nav";
import { SearchProgressCard } from "@/components/home/search-progress-card";
import { leadStoryHref, type StoryTitleMatch } from "@/lib/home/lead-story";
import { readDemoProgress } from "@/lib/home/demo-progress";
import { useDemoProgress } from "@/lib/home/use-demo-progress";
import { PREPARED_REPORT_HREF, matchPreparedTopic } from "@/lib/demo/topic-match";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { NEWS_SOURCES, sourceTitle } from "@/lib/sources/catalog";
import { useSourceIds } from "@/lib/sources/use-source-ids";
import type { NewsDiscoveryResult } from "@/lib/sources/types";

export function SearchScreen({
  language,
  initialQuery,
  stories,
}: {
  language: UiLanguage;
  initialQuery: string;
  stories: StoryTitleMatch[];
}) {
  const copy = subpageCopy(language);
  const shared = copy.shared;
  const search = copy.search;
  const query = initialQuery.trim();
  const router = useRouter();
  const { ids: sourceIds } = useSourceIds();
  const { progress, setProgress } = useDemoProgress();
  const [attempt, setAttempt] = useState(0);
  const [fetched, setFetched] = useState<{ key: string; result: NewsDiscoveryResult | null; error: boolean } | null>(null);
  const requestRef = useRef(0);
  const prepared = query ? matchPreparedTopic(query) : null;
  const sourceKey = sourceIds.join(",");
  const requestKey = `${query}|${sourceKey}|${attempt}`;
  const pending = Boolean(query) && sourceIds.length > 0 && fetched?.key !== requestKey;

  useEffect(() => {
    if (!query || sourceIds.length === 0) return;
    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    const key = requestKey;
    const ids = sourceIds;
    void (async () => {
      await Promise.resolve();
      if (ticket !== requestRef.current) return;
      setProgress({ query, sourceIds: [...ids], startedAt: Date.now() });
      try {
        const response = await fetch(`/api/news?q=${encodeURIComponent(query)}&sources=${encodeURIComponent(ids.join(","))}`);
        const payload = (await response.json()) as { ok?: boolean; data?: NewsDiscoveryResult };
        if (ticket !== requestRef.current) return;
        if (!response.ok || !payload.ok || !payload.data) {
          setFetched({ key, result: null, error: true });
          return;
        }
        setFetched({ key, result: payload.data, error: false });
        const found = [...new Set(payload.data.items.map((item) => item.sourceId))];
        const current = readDemoProgress(window.localStorage);
        if (found.length > 0 && current?.query === query) setProgress({ ...current, sourceIds: found });
      } catch {
        if (ticket !== requestRef.current) return;
        setFetched({ key, result: null, error: true });
      }
    })();
  }, [query, sourceIds, requestKey, setProgress]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-[1.75rem] font-bold">{search.title}</h1>
      </div>
      <form role="search" className="search-row mt-3" action="/search" method="get">
        <label htmlFor="search-q" className="sr-only">
          {search.title}
        </label>
        <div className="search-pill">
          <input id="search-q" name="q" defaultValue={initialQuery} placeholder={language === "en" ? "Search titles" : language === "zh-Hant" ? "搜索標題" : "搜索标题"} />
          <button type="submit" aria-label={search.title}>
            <SearchIcon />
          </button>
        </div>
      </form>
      <p className="mt-3 text-[13px] leading-[1.65] text-muted-foreground">
        {sourceIds.length === 0 ? search.noSources : search.hint(sourceIds.length)}
      </p>
      <ScopeNav language={language} />
      {progress ? (
        <div className="mt-4">
          <SearchProgressCard progress={progress} language={language} />
        </div>
      ) : null}
      {prepared ? (
        <section className="topic-card mt-4">
          <h2 className="text-[1.25rem] font-bold">{search.preparedTitle}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{search.preparedBody}</p>
          <Link href={PREPARED_REPORT_HREF[prepared]} className="paper-action mt-4 w-full">
            {search.openPrepared}
          </Link>
        </section>
      ) : null}
      {!query ? (
        <section className="topic-card mt-4" role="status">
          <h2 className="text-[1.25rem] font-bold">{search.emptyQueryTitle}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{search.emptyQueryBody}</p>
          <Link href="/" className="paper-action-quiet mt-4 inline-flex">
            {search.backHome}
          </Link>
        </section>
      ) : null}
      {query && sourceIds.length > 0 && pending ? (
        <section className="topic-card mt-4" aria-busy="true" role="status">
          <h2 className="text-[1.25rem] font-bold">{search.searching}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{search.searchingBody}</p>
        </section>
      ) : null}
      {query && sourceIds.length === 0 ? (
        <section className="topic-card mt-4" role="status">
          <h2 className="text-[1.25rem] font-bold">{search.noSourcesTitle}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{search.noSources}</p>
          <Link href="/subscribe#source-subscriptions" className="paper-action mt-4 w-full">
            {search.chooseSources}
          </Link>
        </section>
      ) : null}
      {query && fetched?.key === requestKey && fetched.error ? (
        <section className="topic-card mt-4" role="alert">
          <h2 className="text-[1.25rem] font-bold">{search.failedTitle}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{search.failed}</p>
          <button type="button" className="paper-action mt-4 w-full" onClick={() => { setAttempt((value) => value + 1); router.refresh(); }}>
            {search.retry}
          </button>
        </section>
      ) : null}
      {query && fetched?.key === requestKey && fetched.result && fetched.result.items.length === 0 ? (
        <section className="topic-card mt-4" role="status">
          <h2 className="text-[1.25rem] font-bold">{search.noLeadsTitle}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{search.noLeads}</p>
        </section>
      ) : null}
      {query && fetched?.key === requestKey && fetched.result && fetched.result.items.length > 0 ? (
        <div className="mt-4">
          <p className="mb-3 text-[13px] leading-[1.65] text-muted-foreground">{search.resultCount(fetched.result.items.length)}</p>
          <ol className="space-y-4">
            {fetched.result.items.map((item) => {
              const named = sourceTitleById(item.sourceId, item.publisher, language);
              const date = leadDate(item.publishedAt);
              const title = item.title || search.untitled;
              const href = item.title?.trim()
                ? leadStoryHref({ sourceId: item.sourceId, title: item.title, publishedAt: item.publishedAt, url: item.url }, stories)
                : `/sources/${item.sourceId}`;
              return (
                <li key={`${item.sourceId}:${item.id}`}>
                  <FeedCard
                    title={title}
                    href={href}
                    kicker={shared.sample}
                    tone="neutral"
                    sourceLine={date ? `${named} · ${date}` : named}
                    sourceName={named}
                    imageNote={shared.imageNote}
                    heatLabel={shared.heat}
                    heat={shared.heatMissing}
                  />
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

function sourceTitleById(sourceId: string, publisher: string, language: UiLanguage): string {
  const source = NEWS_SOURCES.find((item) => item.id === sourceId);
  if (source) return sourceTitle(source, language);
  return publisher || sourceId;
}

function leadDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
