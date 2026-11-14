import { Suspense } from "react";
import { connection } from "next/server";
import { SearchScreen } from "@/components/home/search-screen";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { storyRecords } from "@/lib/home/stories";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "search") };
}

export default function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <SearchData searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchData({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await connection();
  const language = await readUiLanguage();
  const params = await searchParams;
  const copy = subpageCopy(language).search;
  const stories = storyRecords().map((story) => ({
    id: story.id,
    title: story.title,
    sourceDomain: story.sourceDomain,
  }));
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <SearchScreen key={params.q ?? ""} language={language} initialQuery={params.q ?? ""} stories={stories} />
    </PaperFrame>
  );
}
