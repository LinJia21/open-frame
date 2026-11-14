import Link from "next/link";
import { FeedCard } from "@/components/home/feed-card";
import { ScopeNav } from "@/components/home/scope-nav";
import { SourceFollowButton } from "@/components/home/source-follow";
import type { StoryCardModel } from "@/lib/home/stories";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { NEWS_SOURCES, SOURCE_CATEGORIES, sourceTitle, type NewsSource, type SourceCategory } from "@/lib/sources/catalog";

export function LocateView({
  language,
  region,
  stories,
}: {
  language: UiLanguage;
  region: SourceCategory | null;
  stories: StoryCardModel[];
}) {
  const copy = subpageCopy(language);
  const page = copy.locate;
  const active = SOURCE_CATEGORIES.find((item) => item.id === region) ?? null;
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
      <nav aria-label={page.allRegions} className="scope-row mt-3">
        <Link href="/locate" className="scope-pill" aria-current={active ? undefined : "page"}>
          {page.allRegions}
        </Link>
        {SOURCE_CATEGORIES.map((item) => (
          <Link key={item.id} href={`/locate?region=${item.id}`} className="scope-pill" aria-current={item.id === region ? "page" : undefined}>
            {categoryName(item, language)}
          </Link>
        ))}
      </nav>
      {active ? (
        <RegionDetail language={language} category={active.id} label={categoryName(active, language)} stories={stories} />
      ) : (
        <ul className="mt-4 space-y-3">
          {SOURCE_CATEGORIES.map((item) => {
            const sources = NEWS_SOURCES.filter((source) => source.category === item.id);
            const count = stories.filter((story) => sources.some((source) => source.id === story.catalogSourceId)).length;
            return (
              <li key={item.id}>
                <Link href={`/locate?region=${item.id}`} className="topic-card block">
                  <span className="text-[1.15rem] font-bold">{categoryName(item, language)}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {sources.length} · {count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RegionDetail({
  language,
  category,
  label,
  stories,
}: {
  language: UiLanguage;
  category: SourceCategory;
  label: string;
  stories: StoryCardModel[];
}) {
  const copy = subpageCopy(language);
  const page = copy.locate;
  const sources = NEWS_SOURCES.filter((source) => source.category === category);
  const rows = stories.filter((story) => sources.some((source) => source.id === story.catalogSourceId));
  return (
    <div className="mt-5">
      <h2 className="text-[1.25rem] font-bold">{label}</h2>
      <section className="mt-4" aria-labelledby="region-sources">
        <h3 id="region-sources" className="text-[1.05rem] font-bold">
          {page.sourcesTitle}
        </h3>
        <ul className="mt-3 space-y-2">
          {sources.map((source) => (
            <li key={source.id} className="topic-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link href={`/sources/${source.id}`} className="text-[1.05rem] font-bold text-foreground">
                    {sourceTitle(source, language)}
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {source.domain} · {source.access === "official_rss" ? copy.source.officialRss : copy.source.googleRss}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <SourceFollowButton sourceId={source.id} follow={page.follow} following={page.following} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-6" aria-labelledby="region-stories">
        <h3 id="region-stories" className="text-[1.05rem] font-bold">
          {page.storiesTitle}
        </h3>
        {rows.length === 0 ? (
          <div className="topic-card mt-3" role="status">
            <h4 className="text-[1.05rem] font-bold">{page.emptyStoriesTitle}</h4>
            <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{page.emptyStoriesBody}</p>
          </div>
        ) : (
          <ol className="mt-3 space-y-4">
            {rows.map((card) => (
              <li key={card.id}>
                <RegionStory card={card} language={language} source={sources.find((item) => item.id === card.catalogSourceId) ?? null} />
              </li>
            ))}
          </ol>
        )}
      </section>
      <Link href="/locate" className="paper-action-quiet mt-4 inline-flex">
        {page.back}
      </Link>
    </div>
  );
}

function RegionStory({ card, language, source }: { card: StoryCardModel; language: UiLanguage; source: NewsSource | null }) {
  const copy = subpageCopy(language);
  const kicker = card.sampleKind === "fictional-demo" ? copy.shared.demo : copy.shared.sample;
  const named = source ? sourceTitle(source, language) : (card.sourceName ?? copy.shared.noSource);
  const line = card.sourceDate ? `${named} · ${card.sourceDate}` : named;
  return (
    <FeedCard
      title={card.title}
      href={card.href}
      kicker={kicker}
      tone={card.sampleKind === "saved-fixture-links" ? "live" : "demo"}
      sourceLine={line}
      sourceName={named}
      imageNote={copy.shared.imageNote}
      heatLabel={copy.shared.heat}
      heat={copy.shared.heatMissing}
    />
  );
}

function categoryName(item: (typeof SOURCE_CATEGORIES)[number], language: UiLanguage): string {
  if (language === "zh-Hant") return item.labelHant;
  if (language === "zh") return item.label;
  return item.labelEn;
}
