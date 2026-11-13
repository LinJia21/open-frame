import { Suspense } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { HomeStudio } from "@/components/home/home-studio";
import { NewsDiscovery } from "@/components/home/news-discovery";
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
      <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight">资料库</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        发现新闻线索，或使用已保存的历史资料。两者分区展示，新闻标题不会自动成为分析证据。
      </p>
      <nav aria-label="资料库分区" className="mt-4 flex flex-wrap gap-3 text-sm">
        <a href="#news-discovery" className="inline-flex min-h-11 items-center rounded-full border border-of-cream-border bg-of-cream/40 px-4 text-of-accent hover:bg-of-cream focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-of-accent">新闻发现</a>
        <a href="#saved-library" className="inline-flex min-h-11 items-center rounded-full border border-border px-4 hover:border-of-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-of-accent">已存资料与分析</a>
      </nav>
      <NewsDiscovery />
      <section id="saved-library" aria-labelledby="saved-library-title" className="mt-12 scroll-mt-6 border-t border-border pt-8">
        <p className="text-xs tracking-[0.16em] text-of-accent">02 / SAVED LIBRARY</p>
        <h2 id="saved-library-title" className="mt-3 font-serif text-2xl sm:text-3xl">已保存的历史资料</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          以下保留资料导入、已存资料检索与分析功能，与上方新闻发现独立。每篇分析只纳入已保存文本的前 2000 字，超出部分未纳入分析；不能据此推断完整原文缺乏证据。
        </p>
        <Suspense fallback={<Skeleton className="mt-6 h-80 w-full" />}>
          <LibraryData />
        </Suspense>
      </section>
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
