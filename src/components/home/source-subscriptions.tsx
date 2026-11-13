"use client";

import { useEffect } from "react";
import Image from "next/image";
import { NEWS_SOURCES, SOURCE_CATEGORIES, sourceTitle, type SourceCategory } from "@/lib/sources/catalog";
import { defaultSourceIds } from "@/lib/sources/subscriptions";
import { useSourceIds } from "@/lib/sources/use-source-ids";
import type { UiLanguage } from "@/lib/i18n/ui-language";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-of-accent";

type Script = "zh" | "zh-Hant" | "en";

interface SourceCopy {
  badge: string;
  count: (selected: number, total: number) => string;
  title: string;
  intro: string;
  selectAll: string;
  clearAll: string;
  empty: string;
  saved: string;
  officialRss: string;
  googleRss: string;
  notAPlan: string;
  categoryLabel: (category: SourceCategory) => string;
}

function scriptOf(language: UiLanguage): Script {
  if (language === "zh" || language === "zh-Hant") return language;
  return "en";
}

function categoryLabel(category: SourceCategory, script: Script) {
  const entry = SOURCE_CATEGORIES.find((item) => item.id === category);
  if (!entry) return category;
  if (script === "zh-Hant") return entry.labelHant;
  return script === "zh" ? entry.label : entry.labelEn;
}

const COPY: Record<Script, SourceCopy> = {
  zh: {
    badge: "本机选择",
    count: (selected, total) => `已选 ${selected}/${total}`,
    title: "来源关注",
    intro: "点击来源卡片选中或取消。取消后该来源变灰，首页搜索默认不再检索它。",
    selectAll: "全部选中",
    clearAll: "全部取消",
    empty: "当前没有选中任何来源。首页搜索会提示先来这里选择。",
    saved: "选择只保存在当前浏览器，不上传，也不代表与来源建立正式订阅。",
    officialRss: "官方 RSS",
    googleRss: "Google RSS",
    notAPlan: "这不是方案，不会收费；它只决定默认关注哪些来源。",
    categoryLabel: (category) => categoryLabel(category, "zh"),
  },
  "zh-Hant": {
    badge: "本機選擇",
    count: (selected, total) => `已選 ${selected}/${total}`,
    title: "來源關注",
    intro: "點擊來源卡片選中或取消。取消後該來源變灰，首頁搜索預設不再檢索它。",
    selectAll: "全部選中",
    clearAll: "全部取消",
    empty: "目前沒有選中任何來源。首頁搜索會提示先來這裡選擇。",
    saved: "選擇只保存在當前瀏覽器，不上傳，也不代表與來源建立正式訂閱。",
    officialRss: "官方 RSS",
    googleRss: "Google RSS",
    notAPlan: "這不是方案，不會收費；它只決定預設關注哪些來源。",
    categoryLabel: (category) => categoryLabel(category, "zh-Hant"),
  },
  en: {
    badge: "On this browser",
    count: (selected, total) => `${selected}/${total} selected`,
    title: "Followed sources",
    intro: "Tap a source to follow or unfollow it. Unfollowed sources turn gray and are left out of home search by default.",
    selectAll: "Select all",
    clearAll: "Clear all",
    empty: "No sources selected. Home search will ask you to choose some here first.",
    saved: "Choices stay in this browser. They are not uploaded and are not a formal subscription with any outlet.",
    officialRss: "Official RSS",
    googleRss: "Google RSS",
    notAPlan: "These are not plans and cost nothing. They only set which sources are followed by default.",
    categoryLabel: (category) => categoryLabel(category, "en"),
  },
};

export function SourceSubscriptions({ language }: { language: UiLanguage }) {
  const copy = COPY[scriptOf(language)];
  const { ids: selectedIds, setIds } = useSourceIds();

  function toggle(id: string) {
    setIds(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  useEffect(() => {
    if (window.location.hash !== "#source-subscriptions") return;
    document.getElementById("source-subscriptions")?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <section id="source-subscriptions" aria-labelledby="source-subscriptions-title" className="mt-6">
      <div className="topic-card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 id="source-subscriptions-title" className="text-[1.25rem] font-bold">{copy.title}</h2>
          <span className="lav-badge">{copy.badge}</span>
        </div>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{copy.intro}</p>
        <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{copy.notAPlan}</p>
        <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{copy.count(selectedIds.length, NEWS_SOURCES.length)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setIds(defaultSourceIds())} className={`scope-pill ${focusClass}`}>
            {copy.selectAll}
          </button>
          <button type="button" onClick={() => setIds([])} className={`scope-pill ${focusClass}`}>
            {copy.clearAll}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-3 text-[13px] leading-6 text-muted-foreground">
          {selectedIds.length === 0 ? copy.empty : copy.saved}
        </p>
      </div>

      <div className="mt-5 space-y-5">
        {SOURCE_CATEGORIES.map((category) => {
          const sources = NEWS_SOURCES.filter((source) => source.category === category.id);
          if (sources.length === 0) return null;
          const activeCount = sources.filter((source) => selectedIds.includes(source.id)).length;
          return (
            <section key={category.id} aria-labelledby={`category-${category.id}`}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`category-${category.id}`} className="text-[15px] font-bold text-foreground">
                  {copy.categoryLabel(category.id)}
                </h3>
                <span className="text-xs text-muted-foreground">{activeCount}/{sources.length}</span>
              </div>
              <ul className="mt-2 grid gap-2">
                {sources.map((source) => {
                  const active = selectedIds.includes(source.id);
                  return (
                    <li key={source.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggle(source.id)}
                        className={`flex min-h-14 w-full items-center gap-3 rounded-[1.15rem] border p-3 text-left transition-[border-color,background-color] ${focusClass} ${
                          active ? "border-[#e4d48a] bg-card" : "border-border bg-transparent text-[#5c564c]"
                        }`}
                      >
                        <span className={`grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border ${active ? "border-[#eadfce] bg-white" : "border-border bg-white grayscale"}`}>
                          <Image src={source.logo} alt="" width={32} height={32} className="size-8 object-contain" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[15px] font-medium leading-6 ${active ? "" : "text-muted-foreground"}`}>{sourceTitle(source, language)}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{source.domain} · {source.access === "official_rss" ? copy.officialRss : copy.googleRss}</span>
                        </span>
                        <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${active ? "border-[#e4d48a] bg-[#f3e6a4] text-[#1c1915]" : "border-border text-transparent"}`}>
                          ✓
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
