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
    <div className="newsroom">
      <div className="mx-auto w-full max-w-[40rem] px-5 py-8">
        <p className="text-[13px] leading-[1.65] text-[#5c564c]">
          <Link href="/" className="paper-link wordmark text-[1.35rem]">OpenFrame</Link>
          <span> / 设置</span>
        </p>
        <h1 className="mt-4 text-[1.75rem] leading-[1.3]">设置</h1>
        <ul className="mt-8 space-y-4">
          <li className="paper-card p-5">
            <Link href="/library" className="text-[16px] font-medium leading-[1.65] paper-link">已保存的历史资料</Link>
            <p className="mt-1 text-[16px] leading-[1.65] text-[#1c1915]">
              导入和检索已经保存的文字。当前 {libraryCount} 条。这不是首页上的新闻流。
            </p>
          </li>
          <li className="paper-card p-5">
            <h2 className="text-[16px] font-medium leading-[1.65]">提供方</h2>
            <p className="mt-1 text-[16px] leading-[1.65] text-[#1c1915]">{provider.note}</p>
            <p className="text-[13px] leading-[1.65] text-[#3a342c]">liveCallVerified 固定为 false。这里不读取密钥，也不发起调用。</p>
          </li>
          <li className="paper-card p-5">
            <h2 className="text-[16px] font-medium leading-[1.65]">首页示例</h2>
            <p className="mt-1 text-[16px] leading-[1.65] text-[#1c1915]">
              首页只标「演示示例 · 非实时」。热度没有记录，所以写暂无数据。热度不是可信度。下面的主张计数来自夹具，不是对整件事的真伪判断。
            </p>
            <ul className="mt-4 space-y-4">
              {cards.map((card) => (
                <li key={card.sampleKind + (card.bundleId ?? "layout")} className="text-[16px] leading-[1.65] text-[#1c1915]">
                  <p className="font-medium">{card.title}</p>
                  {card.sampleKind === "layout-sample" ? (
                    <p className="text-[13px] leading-[1.65] text-[#3a342c]">虚构布局样例。没有来源、没有日期、没有分析页。</p>
                  ) : (
                    <p className="text-[13px] leading-[1.65] text-[#3a342c]">
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
    </div>
  );
}
