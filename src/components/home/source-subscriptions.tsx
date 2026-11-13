"use client";

import Image from "next/image";
import { NEWS_SOURCES, SOURCE_CATEGORIES } from "@/lib/sources/catalog";
import { defaultSourceIds } from "@/lib/sources/subscriptions";
import { useSourceIds } from "@/lib/sources/use-source-ids";
import type { Language } from "@/lib/i18n/languages";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-of-accent";

export function SourceSubscriptions({ language }: { language: Language }) {
  const zh = language === "zh";
  const { ids: selectedIds, setIds } = useSourceIds();

  function toggle(id: string) {
    setIds(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  return (
    <section id="source-subscriptions" aria-labelledby="source-subscriptions-title" className="mt-6">
      <div className="rounded-2xl border border-of-cream-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs tracking-[0.16em] text-of-accent">01 / SOURCES</p>
          <span className="rounded-full border border-of-cream-border bg-of-cream/40 px-3 py-1 text-xs text-of-accent">
            {zh ? `已选 ${selectedIds.length}/${NEWS_SOURCES.length}` : `${selectedIds.length}/${NEWS_SOURCES.length} selected`}
          </span>
        </div>
        <h2 id="source-subscriptions-title" className="mt-2 text-[1.35rem] font-bold">
          {zh ? "订阅来源" : "Subscribed sources"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#3a342c]">
          {zh
            ? "点击来源卡片选中或取消。取消后该来源变灰，资料库的新闻发现默认不再检索它。"
            : "Tap a source to subscribe or unsubscribe. Unsubscribed sources turn gray and are left out of the library news discovery by default."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setIds(defaultSourceIds())} className={`min-h-9 rounded-full border border-border px-3 text-xs hover:border-of-accent ${focusClass}`}>
            {zh ? "全部选中" : "Select all"}
          </button>
          <button type="button" onClick={() => setIds([])} className={`min-h-9 rounded-full border border-border px-3 text-xs hover:border-of-accent ${focusClass}`}>
            {zh ? "全部取消" : "Clear all"}
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-muted-foreground">
          {selectedIds.length === 0
            ? zh ? "当前没有选中任何来源，新闻发现会提示先选择来源。" : "No sources selected. News discovery will ask you to pick one first."
            : zh ? "选择只保存在当前浏览器，不上传，也不代表与来源建立正式订阅。" : "Choices stay in this browser. They are not uploaded and are not a formal subscription with any outlet."}
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
                <h3 id={`category-${category.id}`} className="text-sm font-bold text-of-accent">
                  {zh ? category.label : category.labelEn}
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
                        className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-[border-color,background-color,opacity] ${focusClass} ${
                          active ? "border-of-accent bg-of-cream/40" : "border-border bg-transparent opacity-60 hover:opacity-90"
                        }`}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border ${active ? "border-of-cream-border bg-white" : "border-border bg-white grayscale"}`}>
                          <Image src={source.logo} alt="" width={32} height={32} className="size-8 object-contain" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm font-medium ${active ? "" : "text-muted-foreground"}`}>{source.name}</span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{source.domain} · {source.access === "official_rss" ? (zh ? "官方 RSS" : "Official RSS") : "Google RSS"}</span>
                        </span>
                        <span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${active ? "border-of-accent bg-of-accent text-of-accent-foreground" : "border-border text-transparent"}`}>
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
