"use client";

import { useState, ViewTransition } from "react";
import Link from "next/link";
import type { HomeCardView } from "@/lib/home/feed";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { HeaderLockup, StageLockup } from "@/components/layout/brand-lockup";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { messagesForUi } from "@/lib/i18n/messages";
import { PageDock } from "@/components/layout/page-dock";
import { useSourceIds } from "@/lib/sources/use-source-ids";
import { FeedCard } from "@/components/home/feed-card";
import { ScopeNav } from "@/components/home/scope-nav";
import { SearchProgressCard } from "@/components/home/search-progress-card";
import { useDemoProgress } from "@/lib/home/use-demo-progress";

export function NewsHome({
  cards,
  initialQuery,
  language,
}: {
  cards: HomeCardView[];
  initialQuery: string;
  language: UiLanguage;
}) {
  const copy = copyFor(language);
  const { ids: sourceIds } = useSourceIds();
  const [query, setQuery] = useState(initialQuery);
  const { progress } = useDemoProgress();

  return (
    <div className="spectrax-stage">
      <aside className="spectrax-aside">
        <StageLockup />
        <ViewTransition name="spectrax-aside" share="paper-fade" enter="paper-fade" exit="paper-fade" update="none" default="none">
          <div>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{messagesForUi(language).home.sloganTranslated}</p>
            <p className="mt-6 text-[16px] leading-7">{copy.asideLead}</p>
            <ol className="mt-5 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-foreground">
              {copy.asidePoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ol>
          </div>
        </ViewTransition>
      </aside>
      <div className="newsroom news-home">
        <div className="news-home-scroll">
          <div className="mx-auto w-full max-w-[40rem] px-4 pb-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <HeaderLockup />
              <div className="shrink-0">
                <LanguageSwitch language={language} />
              </div>
            </div>
            <form role="search" className="search-row mt-3" action="/search" method="get">
              <label htmlFor="home-q" className="sr-only">
                {copy.searchLabel}
              </label>
              <div className="search-pill">
                <input
                  id="home-q"
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                />
                <button type="submit" aria-label={copy.searchLabel} disabled={query.trim().length === 0}>
                  <SearchIcon />
                </button>
              </div>
            </form>
            <p className="mt-3 text-[13px] leading-[1.65] text-muted-foreground">
              {sourceIds.length === 0 ? copy.searchHintEmpty : copy.searchHintFollowed(sourceIds.length)}
            </p>
            <ScopeNav language={language} />
            <p className="mt-3 text-[13px] leading-[1.65] text-muted-foreground">{copy.scopeNote}</p>
            <p className="mt-1 text-[13px] leading-[1.65] text-muted-foreground">{copy.globalMark}</p>

            <ViewTransition name="paper-page" share="paper-fade" enter="paper-fade" exit="paper-fade" update="none" default="none">
              <div className="mt-4">
                {progress ? (
                  <div className="mb-4">
                    <SearchProgressCard progress={progress} language={language} />
                  </div>
                ) : null}
                <ol className="space-y-4">
                  {cards.map((card) => (
                    <li key={card.sampleKind + (card.bundleId ?? "layout")}>
                      <EventCard card={card} copy={copy} />
                    </li>
                  ))}
                </ol>
              </div>
            </ViewTransition>
          </div>
        </div>
        <PageDock placement="frame" language={language} />
      </div>
    </div>
  );
}

function EventCard({ card, copy }: { card: HomeCardView; copy: HomeCopy }) {
  const fictional = card.sampleKind !== "saved-fixture-links";
  const kicker = card.sampleKind === "layout-sample" ? copy.layoutKicker : fictional ? copy.demoKicker : copy.sampleKicker;
  const source =
    card.sourceName && card.sourceDate
      ? `${card.sourceName} · ${card.sourceDate}`
      : copy.noSource;
  const tone = card.sampleKind === "saved-fixture-links" ? "live" : card.sampleKind === "fictional-demo" ? "demo" : "neutral";
  return (
    <FeedCard
      title={card.title}
      href={card.storyHref}
      kicker={kicker}
      tone={tone}
      sourceLine={source}
      sourceName={card.sourceName}
      imageNote={copy.imageNote}
      heatLabel={copy.heat}
      heat={copy.heatMissing}
      verify={`${copy.verify}：${card.sampleKind === "layout-sample" ? copy.verifyLayout : copy.verifyOpen}`}
    >
      <div className="mt-4 flex flex-wrap gap-2">
        {card.perspectivesHref ? (
          <Link href={card.perspectivesHref} className="paper-action">
            {copy.openPerspectives}
          </Link>
        ) : (
          <Link href={card.storyHref} className="paper-action">
            {copy.openSample}
          </Link>
        )}
        {card.evidenceHref ? (
          <Link href={card.evidenceHref} className="paper-action-quiet">
            {copy.evidenceLink}
          </Link>
        ) : (
          <p className="text-[13px] leading-[1.55] text-muted-foreground">{copy.noAnalysis}</p>
        )}
      </div>
    </FeedCard>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

interface HomeCopy {
  searchLabel: string;
  searchPlaceholder: string;
  searchHintEmpty: string;
  searchHintFollowed: (count: number) => string;
  scopeNote: string;
  globalMark: string;
  sampleKicker: string;
  demoKicker: string;
  layoutKicker: string;
  noSource: string;
  heat: string;
  heatMissing: string;
  verify: string;
  verifyOpen: string;
  verifyLayout: string;
  evidenceLink: string;
  openPerspectives: string;
  openSample: string;
  noAnalysis: string;
  imageNote: string;
  asideLead: string;
  asidePoints: string[];
}

function copyFor(language: UiLanguage): HomeCopy {
  if (language === "zh-Hant") {
    return {
      searchLabel: "搜索已關注來源",
      searchPlaceholder: "搜索標題",
      searchHintEmpty: "還沒有選中來源。請先到訂閱頁的來源關注裡選擇，再搜索標題。",
      searchHintFollowed: (count) => `提交後只搜索已關注的 ${count} 個來源的標題，不搜資料庫，也不抓正文。`,
      scopeNote: "For You 是按已關注來源整理的預生成示例，不是即時推薦。Locate 按地區瀏覽來源，不請求定位。",
      globalMark: "演示示例 · 非即時",
      sampleKicker: "示例",
      demoKicker: "虛構",
      layoutKicker: "虛構佈局樣例",
      noSource: "無來源 · 無日期",
      heat: "熱度",
      heatMissing: "暫無數據",
      verify: "核實",
      verifyOpen: "未判斷整件事",
      verifyLayout: "不適用",
      evidenceLink: "具體主張",
      openPerspectives: "打開觀點",
      openSample: "打開這篇樣本",
      noAnalysis: "沒有分析頁",
      imageNote: "公開授權的主題配圖，不是這篇報導的原圖。",
      asideLead: "桌面把現有首頁收在一張紙色卡片裡。窄屏則鋪滿寬度。卡片仍是倉庫裡的示例，不是新的話題。",
      asidePoints: [
        "字標仍是 SpectraX。搜索提交後打開結果頁，只讀訂閱裡選中的來源標題。",
        "All 展示現有卡片。For You 和 Locate 各自打開一頁，仍是預生成示例和地區瀏覽。",
        "底部選單是首頁、資料庫、訂閱、我的。方案和登入是可點開的演示，不會扣款，也不會登入成功。來源關注只留在這台瀏覽器。熱度寫「暫無數據」。",
      ],
    };
  }
  if (language === "zh") {
    return {
      searchLabel: "搜索已关注来源",
      searchPlaceholder: "搜索标题",
      searchHintEmpty: "还没有选中来源。请先到订阅页的来源关注里选择，再搜索标题。",
      searchHintFollowed: (count) => `提交后只搜索已关注的 ${count} 个来源的标题，不搜资料库，也不抓正文。`,
      scopeNote: "For You 是按已关注来源整理的预生成示例，不是实时推荐。Locate 按地区浏览来源，不请求定位。",
      globalMark: "演示示例 · 非实时",
      sampleKicker: "示例",
      demoKicker: "虚构",
      layoutKicker: "虚构布局样例",
      noSource: "无来源 · 无日期",
      heat: "热度",
      heatMissing: "暂无数据",
      verify: "核实",
      verifyOpen: "未判断整件事",
      verifyLayout: "不适用",
      evidenceLink: "具体主张",
      openPerspectives: "打开观点",
      openSample: "打开这篇样本",
      noAnalysis: "没有分析页",
      imageNote: "公开授权的主题配图，不是这篇报道的原图。",
      asideLead: "桌面把现有首页收在一张纸色卡片里。窄屏则铺满宽度。卡片仍是仓库里的示例，不是新的话题。",
      asidePoints: [
        "字标仍是 SpectraX。搜索提交后打开结果页，只读订阅里选中的来源标题。",
        "All 展示现有卡片。For You 和 Locate 各自打开一页，仍是预生成示例和地区浏览。",
        "底部菜单是首页、资料库、订阅、我的。方案和登录是可点开的演示，不会扣款，也不会登录成功。来源关注只留在这台浏览器。热度写「暂无数据」。",
      ],
    };
  }
  return {
    searchLabel: "Search followed sources",
    searchPlaceholder: "Search titles",
    searchHintEmpty: "No sources selected yet. Choose some under Followed sources on Subscribe, then search titles.",
    searchHintFollowed: (count) => `Submit to search titles from the ${count} sources you follow. It does not search the library or fetch articles.`,
    scopeNote: "For You groups pre-generated samples by the sources you follow. It is not a live recommendation. Locate browses sources by region and does not ask for your location.",
    globalMark: "Sample · not live",
    sampleKicker: "Sample",
    demoKicker: "Fictional",
    layoutKicker: "Fictional layout sample",
    noSource: "No source · no date",
    heat: "Heat",
    heatMissing: "No data yet",
    verify: "Check",
    verifyOpen: "No verdict on the whole event",
    verifyLayout: "Not applicable",
    evidenceLink: "Specific claims",
    openPerspectives: "Open perspectives",
    openSample: "Open this sample",
    noAnalysis: "No analysis page",
    imageNote: "Openly licensed thematic photo, not a picture from this article.",
    asideLead: "On a wide screen the existing home sits in a paper card. On a narrow screen it uses the full width. The cards are still the repository samples.",
    asidePoints: [
      "The wordmark stays SpectraX. Search opens a results page and reads only titles from sources selected on Subscribe.",
      "All shows those cards. For You and Locate each open a page: a pre-generated grouping, and region browsing.",
      "The bottom menu is Home, Library, Subscribe, and Me. Plans and sign-in are walkable demos: nothing is charged, and sign-in cannot succeed. Followed sources stay in this browser. Heat says there is no data.",
    ],
  };
}
