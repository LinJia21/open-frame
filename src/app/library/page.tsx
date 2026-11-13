import { Suspense } from "react";
import { connection } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { HomeStudio } from "@/components/home/home-studio";
import { preparedTopics } from "@/lib/demo/catalog";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import type { Language } from "@/lib/i18n/languages";
import { listBundles } from "@/lib/store/bundle-store";
import { toSummary } from "@/lib/adapters/to-view";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { Skeleton } from "@/components/ui/skeleton";

export default async function LibraryPage() {
  const language = await readUiLanguage();
  const zh = language === "zh";
  return (
    <PaperFrame
      language={language}
      lead={
        zh
          ? "资料库从空开始。导入、检索和分析都作用在已保存的文字上，不会搜索互联网。"
          : "The library starts empty. Import, search, and analysis use saved text only. They do not search the web."
      }
      points={
        zh
          ? ["默认没有历史记录，这里不会填入假列表。", "建议议题只会填入议题栏。", "演示模式不会假装已经接上实时模型。"]
          : ["There is no saved history until you import. Nothing here is filled in.", "Suggestions only fill the topic field.", "Demo mode does not pretend a live model is connected."]
      }
    >
      <p className="wordmark text-[1.85rem]">SpectraX</p>
      <h1 className="mt-4 text-[1.75rem] font-bold">{zh ? "已保存的历史资料" : "Saved historical materials"}</h1>
      <p className="mt-3 text-base leading-7 text-[#3a342c]">
        {zh
          ? "每篇分析只纳入已保存文本的前 2000 字。超出部分未纳入分析。不能据此推断完整原文缺乏证据。"
          : "Each analysis includes only the first 2000 characters of saved text. The rest is not included, and that cutoff is not evidence about the rest of the original."}
      </p>
      <Suspense fallback={<Skeleton className="mt-6 h-80 w-full" />}>
        <LibraryData language={language} />
      </Suspense>
    </PaperFrame>
  );
}

async function LibraryData({ language }: { language: Language }) {
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
