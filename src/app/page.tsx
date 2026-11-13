import { Suspense } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { NewsHome } from "@/components/home/news-home";
import { HomeStudio } from "@/components/home/home-studio";
import { AnalysisBadge, SourceBadge } from "@/components/layout/chrome";
import { PROVENANCE_BADGES } from "@/lib/openframe/openframe";
import { preparedTopics } from "@/lib/demo/catalog";
import { homeCardViews } from "@/lib/home/feed";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { isLanguage, type Language } from "@/lib/i18n/languages";
import { listBundles } from "@/lib/store/bundle-store";
import { toSummary } from "@/lib/adapters/to-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <HomeData searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeData({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  await connection();
  const params = await searchParams;
  const jar = await cookies();
  const cookie = jar.get("openframe_lang")?.value;
  const chosen: Language | null = isLanguage(cookie) ? cookie : null;
  const appLanguage: Language = chosen ?? "zh";
  const webLanguage: Language = chosen ?? "en";
  const tab = params.tab === "foryou" || params.tab === "locate" ? params.tab : "all";
  let recentError = false;
  let recent: ReturnType<typeof toSummary>[] = [];
  try {
    recent = (await listBundles()).slice(0, 6).map(toSummary);
  } catch (error) {
    unstable_rethrow(error);
    recentError = true;
  }
  return (
    <>
      <div className="app-shell">
        <NewsHome cards={homeCardViews()} initialQuery={params.q ?? ""} initialTab={tab} language={appLanguage} />
      </div>
      <div className="web-shell">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <p className="text-xs tracking-[0.18em] text-of-accent uppercase">Media intelligence prototype</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">See Beyond the Headlines.</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Compare how outlets frame a topic, check the claims they make, and leave with a structured research report.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            <SourceBadge label={PROVENANCE_BADGES.data_mode.LIVE} mode="LIVE" />
            <SourceBadge label={PROVENANCE_BADGES.data_mode.DEMO} mode="DEMO" />
            <AnalysisBadge label={PROVENANCE_BADGES.analysis_generation.PRECOMPUTED} generatedAt={null} />
          </div>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            A source badge follows data_mode. The analysis badge follows analysis_generation. This app only shows pre-generated analysis.
          </p>
          <HomeStudio
            initialLanguage={webLanguage}
            recent={recent}
            recentError={recentError}
            provider={getPublicProviderStatus()}
            includeCorpus={false}
            topicInHeader
            suggestions={preparedTopics.map((topic) => ({ id: topic.id, title: topic.title, blurb: topic.blurb }))}
          />
        </div>
      </div>
    </>
  );
}
