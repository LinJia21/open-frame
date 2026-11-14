"use client";

import Link from "next/link";
import { FeedCard } from "@/components/home/feed-card";
import { ScopeNav } from "@/components/home/scope-nav";
import type { StoryCardModel } from "@/lib/home/stories";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { NEWS_SOURCES, sourceTitle } from "@/lib/sources/catalog";
import { useSourceIds } from "@/lib/sources/use-source-ids";

export function ForYouFeed({
  language,
  homeCards,
  matchedCards,
}: {
  language: UiLanguage;
  homeCards: StoryCardModel[];
  matchedCards: StoryCardModel[];
}) {
  const copy = subpageCopy(language);
  const page = copy.forYou;
  const { ids } = useSourceIds();
  const followed = NEWS_SOURCES.filter((source) => ids.includes(source.id));
  const matched = matchedCards.filter((card) => card.catalogSourceId && ids.includes(card.catalogSourceId));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[1.75rem] font-bold">{page.title}</h1>
        <span className="lav-badge">{page.badge}</span>
      </div>
      <p className="mt-3 text-[15px] leading-7 text-[#3a342c]">{page.honesty}</p>
      <div className="mt-4">
        <ScopeNav language={language} />
      </div>
      {ids.length === 0 ? (
        <section className="topic-card mt-4" role="status">
          <h2 className="text-[1.25rem] font-bold">{page.emptyTitle}</h2>
          <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{page.emptyBody}</p>
          <Link href="/subscribe#source-subscriptions" className="paper-action mt-4 w-full">
            {page.chooseSources}
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-5" aria-labelledby="followed-sources">
            <h2 id="followed-sources" className="text-[1.15rem] font-bold">
              {page.followedTitle}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {followed.map((source) => (
                <li key={source.id}>
                  <Link href={`/sources/${source.id}`} className="scope-pill inline-flex items-center">
                    {sourceTitle(source, language)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-6" aria-labelledby="precomputed-group">
            <h2 id="precomputed-group" className="text-[1.15rem] font-bold">
              {page.groupTitle}
            </h2>
            <p className="mt-2 text-[14px] leading-7 text-[#3a342c]">{page.groupBody}</p>
            <ol className="mt-3 space-y-4">
              {homeCards.map((card) => (
                <li key={card.id}>
                  <StoryRow card={card} language={language} />
                </li>
              ))}
            </ol>
          </section>
          <section className="mt-6" aria-labelledby="matched-titles">
            <h2 id="matched-titles" className="text-[1.15rem] font-bold">
              {page.matchedTitle}
            </h2>
            {matched.length === 0 ? (
              <div className="topic-card mt-3" role="status">
                <h3 className="text-[1.05rem] font-bold">{page.matchedEmptyTitle}</h3>
                <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{page.matchedEmptyBody}</p>
              </div>
            ) : (
              <ol className="mt-3 space-y-4">
                {matched.map((card) => (
                  <li key={card.id}>
                    <StoryRow card={card} language={language} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StoryRow({ card, language }: { card: StoryCardModel; language: UiLanguage }) {
  const copy = subpageCopy(language);
  const kicker = card.sampleKind === "layout-sample" ? copy.shared.layout : card.sampleKind === "fictional-demo" ? copy.shared.demo : copy.shared.sample;
  const tone = card.sampleKind === "saved-fixture-links" ? "live" : card.sampleKind === "fictional-demo" ? "demo" : "neutral";
  const source = card.sourceName && card.sourceDate ? `${card.sourceName} · ${card.sourceDate}` : copy.shared.noSource;
  return (
    <FeedCard
      title={card.title}
      href={card.href}
      kicker={kicker}
      tone={tone}
      sourceLine={source}
      sourceName={card.sourceName}
      imageNote={copy.shared.imageNote}
      heatLabel={copy.shared.heat}
      heat={copy.shared.heatMissing}
    />
  );
}
