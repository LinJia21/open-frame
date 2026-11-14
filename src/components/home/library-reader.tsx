"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DemoTopicAction } from "@/components/home/demo-topic-action";
import { StoryFigure } from "@/components/media/story-figure";
import { corpusCopy } from "@/lib/i18n/corpus-copy";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";

interface SavedDetail {
  id: string;
  event: string;
  outlet: string;
  title: string;
  publishedAt: string | null;
  originalUrl: string;
  savedAt: string;
  completeness: "full_text" | "summary_only" | "title_only";
  syndication: "original" | "reprint" | "unknown";
  fixture: "test" | null;
  truncated: boolean;
  body: string | null;
  summary: string | null;
}

export function LibraryReader({ id, language }: { id: string; language: UiLanguage }) {
  const copy = subpageCopy(language).libraryItem;
  const labels = corpusCopy(language);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [item, setItem] = useState<SavedDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/corpus?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const payload = (await response.json()) as { ok?: boolean; data?: { item?: SavedDetail } };
        if (cancelled) return;
        if (response.status === 404) {
          setPhase("missing");
          return;
        }
        if (!response.ok || !payload.ok || !payload.data?.item) {
          setPhase("error");
          return;
        }
        setItem(payload.data.item);
        setPhase("ready");
      } catch {
        if (!cancelled) setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (phase === "loading") {
    return (
      <p className="topic-card text-[15px] leading-7" role="status" aria-busy="true">
        {copy.loading}
      </p>
    );
  }
  if (phase === "missing") {
    return (
      <section className="topic-card" role="status">
        <h1 className="text-[1.5rem] font-bold">{copy.missingTitle}</h1>
        <p className="mt-2 text-[15px] leading-7">{copy.missingBody}</p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/library" className="paper-action w-full">
            {copy.backLibrary}
          </Link>
          <Link href="/library/import" className="paper-action-quiet w-full">
            {subpageCopy(language).importPage.title}
          </Link>
        </div>
      </section>
    );
  }
  if (phase === "error" || !item) {
    return (
      <section className="topic-card" role="alert">
        <h1 className="text-[1.5rem] font-bold">{copy.readFailed}</h1>
        <button type="button" className="paper-action mt-4 w-full" onClick={() => window.location.reload()}>
          {copy.retry}
        </button>
      </section>
    );
  }

  const completeness = { full_text: labels.fullText, summary_only: labels.summaryOnly, title_only: labels.titleOnly }[item.completeness];
  const syndication = { original: labels.original, reprint: labels.reprint, unknown: labels.unknown }[item.syndication];
  const text = item.body ?? item.summary ?? "";
  return (
    <article>
      <StoryFigure title={item.title} note={labels.imageNote} />
      <h1 className="text-[1.7rem] font-bold leading-[1.35]">{item.title}</h1>
      <p className="mt-3 text-[15px] leading-7">
        {item.outlet} · {item.event}
        {item.publishedAt ? ` · ${item.publishedAt.slice(0, 10)}` : ""}
      </p>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
        {completeness} · {syndication}
        {item.fixture === "test" ? ` · ${copy.testFixture}` : ""}
        {item.truncated ? ` · ${labels.truncated}` : ""}
      </p>
      <p className="mt-2 break-all text-[13px] leading-6 text-muted-foreground">{item.originalUrl}</p>
      <p className="paper-note mt-4 text-[14px] leading-7">{copy.capNotice}</p>
      {text.length > 2000 ? <p className="mt-3 text-[14px] leading-7 text-[#3a342c]">{copy.overCap}</p> : null}
      {text ? (
        <div className="topic-card mt-4 whitespace-pre-wrap text-[16px] leading-8">{text}</div>
      ) : (
        <p className="topic-card mt-4 text-[15px] leading-7" role="status">
          {copy.noText}
        </p>
      )}
      <DemoTopicAction topic={item.title} language={language} note={copy.analyzeNote} label={copy.analyze} working={copy.analyzing} />
      <p className="mt-4 text-[14px] leading-7 text-muted-foreground">{copy.noRemove}</p>
      <Link href="/library" className="paper-action-quiet mt-4 inline-flex">
        {copy.backLibrary}
      </Link>
    </article>
  );
}
