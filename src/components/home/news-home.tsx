"use client";

import { useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import type { HomeCardView } from "@/lib/home/feed";
import type { Language } from "@/lib/i18n/languages";

const TABS = [
  { id: "all", label: "All" },
  { id: "foryou", label: "For You" },
  { id: "locate", label: "Locate" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function NewsHome({
  cards,
  initialQuery,
  initialTab,
  language,
}: {
  cards: HomeCardView[];
  initialQuery: string;
  initialTab: TabId;
  language: Language;
}) {
  const copy = copyFor(language);
  const [tab, setTab] = useState<TabId>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return cards;
    return cards.filter((card) => `${card.title}\n${card.sourceName ?? ""}`.toLowerCase().includes(needle));
  }, [cards, query]);

  function onTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TABS.findIndex((item) => item.id === tab);
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : (index + TABS.length - 1) % TABS.length;
    const id = TABS[next]?.id ?? "all";
    setTab(id);
    document.getElementById(`tab-${id}`)?.focus();
  }

  return (
    <div className="newsroom news-home">
      <div className="mx-auto w-full max-w-[40rem] px-5 pb-8 pt-6">
        <form
          role="search"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setTab("all");
          }}
        >
          <label htmlFor="home-q" className="sr-only">
            {copy.searchLabel}
          </label>
          <div className="relative">
            <SearchIcon />
            <input
              id="home-q"
              name="q"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setTab("all");
              }}
              placeholder={copy.searchPlaceholder}
              className="w-full rounded-sm border border-[#c4baab] bg-white py-2.5 pl-11 pr-3 text-[16px] leading-[1.65] text-[#1c1915] placeholder:text-[#6b645b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1c1915]"
            />
          </div>
          <p className="mt-2 text-[13px] leading-[1.65] text-[#3a342c]">{copy.searchHint}</p>
        </form>

        <div
          role="tablist"
          aria-label={copy.tabsLabel}
          onKeyDown={onTabsKeyDown}
          className="mt-6 flex gap-6 border-b border-[#e4ddd2]"
        >
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.id)}
                className={`-mb-px border-b-2 pb-2 text-[16px] leading-[1.4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1c1915] ${
                  selected ? "border-[#1c1915] font-medium text-[#1c1915]" : "border-transparent text-[#3a342c] hover:text-[#1c1915]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-[13px] leading-[1.65] text-[#3a342c]">{copy.globalMark}</p>

        <div id="panel-all" role="tabpanel" aria-labelledby="tab-all" hidden={tab !== "all"} className="mt-2">
          {tab === "all" ? (
            visible.length === 0 ? (
              <p className="py-6 text-[16px] leading-[1.65] text-[#1c1915]">{copy.noMatch}</p>
            ) : (
              <ol>
                {visible.map((card) => (
                  <li key={card.sampleKind + (card.bundleId ?? "layout")} className="border-b border-[#e4ddd2] py-6">
                    <EventCard card={card} copy={copy} />
                  </li>
                ))}
              </ol>
            )
          ) : null}
        </div>
        <div id="panel-foryou" role="tabpanel" aria-labelledby="tab-foryou" hidden={tab !== "foryou"} className="mt-2">
          {tab === "foryou" ? <Unavailable title={copy.forYouTitle} body={copy.forYouBody} /> : null}
        </div>
        <div id="panel-locate" role="tabpanel" aria-labelledby="tab-locate" hidden={tab !== "locate"} className="mt-2">
          {tab === "locate" ? <Unavailable title={copy.locateTitle} body={copy.locateBody} /> : null}
        </div>
      </div>
      <nav aria-label={copy.bottomLabel} className="border-t border-[#e4ddd2]">
        <div className="mx-auto grid max-w-[40rem] grid-cols-4 items-center px-5 py-4">
          <div className="col-span-3 flex items-center justify-around text-[#9a9388]" role="group" aria-label={copy.pendingGroup}>
            <MarkIcon />
            <LinesIcon />
            <SquareIcon />
          </div>
          <Link
            href="/settings"
            className="text-center text-[16px] font-medium leading-[1.4] text-[#1c1915] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1c1915]"
          >
            {copy.settings}
          </Link>
        </div>
        <p className="mx-auto max-w-[40rem] px-5 pb-5 text-center text-[13px] leading-[1.65] text-[#3a342c]">{copy.pendingNote}</p>
      </nav>
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
  const titleClass =
    "text-[22px] font-medium leading-[1.4] text-[#1c1915] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1c1915] hover:underline hover:decoration-[#1c1915]/40 hover:underline-offset-4";
  return (
    <article>
      <p className="text-[13px] leading-[1.65] text-[#3a342c]">{kicker}</p>
      <h2 className="mt-2 text-[22px] font-medium leading-[1.4] text-[#1c1915]">
        {card.perspectivesHref ? (
          <Link href={card.perspectivesHref} className={titleClass}>
            {card.title}
          </Link>
        ) : (
          card.title
        )}
      </h2>
      <p className="mt-3 text-[16px] leading-[1.65] text-[#1c1915]">
        {card.sourceName && card.sourceDate ? (
          <>
            {card.sourceName}
            <span className="whitespace-nowrap"> · {card.sourceDate}</span>
          </>
        ) : (
          source
        )}
      </p>
      <dl className="mt-4 flex gap-10 text-[16px] leading-[1.65] text-[#1c1915]">
        <div>
          <dt className="text-[13px] leading-[1.65] text-[#3a342c]">{copy.heat}</dt>
          <dd>{copy.heatMissing}</dd>
        </div>
        <div>
          <dt className="text-[13px] leading-[1.65] text-[#3a342c]">{copy.verify}</dt>
          <dd>{card.sampleKind === "layout-sample" ? copy.verifyLayout : copy.verifyOpen}</dd>
          {card.evidenceHref ? (
            <dd className="mt-1">
              <Link
                href={card.evidenceHref}
                className="text-[13px] leading-[1.65] text-[#1c1915] underline decoration-[#1c1915]/40 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1c1915]"
              >
                {copy.evidenceLink}
              </Link>
            </dd>
          ) : null}
        </div>
      </dl>
    </article>
  );
}

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <section className="border-b border-[#e4ddd2] py-6">
      <h2 className="text-[22px] font-medium leading-[1.4] text-[#1c1915]">{title}</h2>
      <p className="mt-3 text-[16px] leading-[1.65] text-[#1c1915]">{body}</p>
    </section>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-[#3a342c]">
      <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path d="M7 4.5h7.5L19 9v10.5H7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.2 4.7V9H18.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LinesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path d="M5 7.5h14M5 12h14M5 16.5h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <rect x="5" y="5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

interface HomeCopy {
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  tabsLabel: string;
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
  bottomLabel: string;
  pendingGroup: string;
  pendingNote: string;
  settings: string;
}

function copyFor(language: Language): HomeCopy {
  if (language === "zh") {
    return {
      searchLabel: "筛选本页示例",
      searchPlaceholder: "筛选标题",
      searchHint: "只筛选本页示例，不搜索互联网或资料库。",
      tabsLabel: "内容范围",
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
      bottomLabel: "底部入口",
      pendingGroup: "导航待确认，这三个图标没有名称，不能点击",
      pendingNote: "导航待确认。前三个图标没有名称，也不能点。",
      settings: "设置",
    };
  }
  return {
    searchLabel: "Filter samples on this page",
    searchPlaceholder: "Filter titles",
    searchHint: "Filters the samples on this page only. It does not search the web or the saved library.",
    tabsLabel: "Scope",
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
    bottomLabel: "Bottom entries",
    pendingGroup: "Navigation not confirmed. These three icons have no name and are not clickable.",
    pendingNote: "导航待确认. The first three icons have no name and cannot be used.",
    settings: "设置",
  };
}
