import { Suspense } from "react";
import Link from "next/link";
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
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <p className="text-sm text-[#5c564c]">
        <Link href="/" className="underline decoration-[#1c1915]/30 underline-offset-4">OpenFrame</Link>
        <span> / 已保存的历史资料</span>
      </p>
      <p className="mt-4 max-w-3xl text-[1.02rem] leading-7 text-[#3f3a33]">
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
  const language: Language = isLanguage(cookie) ? cookie : "zh";
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
