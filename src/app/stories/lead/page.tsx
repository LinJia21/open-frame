import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoTopicAction } from "@/components/home/demo-topic-action";
import { SaveTitleAction } from "@/components/home/save-title-action";
import { StoryFigure } from "@/components/media/story-figure";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { parseLeadQuery } from "@/lib/home/lead-story";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { isReservedDemoUrl } from "@/lib/openframe/openframe";
import { NEWS_SOURCES, sourceTitle } from "@/lib/sources/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "story") };
}

export default function LeadStoryPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; title?: string; date?: string; url?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <LeadData searchParams={searchParams} />
    </Suspense>
  );
}

async function LeadData({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; title?: string; date?: string; url?: string }>;
}) {
  await connection();
  const language = await readUiLanguage();
  const lead = parseLeadQuery(await searchParams);
  if (!lead) notFound();
  const source = NEWS_SOURCES.find((item) => item.id === lead.sourceId);
  if (!source) notFound();
  const page = subpageCopy(language).story;
  const named = sourceTitle(source, language);
  const sourceLine = lead.date ? `${named} · ${lead.date}` : named;
  return (
    <PaperFrame language={language} lead={page.lead} points={page.points}>
      <article>
        <StoryFigure title={lead.title} note={page.imageNote} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-[1.7rem] font-bold leading-[1.35]">{lead.title}</h1>
          <span className="lav-badge">{page.leadKicker}</span>
        </div>
        <p className="mt-3 text-[15px] leading-7">
          <span className="lav-kicker">{page.leadKicker}</span> {sourceLine} · {source.domain}
        </p>
        <p className="mt-3 text-[15px] leading-7 text-[#3a342c]">{page.leadNote}</p>
        <p className="topic-card mt-4 text-[15px] leading-7" role="status">
          {page.noExcerpt}
        </p>
        <section className="topic-card mt-4">
          <h2 className="text-[1.25rem] font-bold">{page.noAnalysisTitle}</h2>
          <p className="mt-2 text-[15px] leading-7">{page.noAnalysisBody}</p>
        </section>
        {lead.url ? (
          <p className="mt-3 text-[14px] leading-7">
            <a href={lead.url} className="paper-link" target="_blank" rel="noreferrer noopener">
              {page.external}
            </a>
          </p>
        ) : null}
        <div className="mt-4">
          <Link href={`/sources/${source.id}`} className="paper-action-quiet inline-flex">
            {page.openSource}
          </Link>
        </div>
        <SaveTitleAction
          language={language}
          title={lead.title}
          outlet={named}
          url={lead.url}
          date={lead.date}
          canSave={canSaveLead(lead.url)}
          copy={{
            saveTitle: page.saveTitle,
            saveBody: page.saveBody,
            saveButton: page.saveButton,
            saving: page.saving,
            saved: page.saved,
            saveSkipped: page.saveSkipped,
            openItem: subpageCopy(language).importPage.openItem,
          }}
        />
        <DemoTopicAction topic={lead.title} language={language} note={page.demoNote} label={page.demoButton} working={page.demoWorking} />
        <p className="mt-4">
          <Link href={`/search?q=${encodeURIComponent(lead.title)}`} className="paper-link">
            {subpageCopy(language).search.title}
          </Link>
        </p>
      </article>
    </PaperFrame>
  );
}

function canSaveLead(url: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname === "news.google.com" || parsed.hostname.endsWith(".news.google.com")) return false;
    return !isReservedDemoUrl(url);
  } catch {
    return false;
  }
}
