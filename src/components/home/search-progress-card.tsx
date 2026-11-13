"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NEWS_SOURCES, sourceTitle } from "@/lib/sources/catalog";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { DEMO_STEP_COUNT, DEMO_STEP_MS, demoProgressPhase, type DemoProgressSnapshot } from "@/lib/home/demo-progress";
import { PREPARED_REPORT_HREF } from "@/lib/demo/topic-match";

type Script = "zh" | "zh-Hant" | "en";

interface ProgressCopy {
  badge: string;
  title: (query: string) => string;
  estimate: string;
  foundSources: (count: number) => string;
  noSourcesYet: string;
  steps: Array<{ title: string; body: string }>;
  statusDone: string;
  statusActive: string;
  statusPending: string;
  demoNote: string;
  completed: string;
  completedNote: string;
  openSample: string;
  liveSummary: (step: number) => string;
}

const COPY: Record<Script, ProgressCopy> = {
  zh: {
    badge: "演示进度",
    title: (query) => `正在整理「${query}」`,
    estimate: "预计约 10 分钟生成报告",
    foundSources: (count) => `已找到 ${count} 个来源`,
    noSourcesYet: "正在确认来源…",
    steps: [
      { title: "叙事对比", body: "比较各来源如何叙述同一事件" },
      { title: "主张提取", body: "拆出可核查的具体主张" },
      { title: "证据核查", body: "逐条对照原文与公开材料" },
      { title: "研究报告", body: "汇总分歧、证据和未知项" },
    ],
    statusDone: "已完成",
    statusActive: "进行中",
    statusPending: "等待中",
    demoNote: "这是界面演示，不会调用 AI。真实分析预计约 10 分钟；示例关键词会直接打开已有报告。",
    completed: "演示完成",
    completedNote: "真实分析完成后，这里会变成可打开的事件卡片。",
    openSample: "查看示例报告",
    liveSummary: (step) => `第 ${step} 步，共 ${DEMO_STEP_COUNT} 步`,
  },
  "zh-Hant": {
    badge: "演示進度",
    title: (query) => `正在整理「${query}」`,
    estimate: "預計約 10 分鐘生成報告",
    foundSources: (count) => `已找到 ${count} 個來源`,
    noSourcesYet: "正在確認來源…",
    steps: [
      { title: "敘事對比", body: "比較各來源如何敘述同一事件" },
      { title: "主張提取", body: "拆出可核查的具體主張" },
      { title: "證據核查", body: "逐條對照原文與公開材料" },
      { title: "研究報告", body: "匯總分歧、證據和未知項" },
    ],
    statusDone: "已完成",
    statusActive: "進行中",
    statusPending: "等待中",
    demoNote: "這是介面演示，不會呼叫 AI。真實分析預計約 10 分鐘；示例關鍵詞會直接打開已有報告。",
    completed: "演示完成",
    completedNote: "真實分析完成後，這裡會變成可打開的事件卡片。",
    openSample: "查看示例報告",
    liveSummary: (step) => `第 ${step} 步，共 ${DEMO_STEP_COUNT} 步`,
  },
  en: {
    badge: "Demo progress",
    title: (query) => `Organising “${query}”`,
    estimate: "Estimated report time: about 10 minutes",
    foundSources: (count) => `${count} source${count === 1 ? "" : "s"} found`,
    noSourcesYet: "Confirming sources…",
    steps: [
      { title: "Narrative comparison", body: "Compare how each source frames the same event" },
      { title: "Claim extraction", body: "Pull out the claims that can be checked" },
      { title: "Evidence audit", body: "Check each claim against the saved text" },
      { title: "Research report", body: "Summarise disagreements, evidence, and unknowns" },
    ],
    statusDone: "Done",
    statusActive: "Running",
    statusPending: "Waiting",
    demoNote: "This is an interface demo and does not call AI. A real analysis is estimated at about 10 minutes; sample keywords open an existing report directly.",
    completed: "Demo complete",
    completedNote: "When a real analysis finishes, this becomes a card you can open.",
    openSample: "Open the sample report",
    liveSummary: (step) => `Step ${step} of ${DEMO_STEP_COUNT}`,
  },
};

function scriptOf(language: UiLanguage): Script {
  if (language === "zh" || language === "zh-Hant") return language;
  return "en";
}

export function SearchProgressCard({ progress, language }: { progress: DemoProgressSnapshot; language: UiLanguage }) {
  const copy = COPY[scriptOf(language)];
  const [now, setNow] = useState(() => Date.now());
  const { step, done } = demoProgressPhase(progress, now);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [done]);

  const sources = NEWS_SOURCES.filter((source) => progress.sourceIds.includes(source.id));
  const active = done ? -1 : Math.min(step, DEMO_STEP_COUNT - 1);
  const withinStep = done ? 1 : Math.min(1, (Math.max(0, now - progress.startedAt) - step * DEMO_STEP_MS) / DEMO_STEP_MS);

  return (
    <article className="topic-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-[1.35rem] font-bold leading-[1.35] text-foreground">{done ? copy.completed : copy.title(progress.query)}</h2>
        <span className="lav-badge">{copy.badge}</span>
      </div>
      {done ? null : <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{copy.estimate}</p>}

      <div className="mt-3 rounded-xl border border-of-cream-border bg-of-cream/30 p-2.5">
        <p className="text-xs text-muted-foreground">
          {sources.length > 0 ? copy.foundSources(sources.length) : copy.noSourcesYet}
        </p>
        {sources.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((source) => (
              <li key={source.id} className="flex items-center gap-1.5 rounded-full border border-of-cream-border bg-white px-1.5 py-1">
                <Image src={source.logo} alt="" width={20} height={20} className="size-5 object-contain" />
                <span className="max-w-[9rem] truncate text-xs text-foreground">{sourceTitle(source, language)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ol className="mt-4 space-y-3">
        {copy.steps.map((item, index) => {
          const state = done || index < step ? "done" : index === active ? "active" : "pending";
          return (
            <li key={item.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border text-xs ${
                  state === "done"
                    ? "border-[#e4d48a] bg-[#f3e6a4] text-[#1c1915]"
                    : state === "active"
                      ? "border-[#e4d48a] bg-[#fbf7f1] text-[#1c1915]"
                      : "border-border text-transparent"
                }`}
              >
                {state === "done" ? "✓" : "•"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`text-[15px] font-medium ${state === "pending" ? "text-muted-foreground" : "text-foreground"}`}>
                    {item.title}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {state === "done" ? copy.statusDone : state === "active" ? copy.statusActive : copy.statusPending}
                  </span>
                </div>
                <p className={`mt-0.5 text-[13px] leading-[1.55] ${state === "pending" ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                  {item.body}
                </p>
                {state === "active" ? (
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#eadfce]">
                    <span className="block h-full rounded-full bg-[#e4d48a]" style={{ width: `${Math.round(withinStep * 100)}%` }} />
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[13px] leading-[1.6] text-muted-foreground">{done ? copy.completedNote : copy.demoNote}</p>
      {done ? (
        <Link href={PREPARED_REPORT_HREF.sample} className="paper-action mt-3 w-full">
          {copy.openSample}
        </Link>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {done ? copy.completed : copy.liveSummary(step + 1)}
      </p>
    </article>
  );
}
