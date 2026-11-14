import { Suspense } from "react";
import { connection } from "next/server";
import { ForYouFeed } from "@/components/home/for-you-feed";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { homeEventCards } from "@/lib/home/feed";
import { storyCards, type StoryCardModel } from "@/lib/home/stories";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "forYou") };
}

export default function ForYouPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ForYouData />
    </Suspense>
  );
}

async function ForYouData() {
  await connection();
  const language = await readUiLanguage();
  const copy = subpageCopy(language).forYou;
  const homeCards: StoryCardModel[] = homeEventCards().map((card) => ({
    id: card.storyHref,
    href: card.storyHref,
    title: card.title,
    sourceName: card.sourceName,
    sourceDate: card.sourceDate,
    sampleKind: card.sampleKind,
    catalogSourceId: null,
    hasBriefing: Boolean(card.perspectivesHref),
  }));
  const matchedCards = storyCards().filter((card) => card.catalogSourceId);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <ForYouFeed language={language} homeCards={homeCards} matchedCards={matchedCards} />
    </PaperFrame>
  );
}
