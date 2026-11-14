import { Suspense } from "react";
import { connection } from "next/server";
import { LibraryImportForm } from "@/components/home/library-import-form";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { liveCorpusStore } from "@/lib/corpus/live";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import { Skeleton } from "@/components/ui/skeleton";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "libraryImport") };
}

export default function LibraryImportPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ImportData />
    </Suspense>
  );
}

async function ImportData() {
  await connection();
  const language = await readUiLanguage();
  const copy = subpageCopy(language).importPage;
  let libraryCount = 0;
  try {
    libraryCount = (await liveCorpusStore().search("", "")).library.itemCount;
  } catch {
    libraryCount = 0;
  }
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <LibraryImportForm language={language} libraryCount={libraryCount} />
    </PaperFrame>
  );
}
