import { Suspense } from "react";
import { connection } from "next/server";
import { LibraryReader } from "@/components/home/library-reader";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "library") };
}

export default function LibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ItemData params={params} />
    </Suspense>
  );
}

async function ItemData({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const language = await readUiLanguage();
  const { id } = await params;
  const copy = subpageCopy(language).libraryItem;
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <LibraryReader key={id} id={id} language={language} />
    </PaperFrame>
  );
}
