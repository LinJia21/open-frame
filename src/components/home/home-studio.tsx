"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { suggestionKind } from "@/lib/i18n/app-pages";
import { messageForApiError, messagesForUi } from "@/lib/i18n/messages";
import { toAnalysisLanguage, type UiLanguage } from "@/lib/i18n/ui-language";
import { TOPIC_MAX_LENGTH } from "@/lib/analysis/validate";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";
import { providerCopy, providerErrorText, providerStatusText } from "@/lib/i18n/provider-copy";
import { corpusCopy } from "@/lib/i18n/corpus-copy";
import { CorpusPanel } from "@/components/home/corpus-panel";
import { postAnalysis } from "@/components/home/post-analysis";
import { languageFromDocument } from "@/components/layout/language-menu";
import { getTopicError, setTopicError, setTopicQuery, subscribeTopicDraft } from "@/components/layout/topic-draft";

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
  includeCorpus = true,
  topicInHeader = false,
}: {
  initialLanguage: UiLanguage;
  recent: RecentItem[];
  recentError: boolean;
  suggestions: Array<{ id: string; title: string; blurb: string }>;
  provider: PublicProviderStatus;
  includeCorpus?: boolean;
  topicInHeader?: boolean;
}) {
  const router = useRouter();
  const language = initialLanguage;
  const [localQuery, setLocalQuery] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const headerError = useSyncExternalStore(subscribeTopicDraft, getTopicError, () => null);
  const copy = messagesForUi(language);
  const statusCopy = providerCopy(language);
  const savedCopy = corpusCopy(language);
  const error = topicInHeader ? headerError : localError;
  const savedMode = provider.provider === "cursor";

  function clearError() {
    if (topicInHeader) setTopicError(null);
    else setLocalError(null);
  }

  async function submit(intent: "demo" | "saved") {
    const reportLanguage = languageFromDocument(toAnalysisLanguage(language));
    if (intent === "saved" && selectedIds.length === 0) {
      setLocalError(corpusCopy(reportLanguage).needSelection);
      return;
    }
    setPending(true);
    setLocalError(null);
    const result = await postAnalysis({
      query: localQuery,
      language: reportLanguage,
      intent,
      sourceIds: intent === "saved" ? selectedIds : undefined,
    });
    setPending(false);
    if (result.ok) {
      router.push(result.href);
      return;
    }
    const reportCopy = messagesForUi(reportLanguage);
    if (result.reason === "network") {
      setLocalError(reportCopy.home.errorNetwork);
      return;
    }
    if (result.reason === "invalid") {
      setLocalError(messageForApiError(result.code, reportLanguage));
      return;
    }
    setLocalError(providerErrorText(result.token, reportLanguage) ?? messageForApiError(result.token, reportLanguage));
  }

  const topicFields = topicInHeader ? null : (
    <div className="space-y-2">
      <Label htmlFor="topic">{copy.home.topicLabel}</Label>
      <Textarea
        id="topic"
        value={localQuery}
        onChange={(event) => {
          setLocalQuery(event.target.value);
          setLocalError(null);
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
        <span>
          {localQuery.trim().length}/{TOPIC_MAX_LENGTH}
        </span>
      </div>
    </div>
  );

  const card = (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
      {topicFields}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
          <AlertDescription>{copy.home.topicHint}</AlertDescription>
        </Alert>
      ) : null}
      <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        {providerStatusText(provider, language)}
      </p>
      {topicInHeader ? null : (
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
      )}
      <div>
        <h2 className="font-serif text-xl">{copy.home.suggestionsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{copy.home.suggestionsHint}</p>
        <div className="mt-3 space-y-2">
          {suggestions.map((topic, index) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => {
                if (topicInHeader) {
                  setTopicQuery(topic.title);
                  document.getElementById("header-topic")?.focus();
                } else {
                  setLocalQuery(topic.title);
                  clearError();
                }
              }}
              className="block w-full rounded-xl border border-border px-3 py-3 text-left hover:border-of-accent"
            >
              <span className="text-xs tracking-wide text-of-accent">{suggestionKind(language, index)}</span>
              <span className="mt-1 block font-medium">{topic.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{topic.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-8 space-y-8">
      {includeCorpus ? (
        <CorpusPanel language={language} provider={provider} selectedIds={selectedIds} onSelectedIds={setSelectedIds} />
      ) : null}
      <div className="grid gap-8">
        {topicInHeader ? (
          card
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(savedMode ? "saved" : "demo");
            }}
          >
            {card}
          </form>
        )}
        <div className="space-y-6">
          <section>
            <h2 className="font-serif text-xl">{copy.home.flowTitle}</h2>
            <ol className="mt-3 space-y-3">
              {copy.home.steps.map((step, index) => (
                <li key={step.title} className="rounded-xl border border-border bg-card p-4">
                  <span className="font-serif text-of-accent">0{index + 1}</span>
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
                    <a href={`/analysis/${item.bundleId}/perspectives`} className="block rounded-xl border border-border bg-card p-3 hover:border-of-accent">
                      <span className="text-xs text-muted-foreground">
                        {item.generic ? copy.home.genericChip : copy.home.preparedChip} · {item.sourceLabel} · data_mode {item.dataMode}
                      </span>
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
