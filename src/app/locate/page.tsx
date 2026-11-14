import { Suspense } from "react";
import { connection } from "next/server";
import { LocateView } from "@/components/home/locate-view";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { storyCards } from "@/lib/home/stories";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { SOURCE_CATEGORIES, type SourceCategory } from "@/lib/sources/catalog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "locate") };
}

export default function LocatePage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <LocateData searchParams={searchParams} />
    </Suspense>
  );
}

async function LocateData({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
  await connection();
  const language = await readUiLanguage();
  const params = await searchParams;
  const region = SOURCE_CATEGORIES.some((item) => item.id === params.region) ? (params.region as SourceCategory) : null;
  const copy = subpageCopy(language).locate;
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <LocateView language={language} region={region} stories={storyCards()} />
    </PaperFrame>
  );
}
