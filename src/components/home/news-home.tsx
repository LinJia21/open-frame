"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomeCardView } from "@/lib/home/feed";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { toAnalysisLanguage } from "@/lib/i18n/ui-language";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { PageDock } from "@/components/layout/page-dock";
import { SearchProgressCard } from "@/components/home/search-progress-card";
import { PREPARED_REPORT_HREF, matchPreparedTopic } from "@/lib/demo/topic-match";
import { useDemoProgress } from "@/lib/home/use-demo-progress";
import { postAnalysis } from "@/components/home/post-analysis";

const TABS = [
  { id: "all", label: "All" },
  { id: "foryou", label: "For You" },
  { id: "locate", label: "Locate" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type SearchError = "none" | "failed" | "demo" | null;

interface SavedHit {
  id: string;
  outlet: string;
  title: string;
  publishedAt: string | null;
  originalUrl: string;
}

interface CorpusSearchPayload {
  ok?: boolean;
  data?: { items?: SavedHit[] };
}

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
  const [tab, setTab] = useState<TabId>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<SavedHit[]>([]);
  const [searchError, setSearchError] = useState<SearchError>(null);
  const { progress, setProgress, clearProgress } = useDemoProgress();

  function onTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : (index + TABS.length - 1) % TABS.length;
    const id = TABS[next]?.id ?? "all";
    setTab(id);
    document.getElementById(`tab-${id}`)?.focus();
  }

  async function runSearch() {
    const q = query.trim();
    setTab("all");
    if (!q) {
      setSearched(false);
      setHits([]);
      setSearchError(null);
      clearProgress();
      return;
    }
    const prepared = matchPreparedTopic(q);
    if (prepared) {
      clearProgress();
      router.push(PREPARED_REPORT_HREF[prepared]);
      return;
    }
    setSearched(true);
    setHits([]);
    setSearchError(null);
    setPending(true);
    const startedAt = Date.now();
    setProgress({ query: q, sourceIds: [], startedAt });
    try {
      const corpus = await fetch(`/api/corpus?q=${encodeURIComponent(q)}`);
      const payload = (await corpus.json()) as CorpusSearchPayload;
      const items = corpus.ok && payload.ok && payload.data?.items ? payload.data.items : null;
      if (!items) {
        clearProgress();
        setSearchError("failed");
        return;
      }
      if (items.length === 0) {
        clearProgress();
        setSearchError("none");
        return;
      }
      const picked = items.slice(0, 8);
      setHits(picked);
      const outlets = [...new Set(picked.map((item) => item.outlet))].slice(0, 12);
      setProgress({ query: q, sourceIds: [], outlets, startedAt });

      let live = false;
      try {
        const status = await fetch("/api/provider", { cache: "no-store" });
        const statusPayload = (await status.json()) as {
          ok?: boolean;
          data?: { provider?: string; keyPresent?: boolean; networkEnabled?: boolean };
        };
        live =
          status.ok &&
          statusPayload.ok === true &&
          statusPayload.data?.provider === "cursor" &&
          statusPayload.data.keyPresent === true &&
          statusPayload.data.networkEnabled === true;
      } catch {
        live = false;
      }
      if (!live) {
        clearProgress();
        setSearchError("demo");
        return;
      }

      const posted = await postAnalysis({
        query: q,
        language: toAnalysisLanguage(language),
        intent: "saved",
        sourceIds: picked.map((item) => item.id),
      });
      if (!posted.ok) {
        clearProgress();
        const token = posted.reason === "http" ? posted.token : undefined;
        setSearchError(token === "saved_analysis_needs_cursor" || token === "config_not_ready" || token === "network_disabled" ? "demo" : "failed");
        return;
      }
      router.push(posted.href);
    } catch {
      clearProgress();
      setSearchError("failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="spectrax-stage">
      <aside className="spectrax-aside">
        <p className="wordmark text-[3.25rem]">SpectraX</p>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">See Beyond the Headlines</p>
        <p className="mt-6 text-[16px] leading-7">{copy.asideLead}</p>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-foreground">
          {copy.asidePoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
      </aside>
      <div className="newsroom news-home">
        <div className="news-home-scroll">
          <div className="mx-auto w-full max-w-[40rem] px-4 pb-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="wordmark shrink-0 text-[1.85rem] text-foreground">
                SpectraX
              </Link>
              <LanguageSwitch language={language} />
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
                      setSearched(false);
                      setHits([]);
                      setSearchError(null);
                      clearProgress();
                    }
                  }}
                  placeholder={copy.searchPlaceholder}
                />
                <button type="submit" aria-label={copy.searchLabel}>
                  <SearchIcon />
                </button>
              </div>
            </form>
            <p className="mt-3 text-[13px] leading-[1.65] text-muted-foreground">{copy.searchHint}</p>
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
                    onClick={() => setTab(item.id)}
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

            <div id="panel-all" role="tabpanel" aria-labelledby="tab-all" hidden={tab !== "all"} className="mt-4">
              {progress && pending ? (
                <div className="mb-4">
                  <SearchProgressCard progress={progress} language={language} live={hits.length > 0} />
                </div>
              ) : null}
              {tab === "all" && searched ? (
                <SearchResults copy={copy} pending={pending} error={searchError} hits={hits} />
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
          <Link href={card.evidenceHref} className="evidence-pill">
            {copy.evidenceLink}
          </Link>
        ) : null}
      </div>
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
  pending,
  error,
  hits,
}: {
  copy: HomeCopy;
  pending: boolean;
  error: SearchError;
  hits: SavedHit[];
}) {
  const message = pending ? copy.searching : error === "none" ? copy.noHits : error === "failed" ? copy.searchFailed : error === "demo" ? copy.demoNotice : null;
  return (
    <div aria-busy={pending}>
      {message ? <p className="topic-card text-[16px] leading-[1.65] text-foreground">{message}</p> : null}
      {hits.length > 0 ? (
        <ol className={`space-y-4 ${message ? "mt-4" : ""}`}>
          {hits.map((item) => {
            const href = safeHref(item.originalUrl);
            return (
              <li key={item.id}>
                <article className="topic-card">
                  <h2 className="text-[1.35rem] font-bold leading-[1.35] text-foreground">
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer noopener" className="text-foreground">
                        {item.title || copy.untitled}
                      </a>
                    ) : (
                      item.title || copy.untitled
                    )}
                  </h2>
                  <p className="mt-3 text-[15px] leading-[1.7] text-foreground">
                    {item.outlet}
                    {leadDate(item.publishedAt) ? ` · ${leadDate(item.publishedAt)}` : ""}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      ) : null}
    </div>
  );
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
  searchHint: string;
  searching: string;
  noHits: string;
  demoNotice: string;
  searchFailed: string;
  untitled: string;
  tabsLabel: string;
  scopeNote: string;
  globalMark: string;
  noMatch: string;
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
      searchLabel: "搜尋資料庫",
      searchPlaceholder: "搜尋已保存的資料",
      searchHint: "搜尋已保存的資料庫。命中後會立刻用真實 AI 分析並跳到執行頁；每次搜尋會產生一次分析。",
      searching: "正在搜尋資料庫…",
      noHits: "資料庫裡沒有匹配的資料。先到資料庫導入或保存相關文章。",
      demoNotice: "資料庫裡有匹配，但目前沒有可用的 Cursor 金鑰，無法發起真實分析。以下是命中的資料。",
      searchFailed: "這次沒有取到結果。請稍後再搜尋。",
      untitled: "無標題",
      tabsLabel: "內容範圍",
      scopeNote: "For You 和 Locate 尚未開通。點開會看到說明，不會出現推薦或地點結果。",
      globalMark: "演示示例 · 非即時",
      noMatch: "本頁示例裡沒有這個詞。",
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
      forYouTitle: "For You 尚未開通",
      forYouBody: "沒有關注推薦。這裡不展示推薦列表。",
      locateTitle: "Locate 尚未開通",
      locateBody: "沒有當地檢索，也不會請求定位。這裡不展示預警。",
      asideLead: "桌面把現有首頁收在一張紙色卡片裡。窄屏則鋪滿寬度。卡片仍是倉庫裡的示例，不是新的話題。",
      asidePoints: [
        "字標仍是 SpectraX。搜尋讀取已保存的資料庫。",
        "All 展示現有卡片。For You 和 Locate 尚未開通。",
        "底部選單是首頁、資料庫、訂閱、我的。訂閱和我的尚未開通。熱度寫「暫無數據」。",
      ],
    };
  }
  if (language === "zh") {
    return {
      searchLabel: "搜索资料库",
      searchPlaceholder: "搜索已保存的资料",
      searchHint: "搜索已保存的资料库。命中后会立刻用真实 AI 分析并跳到运行页；每次搜索会产生一次分析。",
      searching: "正在搜索资料库…",
      noHits: "资料库里没有匹配的资料。先到资料库导入或保存相关文章。",
      demoNotice: "资料库里有匹配，但当前没有可用的 Cursor 密钥，无法发起真实分析。下面是命中的资料。",
      searchFailed: "这次没有取到结果。请稍后再搜索。",
      untitled: "无标题",
      tabsLabel: "内容范围",
      scopeNote: "For You 和 Locate 尚未开通。点开会看到说明，不会出现推荐或地点结果。",
      globalMark: "演示示例 · 非实时",
      noMatch: "本页示例里没有这个词。",
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
      forYouTitle: "For You 尚未开通",
      forYouBody: "没有关注推荐。这里不展示推荐列表。",
      locateTitle: "Locate 尚未开通",
      locateBody: "没有当地检索，也不会请求定位。这里不展示预警。",
      asideLead: "桌面把现有首页收在一张纸色卡片里。窄屏则铺满宽度。卡片仍是仓库里的示例，不是新的话题。",
      asidePoints: [
        "字标仍是 SpectraX。搜索读取已保存的资料库。",
        "All 展示现有卡片。For You 和 Locate 尚未开通。",
        "底部菜单是首页、资料库、订阅、我的。订阅和我的尚未开通。热度写「暂无数据」。",
      ],
    };
  }
  return {
    searchLabel: "Search the saved library",
    searchPlaceholder: "Search saved materials",
    searchHint: "Search the saved library. When something matches, a live AI analysis starts immediately and opens its run page. Each search starts one analysis.",
    searching: "Searching the saved library…",
    noHits: "No saved material matches. Import or save articles in the library first.",
    demoNotice: "The library has matches, but no Cursor key is available, so a live analysis cannot start. The matches are listed below.",
    searchFailed: "This search did not return a result. Try again later.",
    untitled: "Untitled",
    tabsLabel: "Scope",
    scopeNote: "For You and Locate are not open. Choosing one shows this notice only. There is no recommendation list and no location result.",
    globalMark: "Sample · not live",
    noMatch: "No sample on this page contains that word.",
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
    forYouTitle: "For You is not open",
    forYouBody: "There are no follow recommendations and no recommendation list.",
    locateTitle: "Locate is not open",
    locateBody: "There is no local search and this page does not ask for your location. There is no alert list.",
    asideLead: "On a wide screen the existing home sits in a paper card. On a narrow screen it uses the full width. The cards are still the repository samples.",
    asidePoints: [
      "The wordmark stays SpectraX. Search reads the saved library.",
      "All shows those cards. For You and Locate are not open.",
      "The bottom menu is Home, Library, Subscribe, and Me. Subscribe and Me are not open. Heat says there is no data.",
    ],
  };
}
