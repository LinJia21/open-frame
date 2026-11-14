"use client";

import { useState } from "react";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { providerErrorText } from "@/lib/i18n/provider-copy";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";

const REJECTED_SAMPLE = `{
  "items": [
    {
      "event": "示例",
      "outlet": "Example",
      "title": "Example",
      "publishedAt": "2024-01-15",
      "originalUrl": "https://example.com/sample",
      "summary": "示例会被拒绝。",
      "body": null,
      "completeness": "summary_only",
      "syndication": "unknown",
      "reprintOfUrl": null,
      "language": "en",
      "fixture": null
    }
  ]
}`;

export function LibraryImportForm({ language, libraryCount }: { language: UiLanguage; libraryCount: number }) {
  const copy = subpageCopy(language).importPage;
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ created: number; updated: number; ids: string[] } | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    setSaved(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setPending(false);
      setError(providerErrorText("invalid_json", language) ?? copy.rejectedHint);
      return;
    }
    try {
      const response = await fetch("/api/corpus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: { created?: number; updated?: number; items?: Array<{ id?: string }> };
        errors?: Array<{ message?: string }>;
      };
      if (!response.ok || !payload.ok || !payload.data) {
        setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.rejectedHint);
        return;
      }
      setSaved({
        created: payload.data.created ?? 0,
        updated: payload.data.updated ?? 0,
        ids: (payload.data.items ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)),
      });
      setText("");
    } catch {
      setError(copy.rejectedHint);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-[#3a342c]">
        {copy.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
      <p className="mt-4 text-[14px] leading-7 text-muted-foreground">{copy.rejectedHint}</p>
      {libraryCount === 0 && !saved ? (
        <p className="topic-card mt-4 text-[15px] leading-7" role="status">
          {copy.emptyLibrary}
        </p>
      ) : null}
      <div className="mt-4 space-y-2">
        <Label htmlFor="library-import-json">{copy.label}</Label>
        <Textarea
          id="library-import-json"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={10}
          className="paper-field min-h-48"
          spellCheck={false}
        />
        <div className="flex flex-col gap-2">
          <button type="button" className="paper-action w-full" disabled={pending || text.trim().length === 0} onClick={() => void submit()}>
            {pending ? copy.pending : copy.submit}
          </button>
          <button type="button" className="paper-action-quiet w-full" onClick={() => { setText(REJECTED_SAMPLE); setError(null); setSaved(null); }}>
            {copy.fillRejected}
          </button>
        </div>
      </div>
      {error ? (
        <div className="topic-card mt-4" role="alert">
          <p className="text-[15px] leading-7">{error}</p>
        </div>
      ) : null}
      {saved ? (
        <div className="topic-card mt-4" role="status">
          <h2 className="text-[1.15rem] font-bold">{copy.successTitle}</h2>
          <p className="mt-2 text-[15px] leading-7">{copy.successBody(saved.created, saved.updated)}</p>
          <ul className="mt-3 space-y-2">
            {saved.ids.map((id) => (
              <li key={id}>
                <Link href={`/library/${id}`} className="paper-action inline-flex">
                  {copy.openItem}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link href="/library" className="paper-action-quiet mt-4 inline-flex">
        {copy.backLibrary}
      </Link>
    </div>
  );
}
