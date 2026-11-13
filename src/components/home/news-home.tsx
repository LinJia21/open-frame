"use client";

import { startTransition, useRef, useState, ViewTransition, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomeCardView } from "@/lib/home/feed";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { HeaderLockup, StageLockup } from "@/components/layout/brand-lockup";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { messagesForUi } from "@/lib/i18n/messages";
import { PageDock } from "@/components/layout/page-dock";
import { NEWS_SOURCES, sourceTitle } from "@/lib/sources/catalog";
import { useSourceIds } from "@/lib/sources/use-source-ids";
import type { NewsDiscoveryResult } from "@/lib/sources/types";
import { StoryFigure } from "@/components/media/story-figure";
import { SearchProgressCard } from "@/components/home/search-progress-card";
import { PREPARED_REPORT_HREF, matchPreparedTopic } from "@/lib/demo/topic-match";
import { readDemoProgress } from "@/lib/home/demo-progress";
import { useDemoProgress } from "@/lib/home/use-demo-progress";

const TABS = [
  { id: "all", label: "All" },
  { id: "foryou", label: "For You" },
  { id: "locate", label: "Locate" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SOURCE_SWATCHES = [
  "var(--of-cream)",
  "var(--of-live)",
  "var(--of-neutral)",
  "var(--of-cream-border)",
  "var(--of-mark)",
];

export function NewsHome({
  cards,
  initialQuery,
  initialTab,
  language,
}: {
  cards: HomeCardView[];
  initialQuery: string;
  initialTab: TabId;
  language: UiLanguage;
}) {
  const copy = copyFor(language);
  const router = useRouter();
  const { ids: sourceIds } = useSourceIds();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<NewsDiscoveryResult | null>(null);
  const [searchError, setSearchError] = useState<"none" | "failed" | null>(null);
  const requestRef = useRef(0);
  const { progress, setProgress } = useDemoProgress();

  function onTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : (index + TABS.length - 1) % TABS.length;
    const id = TABS[next]?.id ?? "all";
    startTransition(() => setTab(id));
    document.getElementById(`tab-${id}`)?.focus();
  }

  async function runSearch() {
    const q = query.trim();
    const ticket = requestRef.current + 1;
    requestRef.current = ticket;
    setTab("all");
    if (!q) {
      setPending(false);
      setSearched(false);
      setResult(null);
      setSearchError(null);
      return;
    }
    const prepared = matchPreparedTopic(q);
    if (prepared) {
      router.push(PREPARED_REPORT_HREF[prepared]);
      return;
    }
    setSearched(true);
    setResult(null);
    if (sourceIds.length === 0) {
      setPending(false);
      setSearchError("none");
      return;
    }
    const started = { query: q, sourceIds: [...sourceIds], startedAt: Date.now() };
    setProgress(started);
    setPending(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/news?q=${encodeURIComponent(q)}&sources=${encodeURIComponent(sourceIds.join(","))}`);
      const payload = (await response.json()) as { ok?: boolean; data?: NewsDiscoveryResult };
      if (ticket !== requestRef.current) return;
      startTransition(() => {
        if (ticket !== requestRef.current) return;
        setPending(false);
        if (!response.ok || !payload.ok || !payload.data) {
          setResult(null);
          setSearchError("failed");
          return;
        }
        setSearchError(null);
        setResult(payload.data);
        const found = [...new Set(payload.data.items.map((item) => item.sourceId))];
        const current = readDemoProgress(window.localStorage);
        if (found.length > 0 && current?.query === q) {
          setProgress({ ...current, sourceIds: found });
        }
      });
    } catch {
      if (ticket !== requestRef.current) return;
      startTransition(() => {
        if (ticket !== requestRef.current) return;
        setPending(false);
        setResult(null);
        setSearchError("failed");
      });
    }
  }

  const emptyDone = searched && !pending && searchError === null && result !== null && result.items.length === 0;

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
            <form
              role="search"
              className="search-row mt-3"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void runSearch();
              }}
            >
              <label htmlFor="home-q" className="sr-only">
                {copy.searchLabel}
              </label>
              <div className="search-pill">
                <input
                  id="home-q"
                  name="q"
                  value={query}
                  onChange={(event) => {
                    const next = event.target.value;
                    setQuery(next);
                    if (!next.trim()) {
                      startTransition(() => {
                        setSearched(false);
                        setResult(null);
                        setSearchError(null);
                      });
                    }
                  }}
                  placeholder={copy.searchPlaceholder}
                />
                <button type="submit" aria-label={copy.searchLabel} disabled={pending}>
                  <SearchIcon />
                </button>
              </div>
            </form>
            <p className="mt-3 text-[13px] leading-[1.65] text-muted-foreground">
              {sourceIds.length === 0 ? copy.searchHintEmpty : copy.searchHintFollowed(sourceIds.length)}
            </p>
            <div role="tablist" aria-label={copy.tabsLabel} onKeyDown={onTabsKeyDown} className="scope-row">
              {TABS.map((item) => {
                const selected = tab === item.id;
                const unavailable = item.id !== "all";
                return (
                  <button
                    key={item.id}
                    id={`tab-${item.id}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`panel-${item.id}`}
                    aria-describedby={unavailable ? "scope-unavailable" : undefined}
                    data-unavailable={unavailable ? "true" : undefined}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => startTransition(() => setTab(item.id))}
                    className="scope-pill"
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p id="scope-unavailable" className="mt-3 text-[13px] leading-[1.65] text-muted-foreground">
              {copy.scopeNote}
            </p>
            <p className="mt-1 text-[13px] leading-[1.65] text-muted-foreground">{copy.globalMark}</p>

            <ViewTransition
              key={`${tab}:${searched ? (pending ? "wait" : (searchError ?? "done")) : "feed"}`}
              name="paper-page"
              share="paper-fade"
              enter="paper-fade"
              exit="paper-fade"
              update="none"
              default="none"
            >
            <div id="panel-all" role="tabpanel" aria-labelledby="tab-all" hidden={tab !== "all"} className="mt-4">
              {emptyDone ? (
                <div className="mb-4">
                  <SearchResults
                    copy={copy}
                    language={language}
                    pending={pending}
                    error={searchError}
                    result={result}
                    onRetry={() => void runSearch()}
                  />
                </div>
              ) : null}
              {progress ? (
                <div className="mb-4">
                  <SearchProgressCard progress={progress} language={language} />
                </div>
              ) : null}
              {tab === "all" && searched && !emptyDone ? (
                <SearchResults
                  copy={copy}
                  language={language}
                  pending={pending}
                  error={searchError}
                  result={result}
                  onRetry={() => void runSearch()}
                />
              ) : null}
              {tab === "all" && !searched ? (
                <ol className="space-y-4">
                  {cards.map((card) => (
                    <li key={card.sampleKind + (card.bundleId ?? "layout")}>
                      <EventCard card={card} copy={copy} />
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
            <div id="panel-foryou" role="tabpanel" aria-labelledby="tab-foryou" hidden={tab !== "foryou"} className="mt-4">
              {tab === "foryou" ? <Unavailable title={copy.forYouTitle} body={copy.forYouBody} /> : null}
            </div>
            <div id="panel-locate" role="tabpanel" aria-labelledby="tab-locate" hidden={tab !== "locate"} className="mt-4">
              {tab === "locate" ? <Unavailable title={copy.locateTitle} body={copy.locateBody} /> : null}
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
  const titleClass = "text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground";
  return (
    <article className="topic-card">
      <StoryFigure title={card.title} note={copy.imageNote} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-[1.35rem] font-bold leading-[1.35] text-foreground">
          {card.perspectivesHref ? (
            <Link href={card.perspectivesHref} className={titleClass}>
              {card.title}
            </Link>
          ) : (
            card.title
          )}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-[13px] leading-[1.4] text-muted-foreground">
            <span className="sr-only">{copy.heat} </span>
            {copy.heatMissing}
          </p>
          <span className="lav-badge" data-tone={card.sampleKind === "saved-fixture-links" ? "live" : card.sampleKind === "fictional-demo" ? "demo" : "neutral"}>
            {kicker}
          </span>
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-[1.7] text-foreground">
        <span className="lav-kicker">{kicker}</span> {source}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-[14px] leading-[1.5] text-foreground">
          <SourceMark name={card.sourceName} />
          <span className="min-w-0">{source}</span>
        </p>
        {card.evidenceHref ? (
          <Link href={card.evidenceHref} className="paper-action-quiet">
            {copy.evidenceLink}
          </Link>
        ) : (
          <button type="button" className="closed-action" disabled>
            {copy.noAnalysis}
          </button>
        )}
      </div>
      {card.perspectivesHref ? (
        <Link href={card.perspectivesHref} className="paper-action mt-3 w-full">
          {copy.openPerspectives}
        </Link>
      ) : null}
      <p className="mt-3 text-[13px] leading-[1.55] text-muted-foreground">
        {copy.verify}：{card.sampleKind === "layout-sample" ? copy.verifyLayout : copy.verifyOpen}
      </p>
    </article>
  );
}

function SourceMark({ name }: { name: string | null }) {
  if (!name) return null;
  const swatch = SOURCE_SWATCHES[name.charCodeAt(0) % SOURCE_SWATCHES.length] ?? SOURCE_SWATCHES[0];
  return (
    <span className="source-mark" style={{ background: swatch }} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <section className="topic-card">
      <h2 className="text-[1.35rem] font-bold leading-[1.35] text-foreground">{title}</h2>
      <p className="mt-3 text-[16px] leading-[1.65] text-foreground">{body}</p>
    </section>
  );
}

function SearchResults({
  copy,
  language,
  pending,
  error,
  result,
  onRetry,
}: {
  copy: HomeCopy;
  language: UiLanguage;
  pending: boolean;
  error: "none" | "failed" | null;
  result: NewsDiscoveryResult | null;
  onRetry: () => void;
}) {
  if (pending) {
    return (
      <section className="topic-card" aria-busy="true" role="status">
        <h2 className="text-[1.25rem] font-bold">{copy.searching}</h2>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{copy.searchingBody}</p>
      </section>
    );
  }
  if (error === "none") {
    return (
      <section className="topic-card" role="status">
        <h2 className="text-[1.25rem] font-bold">{copy.noSourcesTitle}</h2>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{copy.noSources}</p>
        <Link href="/subscribe#source-subscriptions" className="paper-action mt-4 w-full">
          {copy.chooseSources}
        </Link>
      </section>
    );
  }
  if (error === "failed") {
    return (
      <section className="topic-card" role="alert">
        <h2 className="text-[1.25rem] font-bold">{copy.searchFailedTitle}</h2>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{copy.searchFailed}</p>
        <button type="button" className="paper-action mt-4 w-full" onClick={onRetry}>
          {copy.retry}
        </button>
      </section>
    );
  }
  if (!result || result.items.length === 0) {
    return (
      <section className="topic-card" role="status">
        <h2 className="text-[1.25rem] font-bold">{copy.noLeadsTitle}</h2>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{copy.noLeads}</p>
      </section>
    );
  }
  return (
    <div>
      <p className="mb-3 text-[13px] leading-[1.65] text-muted-foreground">{copy.resultCount(result.items.length)}</p>
      <ol className="space-y-4">
          {result.items.map((item) => {
            const href = safeHref(item.url);
            const named = sourceTitleById(item.sourceId, item.publisher, language);
            return (
              <li key={`${item.sourceId}:${item.id}`}>
                <article className="topic-card">
                  <StoryFigure title={item.title || ""} note={copy.imageNote} />
                  <h2 className="text-[1.35rem] font-bold leading-[1.35] text-foreground">
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer noopener" className="text-foreground">
                        {item.title || copy.untitled}
                      </a>
                    ) : (
                      item.title || copy.untitled
                    )}
                  </h2>
                  <p className="mt-3 text-[15px] leading-[1.7] text-foreground">{named}{leadDate(item.publishedAt) ? ` · ${leadDate(item.publishedAt)}` : ""}</p>
                </article>
              </li>
            );
          })}
      </ol>
    </div>
  );
}

function sourceTitleById(sourceId: string, publisher: string, language: UiLanguage): string {
  const source = NEWS_SOURCES.find((item) => item.id === sourceId);
  if (source) return sourceTitle(source, language);
  return publisher || sourceId;
}

function leadDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function safeHref(value: string): string | null {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
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
  searching: string;
  searchingBody: string;
  noSourcesTitle: string;
  noSources: string;
  chooseSources: string;
  searchFailedTitle: string;
  searchFailed: string;
  retry: string;
  noLeadsTitle: string;
  noLeads: string;
  resultCount: (count: number) => string;
  untitled: string;
  tabsLabel: string;
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
  noAnalysis: string;
  imageNote: string;
  forYouTitle: string;
  forYouBody: string;
  locateTitle: string;
  locateBody: string;
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
      searching: "正在搜索已關注的來源",
      searchingBody: "只比對來源列表裡的標題，不抓正文，也不寫入資料庫。",
      noSourcesTitle: "還沒有關注來源",
      noSources: "首頁搜索只讀訂閱頁裡選中的來源。現在一個都沒有選中。",
      chooseSources: "去選擇來源",
      searchFailedTitle: "這次沒有取到結果",
      searchFailed: "來源列表沒有返回。沒有寫入資料庫，也沒有抓正文。可以再試一次。",
      retry: "再搜索一次",
      noLeadsTitle: "沒有匹配的標題",
      noLeads: "已關注來源的標題裡沒有這個詞。這次沒有去抓正文。",
      resultCount: (count) => `標題匹配 ${count} 條。這些是來源列表裡的標題，不是正文，也沒有寫入資料庫。`,
      untitled: "無標題",
      tabsLabel: "內容範圍",
      scopeNote: "For You 和 Locate 尚未開通。點開會看到說明，不會出現推薦或地點結果。",
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
      noAnalysis: "沒有分析頁",
      imageNote: "公開授權的主題配圖，不是這篇報導的原圖。",
      forYouTitle: "For You 尚未開通",
      forYouBody: "沒有關注推薦。這裡不展示推薦列表。",
      locateTitle: "Locate 尚未開通",
      locateBody: "沒有當地檢索，也不會請求定位。這裡不展示預警。",
      asideLead: "桌面把現有首頁收在一張紙色卡片裡。窄屏則鋪滿寬度。卡片仍是倉庫裡的示例，不是新的話題。",
      asidePoints: [
        "字標仍是 SpectraX。搜索讀訂閱裡選中的來源。",
        "All 展示現有卡片。For You 和 Locate 尚未開通。",
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
      searching: "正在搜索已关注的来源",
      searchingBody: "只比对来源列表里的标题，不抓正文，也不写入资料库。",
      noSourcesTitle: "还没有关注来源",
      noSources: "首页搜索只读订阅页里选中的来源。现在一个都没有选中。",
      chooseSources: "去选择来源",
      searchFailedTitle: "这次没有取到结果",
      searchFailed: "来源列表没有返回。没有写入资料库，也没有抓正文。可以再试一次。",
      retry: "再搜索一次",
      noLeadsTitle: "没有匹配的标题",
      noLeads: "已关注来源的标题里没有这个词。这次没有去抓正文。",
      resultCount: (count) => `标题匹配 ${count} 条。这些是来源列表里的标题，不是正文，也没有写入资料库。`,
      untitled: "无标题",
      tabsLabel: "内容范围",
      scopeNote: "For You 和 Locate 尚未开通。点开会看到说明，不会出现推荐或地点结果。",
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
      noAnalysis: "没有分析页",
      imageNote: "公开授权的主题配图，不是这篇报道的原图。",
      forYouTitle: "For You 尚未开通",
      forYouBody: "没有关注推荐。这里不展示推荐列表。",
      locateTitle: "Locate 尚未开通",
      locateBody: "没有当地检索，也不会请求定位。这里不展示预警。",
      asideLead: "桌面把现有首页收在一张纸色卡片里。窄屏则铺满宽度。卡片仍是仓库里的示例，不是新的话题。",
      asidePoints: [
        "字标仍是 SpectraX。搜索读订阅里选中的来源。",
        "All 展示现有卡片。For You 和 Locate 尚未开通。",
        "底部菜单是首页、资料库、订阅、我的。方案和登录是可点开的演示，不会扣款，也不会登录成功。来源关注只留在这台浏览器。热度写「暂无数据」。",
      ],
    };
  }
  return {
    searchLabel: "Search followed sources",
    searchPlaceholder: "Search titles",
    searchHintEmpty: "No sources selected yet. Choose some under Followed sources on Subscribe, then search titles.",
    searchHintFollowed: (count) => `Submit to search titles from the ${count} sources you follow. It does not search the library or fetch articles.`,
    searching: "Searching followed sources",
    searchingBody: "This compares titles in the source lists. It does not fetch articles or save them to the library.",
    noSourcesTitle: "No sources followed",
    noSources: "Home search only reads the sources selected on Subscribe. None are selected.",
    chooseSources: "Choose sources",
    searchFailedTitle: "This search did not return",
    searchFailed: "The source lists did not come back. Nothing was saved to the library, and no article was fetched. You can try again.",
    retry: "Search again",
    noLeadsTitle: "No matching titles",
    noLeads: "None of the followed sources have this in a title. Article text was not fetched.",
    resultCount: (count) => `${count} title matches. These are titles from the source lists, not articles, and they were not saved to the library.`,
    untitled: "Untitled",
    tabsLabel: "Scope",
    scopeNote: "For You and Locate are not open. Choosing one shows this notice only. There is no recommendation list and no location result.",
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
    noAnalysis: "No analysis page",
    imageNote: "Openly licensed thematic photo, not a picture from this article.",
    forYouTitle: "For You is not open",
    forYouBody: "There are no follow recommendations and no recommendation list.",
    locateTitle: "Locate is not open",
    locateBody: "There is no local search and this page does not ask for your location. There is no alert list.",
    asideLead: "On a wide screen the existing home sits in a paper card. On a narrow screen it uses the full width. The cards are still the repository samples.",
    asidePoints: [
      "The wordmark stays SpectraX. Search reads the sources selected on Subscribe.",
      "All shows those cards. For You and Locate are not open.",
      "The bottom menu is Home, Library, Subscribe, and Me. Plans and sign-in are walkable demos: nothing is charged, and sign-in cannot succeed. Followed sources stay in this browser. Heat says there is no data.",
    ],
  };
}
