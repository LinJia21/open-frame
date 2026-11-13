import { Suspense } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { HomeStudio } from "@/components/home/home-studio";
import { preparedTopics } from "@/lib/demo/catalog";
import { isLanguage, type Language } from "@/lib/i18n/languages";
import { listBundles } from "@/lib/store/bundle-store";
import { toSummary } from "@/lib/adapters/to-view";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { Skeleton } from "@/components/ui/skeleton";

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs tracking-[0.18em] text-of-accent uppercase">Library</p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight">已保存的历史资料</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        每篇分析只纳入已保存文本的前 2000 字。超出部分未纳入分析。不能据此推断完整原文缺乏证据。
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-80 w-full" />}>
        <LibraryData />
      </Suspense>
    </div>
  );
}

async function LibraryData() {
  await connection();
  const jar = await cookies();
  const cookie = jar.get("openframe_lang")?.value;
  const language: Language = isLanguage(cookie) ? cookie : "en";
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
