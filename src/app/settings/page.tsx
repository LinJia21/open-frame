import Link from "next/link";
import { connection } from "next/server";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { liveCorpusStore } from "@/lib/corpus/live";
import { homeEventCards } from "@/lib/home/feed";

export default async function SettingsPage() {
  await connection();
  const provider = getPublicProviderStatus();
  let libraryCount = 0;
  try {
    libraryCount = (await liveCorpusStore().search("", "")).library.itemCount;
  } catch {
    libraryCount = 0;
  }
  const cards = homeEventCards();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-xs tracking-[0.18em] text-of-accent uppercase">Settings</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">设置</h1>
        <ul className="mt-8 space-y-4">
          <li className="rounded-xl border border-border bg-card p-5">
            <Link href="/library" className="text-base font-medium text-of-accent underline-offset-2 hover:underline">已保存的历史资料</Link>
            <p className="mt-1 text-base leading-7">
              导入和检索已经保存的文字。当前 {libraryCount} 条。这不是首页上的新闻流。
            </p>
          </li>
          <li className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-medium">提供方</h2>
            <p className="mt-1 text-base leading-7">{provider.note}</p>
            <p className="text-sm text-muted-foreground">liveCallVerified 固定为 false。这里不读取密钥，也不发起调用。</p>
          </li>
          <li className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-medium">首页示例</h2>
            <p className="mt-1 text-base leading-7">
              首页只标「演示示例 · 非实时」。热度没有记录，所以写暂无数据。热度不是可信度。下面的主张计数来自夹具，不是对整件事的真伪判断。
            </p>
            <ul className="mt-4 space-y-4">
              {cards.map((card) => (
                <li key={card.sampleKind + (card.bundleId ?? "layout")} className="text-base leading-7">
                  <p className="font-medium">{card.title}</p>
                  {card.sampleKind === "layout-sample" ? (
                    <p className="text-sm text-muted-foreground">虚构布局样例。没有来源、没有日期、没有分析页。</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {card.sampleKind === "fictional-demo" ? "虚构演示。" : "示例。夹具中的来源链接，分析是预生成的。"}
                      {" "}生成时间 {card.generatedAt}。夹具内 {card.articleCount} 篇，列出 {card.outletCount} 家媒体。
                      日期 {card.datedFrom ?? "无"} 至 {card.datedTo ?? "无"}。没有日期的 {card.undatedCount} 篇。
                      主张计数：{card.statusCounts.map((item) => `${item.status} ${item.count}`).join(" · ") || "无"}。
                      首页卡片只显示其中一篇的来源和日期。
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        </ul>
    </div>
  );
}
