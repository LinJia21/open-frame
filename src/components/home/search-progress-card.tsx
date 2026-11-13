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
  liveBadge: string;
  title: (query: string) => string;
  estimate: string;
  liveEstimate: string;
  foundSources: (count: number) => string;
  noSourcesYet: string;
  steps: Array<{ title: string; body: string }>;
  statusDone: string;
  statusActive: string;
  statusPending: string;
  demoNote: string;
  liveNote: string;
  liveDoneNote: string;
  completed: string;
  completedNote: string;
  openSample: string;
  liveSummary: (step: number) => string;
}

const COPY: Record<Script, ProgressCopy> = {
  zh: {
    badge: "演示进度",
    liveBadge: "真实分析",
    title: (query) => `正在整理「${query}」`,
    estimate: "预计约 10 分钟生成报告",
    liveEstimate: "已提交真实分析，通常需要几分钟",
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
    liveNote: "真实分析已在后台发起。四步分别是一次调用里生成的四个部分，这里的进度按时间估算，不是服务器回报的阶段。",
    liveDoneNote: "估算时间已过，分析仍在后台运行。完成后会自动打开结果页，也可以稍后从分析记录里打开。",
    completed: "演示完成",
    completedNote: "真实分析完成后，这里会变成可打开的事件卡片。",
    openSample: "查看示例报告",
    liveSummary: (step) => `第 ${step} 步，共 ${DEMO_STEP_COUNT} 步`,
  },
  "zh-Hant": {
    badge: "演示進度",
    liveBadge: "真實分析",
    title: (query) => `正在整理「${query}」`,
    estimate: "預計約 10 分鐘生成報告",
    liveEstimate: "已提交真實分析，通常需要幾分鐘",
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
    liveNote: "真實分析已在背景發起。四步是一次呼叫裡生成的四個部分，這裡的進度按時間估算，不是伺服器回報的階段。",
    liveDoneNote: "估算時間已過，分析仍在背景執行。完成後會自動打開結果頁，也可以稍後從分析記錄裡打開。",
    completed: "演示完成",
    completedNote: "真實分析完成後，這裡會變成可打開的事件卡片。",
    openSample: "查看示例報告",
    liveSummary: (step) => `第 ${step} 步，共 ${DEMO_STEP_COUNT} 步`,
  },
  en: {
    badge: "Demo progress",
    liveBadge: "Live analysis",
    title: (query) => `Organising “${query}”`,
    estimate: "Estimated report time: about 10 minutes",
    liveEstimate: "Live analysis submitted. It usually takes a few minutes.",
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
    liveNote: "The live analysis has started in the background. The four steps are sections produced by one model call; this progress is a time estimate, not a server-reported stage.",
    liveDoneNote: "The estimate has elapsed and the analysis is still running. The result page opens automatically when it is ready, or you can open it later from the analysis history.",
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

export function SearchProgressCard({ progress, language, live = false }: { progress: DemoProgressSnapshot; language: UiLanguage; live?: boolean }) {
  const copy = COPY[scriptOf(language)];
  const [now, setNow] = useState(() => Date.now());
  const { step, done } = demoProgressPhase(progress, now);

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [done]);

  const sources = NEWS_SOURCES.filter((source) => progress.sourceIds.includes(source.id));
  const libraryOutlets = progress.outlets ?? [];
  const shownDone = live ? false : done;
  const active = done ? -1 : Math.min(step, DEMO_STEP_COUNT - 1);
  const withinStep = done ? 1 : Math.min(1, (Math.max(0, now - progress.startedAt) - step * DEMO_STEP_MS) / DEMO_STEP_MS);
  const sourceLabel =
    libraryOutlets.length > 0
      ? copy.foundSources(libraryOutlets.length)
      : sources.length > 0
        ? copy.foundSources(sources.length)
        : copy.noSourcesYet;

  return (
    <article className="topic-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs tracking-[0.16em] text-of-accent">AI BRIEF</p>
        <span className="lav-badge" data-tone={live ? "live" : undefined}>{live ? copy.liveBadge : done ? copy.completed : copy.badge}</span>
      </div>
      <h2 className="mt-2 text-[1.35rem] font-bold leading-[1.35] text-foreground">{live || !done ? copy.title(progress.query) : copy.completed}</h2>
      {live || !done ? <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{live ? copy.liveEstimate : copy.estimate}</p> : null}

      <div className="mt-3 rounded-xl border border-of-cream-border bg-of-cream/30 p-2.5">
        <p className="text-xs text-muted-foreground">{sourceLabel}</p>
        {libraryOutlets.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {libraryOutlets.map((name) => (
              <li key={name} className="rounded-full border border-of-cream-border bg-white px-2 py-1 text-xs text-foreground">
                <span className="inline-block max-w-[12rem] truncate align-bottom">{name}</span>
              </li>
            ))}
          </ul>
        ) : sources.length > 0 ? (
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
          const state = shownDone || index < step ? "done" : index === active ? "active" : "pending";
          return (
            <li key={item.title} className="flex gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs ${
                  state === "done"
                    ? "border-of-accent bg-of-accent text-of-accent-foreground"
                    : state === "active"
                      ? "border-of-accent text-of-accent animate-pulse"
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
                  <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-of-cream-border">
                    <span className="block h-full rounded-full bg-of-accent" style={{ width: `${Math.round(withinStep * 100)}%` }} />
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-[13px] leading-[1.6] text-muted-foreground">
        {live ? (done ? copy.liveDoneNote : copy.liveNote) : done ? copy.completedNote : copy.demoNote}
      </p>
      {!live && done ? (
        <Link href={PREPARED_REPORT_HREF.sample} className="evidence-pill mt-3">
          {copy.openSample}
        </Link>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {!live && done ? copy.completed : copy.liveSummary(Math.min(step + 1, DEMO_STEP_COUNT))}
      </p>
    </article>
  );
}
