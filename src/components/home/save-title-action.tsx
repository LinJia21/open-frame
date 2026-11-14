"use client";

import { useState } from "react";
import Link from "next/link";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { providerErrorText } from "@/lib/i18n/provider-copy";

/** Saves a followed-source title only. The article URL is stored and not fetched. */
export function SaveTitleAction({
  language,
  title,
  outlet,
  url,
  date,
  canSave,
  copy,
}: {
  language: UiLanguage;
  title: string;
  outlet: string;
  url: string | null;
  date: string | null;
  canSave: boolean;
  copy: {
    saveTitle: string;
    saveBody: string;
    saveButton: string;
    saving: string;
    saved: string;
    saveSkipped: string;
    openItem: string;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHref, setSavedHref] = useState<string | null>(null);

  async function save() {
    if (!url) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/corpus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              event: language === "en" ? "Followed source title" : language === "zh-Hant" ? "已關注來源標題" : "已关注来源标题",
              outlet,
              title,
              publishedAt: date,
              originalUrl: url,
              summary: null,
              body: null,
              completeness: "title_only",
              syndication: "unknown",
              reprintOfUrl: null,
              language: language === "en" ? "en" : "zh",
              fixture: null,
            },
          ],
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: { items?: Array<{ id?: string }> };
        errors?: Array<{ message?: string }>;
      };
      if (!response.ok || !payload.ok || !payload.data?.items?.[0]?.id) {
        setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.saveSkipped);
        return;
      }
      setSavedHref(`/library/${payload.data.items[0].id}`);
    } catch {
      setError(copy.saveSkipped);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="topic-card mt-4">
      <h2 className="text-[1.15rem] font-bold">{copy.saveTitle}</h2>
      <p className="mt-2 text-[15px] leading-7 text-[#3a342c]">{canSave ? copy.saveBody : copy.saveSkipped}</p>
      {canSave ? (
        <button type="button" className="paper-action mt-4 w-full" disabled={pending || Boolean(savedHref)} onClick={() => void save()}>
          {pending ? copy.saving : copy.saveButton}
        </button>
      ) : null}
      {savedHref ? (
        <p className="mt-3 text-[15px] leading-7" role="status">
          {copy.saved}{" "}
          <Link href={savedHref} className="paper-link">
            {copy.openItem}
          </Link>
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm leading-6 text-[#8a3b2d]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
