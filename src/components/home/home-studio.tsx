"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LANGUAGE_OPTIONS, type Language } from "@/lib/i18n/languages";
import { messageForApiError, messages } from "@/lib/i18n/messages";
import { TOPIC_MAX_LENGTH, validateTopicInput } from "@/lib/analysis/validate";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";
import { providerCopy, providerErrorText, providerStatusText } from "@/lib/i18n/provider-copy";
import { corpusCopy } from "@/lib/i18n/corpus-copy";
import { CorpusPanel } from "@/components/home/corpus-panel";

function rememberLanguage(language: Language) {
  document.cookie = `openframe_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export interface RecentItem {
  bundleId: string;
  subject: string;
  query: string;
  createdAt: string;
  generic: boolean;
  dataMode: string;
  sourceLabel: string;
}

export function HomeStudio({
  initialLanguage,
  recent,
  recentError,
  suggestions,
  provider,
}: {
  initialLanguage: Language;
  recent: RecentItem[];
  recentError: boolean;
  suggestions: Array<{ id: string; title: string; blurb: string }>;
  provider: PublicProviderStatus;
}) {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const copy = messages[language];
  const statusCopy = providerCopy(language);
  const savedCopy = corpusCopy(language);

  function remember(next: Language) {
    rememberLanguage(next);
    setLanguage(next);
  }

  async function submit(intent: "demo" | "saved") {
    const checked = validateTopicInput(query, language);
    if (!checked.ok) {
      setError(messageForApiError(checked.code, language));
      return;
    }
    if (intent === "saved" && selectedIds.length === 0) {
      setError(savedCopy.needSelection);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...checked.value, intent, sourceIds: intent === "saved" ? selectedIds : undefined }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: { bundle_id?: string; job?: { id?: string } };
        errors?: Array<{ message?: string }>;
      };
      const jobId = payload.data?.job?.id;
      if (response.status === 202 && payload.ok && jobId) {
        router.push(`/analysis/runs/${jobId}`);
        return;
      }
      if (!response.ok || !payload.ok || !payload.data?.bundle_id) {
        const token = payload.errors?.[0]?.message;
        setError(providerErrorText(token, language) ?? messageForApiError(token, language));
        return;
      }
      router.push(`/analysis/${payload.data.bundle_id}/perspectives`);
    } catch {
      setError(copy.home.errorNetwork);
    } finally {
      setPending(false);
    }
  }

  const savedMode = provider.provider === "cursor";

  return (
    <div className="mt-8 space-y-8">
      <CorpusPanel language={language} provider={provider} selectedIds={selectedIds} onSelectedIds={setSelectedIds} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(savedMode ? "saved" : "demo");
        }}
        className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <div className="space-y-2">
          <Label htmlFor="topic">{copy.home.topicLabel}</Label>
          <Textarea
            id="topic"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError(null);
            }}
            rows={4}
            maxLength={TOPIC_MAX_LENGTH + 20}
            placeholder={copy.home.topicPlaceholder}
            aria-invalid={Boolean(error)}
            aria-describedby="topic-hint"
            className="min-h-32"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <p id="topic-hint">{copy.home.topicHint}</p>
            <span>{query.trim().length}/{TOPIC_MAX_LENGTH}</span>
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">{copy.home.languageLabel}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LANGUAGE_OPTIONS.map((option) => (
              <label
                key={option.id}
                className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
                  language === option.id ? "border-[#1c1915] bg-[#f3e6a4]" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value={option.id}
                  checked={language === option.id}
                  onChange={() => remember(option.id)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{error}</AlertTitle>
            <AlertDescription>{copy.home.topicHint}</AlertDescription>
          </Alert>
        ) : null}
        <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          {providerStatusText(provider, language)}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
            {pending ? (savedMode ? statusCopy.starting : copy.home.preparing) : savedMode ? savedCopy.analyzeSaved : copy.home.analyze}
          </Button>
          {savedMode ? (
            <Button type="button" variant="outline" disabled={pending} className="h-11 w-full sm:w-auto" onClick={() => void submit("demo")}>
              {savedCopy.openDemo}
            </Button>
          ) : null}
        </div>
        <div>
          <h2 className="font-serif text-xl">{copy.home.suggestionsTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.home.suggestionsHint}</p>
          <div className="mt-3 space-y-2">
            {suggestions.map((topic, index) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  setQuery(topic.title);
                  setError(null);
                }}
                className="paper-card block w-full px-3 py-3 text-left"
              >
                <span className="text-xs tracking-wide text-[#5c564c]">{index === 0 ? "Primary demo" : "Prepared demo"}</span>
                <span className="mt-1 block font-medium">{topic.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{topic.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
      <div className="space-y-6">
        <section>
          <h2 className="font-serif text-xl">{copy.home.flowTitle}</h2>
          <ol className="mt-3 space-y-3">
            {copy.home.steps.map((step, index) => (
              <li key={step.title} className="rounded-xl border border-border bg-card p-4">
                <span className="font-serif text-[#5c564c]">0{index + 1}</span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="font-serif text-xl">{copy.home.recentTitle}</h2>
          {recentError ? (
            <div className="mt-3 rounded-xl border border-destructive/30 p-4">
              <h3 className="font-medium">{copy.home.recentErrorTitle}</h3>
              <p className="text-sm text-muted-foreground">{copy.home.recentErrorBody}</p>
            </div>
          ) : recent.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-border p-4">
              <h3 className="font-medium">{copy.home.recentEmptyTitle}</h3>
              <p className="text-sm text-muted-foreground">{copy.home.recentEmptyBody}</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent.map((item) => (
                <li key={item.bundleId}>
                  <a href={`/analysis/${item.bundleId}/perspectives`} className="paper-card block p-3">
                    <span className="text-xs text-muted-foreground">{item.generic ? copy.home.genericChip : copy.home.preparedChip} · {item.sourceLabel} · data_mode {item.dataMode}</span>
                    <span className="mt-1 block font-medium">{item.subject}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}
