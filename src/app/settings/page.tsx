import Link from "next/link";
import { connection } from "next/server";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { liveCorpusStore } from "@/lib/corpus/live";
import { homeEventCards } from "@/lib/home/feed";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";

export default async function SettingsPage() {
  await connection();
  const language = await readUiLanguage();
  const zh = language === "zh";
  const provider = getPublicProviderStatus();
  let libraryCount = 0;
  try {
    libraryCount = (await liveCorpusStore().search("", "")).library.itemCount;
  } catch {
    libraryCount = 0;
  }
  const cards = homeEventCards();
  return (
    <PaperFrame
      language={language}
      lead={zh ? "设置只说明已经能打开的入口，不会把未开通的功能装成可用。" : "Settings only describes entries that already open."}
      points={zh ? ["资料库不是首页新闻流。", "提供方状态是公开说明，不读取密钥。", "首页热度没有数字。"] : ["The library is not the home feed.", "Provider status is public. No secret is read.", "Heat has no number."]}
    >
      <p className="text-[15px]">
        <Link href="/" className="wordmark text-[1.7rem]">
          OpenFrame
        </Link>
        <span className="text-muted-foreground"> / {zh ? "设置" : "Settings"}</span>
      </p>
      <h1 className="mt-4 text-[1.75rem] font-bold">{zh ? "设置" : "Settings"}</h1>
      <ul className="mt-6 space-y-4">
        <li className="topic-card">
          <Link href="/library" className="paper-link text-base font-medium">
            {zh ? "已保存的历史资料" : "Saved historical materials"}
          </Link>
          <p className="mt-2 text-base leading-7">
            {zh
              ? `导入和检索已经保存的文字。当前 ${libraryCount} 条。这不是首页上的新闻流。`
              : `Import and search text you already saved. ${libraryCount} items now. This is not the home news feed.`}
          </p>
        </li>
        <li className="topic-card">
          <h2 className="text-base font-bold">{zh ? "提供方" : "Provider"}</h2>
          <p className="mt-2 text-base leading-7">{provider.note}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            provider {provider.provider} · liveCallVerified {String(provider.liveCallVerified)}。
            {zh ? "这里不读取密钥，也不发起调用。" : " This screen does not read a secret and does not make a call."}
          </p>
        </li>
        <li className="topic-card">
          <h2 className="text-base font-bold">{zh ? "首页示例" : "Home samples"}</h2>
          <p className="mt-2 text-base leading-7">
            {zh
              ? "首页只标「演示示例 · 非实时」。热度没有记录，所以写暂无数据。热度不是可信度。下面的主张计数来自夹具，不是对整件事的真伪判断。"
              : "Home is marked as a sample, not live. Heat has no record, so it says there is no data. Heat is not credibility. The claim counts below come from the fixtures and are not a verdict on the whole event."}
          </p>
          <ul className="mt-4 space-y-4">
            {cards.map((card) => (
              <li key={card.sampleKind + (card.bundleId ?? "layout")} className="text-base leading-7">
                <p className="font-medium">{card.title}</p>
                {card.sampleKind === "layout-sample" ? (
                  <p className="text-sm text-muted-foreground">
                    {zh ? "虚构布局样例。没有来源、没有日期、没有分析页。" : "Fictional layout sample. No source, no date, and no analysis page."}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {card.sampleKind === "fictional-demo"
                      ? zh
                        ? "虚构演示。"
                        : "Fictional demonstration."
                      : zh
                        ? "示例。夹具中的来源链接，分析是预生成的。"
                        : "Sample. Fixture source links, and the analysis is pre-generated."}{" "}
                    {zh ? "生成时间" : "Generated"} {card.generatedAt}。{zh ? "夹具内" : "Fixture"} {card.articleCount} {zh ? "篇，列出" : "articles,"} {card.outletCount}{" "}
                    {zh ? "家媒体。" : "outlets."} {zh ? "日期" : "Dates"} {card.datedFrom ?? (zh ? "无" : "none")} {zh ? "至" : "to"} {card.datedTo ?? (zh ? "无" : "none")}。
                    {zh ? "没有日期的" : "Undated"} {card.undatedCount} {zh ? "篇。" : "."} {zh ? "主张计数：" : "Claim counts:"}{" "}
                    {card.statusCounts.map((item) => `${item.status} ${item.count}`).join(" · ") || (zh ? "无" : "none")}。
                    {zh ? "首页卡片只显示其中一篇的来源和日期。" : "The home card shows one article’s source and date."}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </PaperFrame>
  );
}
