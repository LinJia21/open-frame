import { Suspense } from "react";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { HomeStudio } from "@/components/home/home-studio";
import { NewsDiscovery } from "@/components/home/news-discovery";
import { preparedTopics } from "@/lib/demo/catalog";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { libraryFrame } from "@/lib/i18n/app-pages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { listBundles } from "@/lib/store/bundle-store";
import { toSummary } from "@/lib/adapters/to-view";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LibraryPage() {
  const language = await readUiLanguage();
  const copy = libraryFrame(language);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <p className="wordmark text-[1.85rem]">SpectraX</p>
      <NewsDiscovery />
      <section id="saved-library" aria-labelledby="saved-library-title" className="mt-10 scroll-mt-6 border-t border-border pt-6">
        <p className="text-xs tracking-[0.16em] text-of-accent">02 / SAVED LIBRARY</p>
        <h1 id="saved-library-title" className="mt-3 text-[1.75rem] font-bold">{copy.title}</h1>
        <p className="mt-3 text-base leading-7 text-[#3a342c]">{copy.intro}</p>
        <Suspense fallback={<Skeleton className="mt-6 h-80 w-full" />}>
          <LibraryData language={language} />
        </Suspense>
      </section>
    </PaperFrame>
  );
}

async function LibraryData({ language }: { language: UiLanguage }) {
  await connection();
  let recentError = false;
  let recent: ReturnType<typeof toSummary>[] = [];
  try {
    recent = (await listBundles()).slice(0, 6).map(toSummary);
  } catch (error) {
    unstable_rethrow(error);
    recentError = true;
  }
  return (
    <HomeStudio
      initialLanguage={language}
      recent={recent}
      recentError={recentError}
      provider={getPublicProviderStatus()}
      suggestions={preparedTopics.map((topic) => ({ id: topic.id, title: topic.title, blurb: topic.blurb }))}
    />
  );
}
