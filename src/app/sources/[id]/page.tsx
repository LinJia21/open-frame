import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeedCard } from "@/components/home/feed-card";
import { SourceFollowButton } from "@/components/home/source-follow";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { storiesForSource } from "@/lib/home/stories";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { NEWS_SOURCES, SOURCE_CATEGORIES, sourceTitle } from "@/lib/sources/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "source") };
}

export default function SourcePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <SourceData params={params} />
    </Suspense>
  );
}

async function SourceData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const language = await readUiLanguage();
  const { id } = await params;
  const source = NEWS_SOURCES.find((item) => item.id === id);
  if (!source) notFound();
  const copy = subpageCopy(language);
  const page = copy.source;
  const category = SOURCE_CATEGORIES.find((item) => item.id === source.category);
  const region = category ? (language === "zh-Hant" ? category.labelHant : language === "zh" ? category.label : category.labelEn) : source.category;
  const stories = storiesForSource(source.id);
  const named = sourceTitle(source, language);
  return (
    <PaperFrame language={language} lead={page.lead} points={page.points}>
      <article>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[1.75rem] font-bold">{named}</h1>
          <span className="lav-badge">{source.access === "official_rss" ? page.officialRss : page.googleRss}</span>
        </div>
        <p className="mt-3 text-[15px] leading-7">
          {source.domain} · {region}
        </p>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{source.focus}</p>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{page.notACrawl}</p>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{page.localOnly}</p>
        <div className="mt-4">
          <SourceFollowButton sourceId={source.id} follow={page.follow} following={page.following} />
        </div>
        <section className="mt-6" aria-labelledby="source-stories">
          <h2 id="source-stories" className="text-[1.15rem] font-bold">
            {page.storiesTitle}
          </h2>
          {stories.length === 0 ? (
            <div className="topic-card mt-3" role="status">
              <h3 className="text-[1.05rem] font-bold">{page.emptyTitle}</h3>
              <p className="mt-2 text-[15px] leading-7">{page.emptyBody}</p>
            </div>
          ) : (
            <ol className="mt-3 space-y-4">
              {stories.map((story) => (
                <li key={story.id}>
                  <FeedCard
                    title={story.title}
                    href={`/stories/${story.id}`}
                    kicker={story.sampleKind === "fictional-demo" ? copy.shared.demo : copy.shared.sample}
                    tone={story.sampleKind === "saved-fixture-links" ? "live" : "demo"}
                    sourceLine={story.sourceDate ? `${named} · ${story.sourceDate}` : named}
                    sourceName={named}
                    imageNote={copy.shared.imageNote}
                    heatLabel={copy.shared.heat}
                    heat={copy.shared.heatMissing}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
        <Link href={`/locate?region=${source.category}`} className="paper-action-quiet mt-4 inline-flex">
          {region}
        </Link>
        <p className="mt-3">
          <Link href="/subscribe#source-subscriptions" className="paper-link">
            {page.backSubscribe}
          </Link>
        </p>
      </article>
    </PaperFrame>
  );
}
