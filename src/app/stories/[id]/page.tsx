import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoTopicAction } from "@/components/home/demo-topic-action";
import { StoryFigure } from "@/components/media/story-figure";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { storyById } from "@/lib/home/stories";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "story") };
}

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <StoryData params={params} />
    </Suspense>
  );
}

async function StoryData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const language = await readUiLanguage();
  const { id } = await params;
  const story = storyById(id);
  if (!story) notFound();
  const copy = subpageCopy(language);
  const page = copy.story;
  const kicker = story.sampleKind === "layout-sample" ? page.layout : story.sampleKind === "fictional-demo" ? page.demo : page.sample;
  const source = story.sourceName && story.sourceDate ? `${story.sourceName} · ${story.sourceDate}` : page.noSource;
  return (
    <PaperFrame language={language} lead={page.lead} points={page.points}>
      <article>
        <StoryFigure title={story.title} note={page.imageNote} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-[1.7rem] font-bold leading-[1.35]">{story.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] text-muted-foreground">
              <span className="sr-only">{page.heat} </span>
              {page.heatMissing}
            </p>
            <span className="lav-badge">
              {kicker}
              {story.sampleKind === "fictional-demo" ? <span>{page.demoMark}</span> : null}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-7">
          <span className="lav-kicker">{kicker}</span> {source}
          {story.sourceDomain ? ` · ${story.sourceDomain}` : ""}
        </p>
        <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
          {page.verify}：{story.sampleKind === "layout-sample" ? page.verifyLayout : page.verifyOpen}
        </p>
        <p className="mt-4 text-[16px] leading-8">{story.summary}</p>
        <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{page.fixtureNote}</p>
        <h2 className="mt-6 text-[1.15rem] font-bold">{page.excerptLabel}</h2>
        {story.excerpt ? (
          <p className="topic-card mt-3 whitespace-pre-wrap text-[15px] leading-7">{story.excerpt}</p>
        ) : (
          <p className="topic-card mt-3 text-[15px] leading-7" role="status">
            {page.noExcerpt}
          </p>
        )}
        {story.externalUrl ? (
          <p className="mt-3 text-[14px] leading-7">
            <a href={story.externalUrl} className="paper-link" target="_blank" rel="noreferrer noopener">
              {page.external}
            </a>
          </p>
        ) : null}
        {story.perspectivesHref && story.evidenceHref && story.reportHref ? (
          <div className="mt-5 flex flex-col gap-2">
            <Link href={story.perspectivesHref} className="paper-action w-full">
              {page.openPerspectives}
            </Link>
            <Link href={story.evidenceHref} className="paper-action w-full">
              {page.openEvidence}
            </Link>
            <Link href={story.reportHref} className="paper-action w-full">
              {page.openReport}
            </Link>
          </div>
        ) : (
          <NoBriefing language={language} topic={story.title} />
        )}
        {story.catalogSourceId ? (
          <Link href={`/sources/${story.catalogSourceId}`} className="paper-action-quiet mt-4 inline-flex">
            {page.openSource}
          </Link>
        ) : null}
        <p className="mt-4">
          <Link href="/" className="paper-link">
            {page.backHome}
          </Link>
        </p>
      </article>
    </PaperFrame>
  );
}

function NoBriefing({ language, topic }: { language: UiLanguage; topic: string }) {
  const page = subpageCopy(language).story;
  return (
    <section className="mt-5">
      <div className="topic-card">
        <h2 className="text-[1.25rem] font-bold">{page.noAnalysisTitle}</h2>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{page.noAnalysisBody}</p>
      </div>
      <DemoTopicAction topic={topic} language={language} note={page.demoNote} label={page.demoButton} working={page.demoWorking} />
    </section>
  );
}
