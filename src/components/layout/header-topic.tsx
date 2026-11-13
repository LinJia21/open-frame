"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { postAnalysis } from "@/components/home/post-analysis";
import { languageFromDocument } from "@/components/layout/language-menu";
import { getTopicError, getTopicQuery, setTopicError, setTopicQuery, subscribeTopicDraft } from "@/components/layout/topic-draft";
import { TOPIC_MAX_LENGTH } from "@/lib/analysis/validate";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";
import { messageForApiError, messages } from "@/lib/i18n/messages";
import { corpusCopy } from "@/lib/i18n/corpus-copy";
import { providerCopy, providerErrorText } from "@/lib/i18n/provider-copy";
import type { Language } from "@/lib/i18n/languages";

export function HeaderTopic({
  language,
  provider,
}: {
  language: Language;
  provider: PublicProviderStatus;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const query = useSyncExternalStore(subscribeTopicDraft, getTopicQuery, () => "");
  const error = useSyncExternalStore(subscribeTopicDraft, getTopicError, () => null);
  const [pending, setPending] = useState(false);
  if (pathname !== "/") return null;

  const copy = messages[language];
  const savedMode = provider.provider === "cursor";
  const statusCopy = providerCopy(language);
  const savedCopy = corpusCopy(language);

  async function submit(intent: "demo" | "saved") {
    const reportLanguage = languageFromDocument(language);
    if (intent === "saved") {
      setTopicError(corpusCopy(reportLanguage).needSelection);
      return;
    }
    setPending(true);
    setTopicError(null);
    const result = await postAnalysis({ query, language: reportLanguage, intent });
    setPending(false);
    if (result.ok) {
      router.push(result.href);
      return;
    }
    if (result.reason === "network") {
      setTopicError(messages[reportLanguage].home.errorNetwork);
      return;
    }
    if (result.reason === "invalid") {
      setTopicError(messageForApiError(result.code, reportLanguage));
      return;
    }
    setTopicError(providerErrorText(result.token, reportLanguage) ?? messageForApiError(result.token, reportLanguage));
  }

  return (
    <form
      className="header-topic"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(savedMode ? "saved" : "demo");
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <label htmlFor="header-topic" className="sr-only">
          {copy.home.topicLabel}
        </label>
        <input
          id="header-topic"
          value={query}
          maxLength={TOPIC_MAX_LENGTH + 20}
          placeholder={copy.home.topicPlaceholder}
          aria-invalid={Boolean(error)}
          aria-describedby="header-topic-hint"
          onChange={(event) => setTopicQuery(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-full border border-white/30 bg-white px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/70"
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-10 shrink-0 rounded-full bg-of-accent px-4 text-of-accent-foreground hover:bg-of-accent/90"
        >
          {pending ? (savedMode ? statusCopy.starting : copy.home.preparing) : savedMode ? savedCopy.analyzeSaved : copy.home.analyze}
        </Button>
        {savedMode ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            className="h-10 shrink-0 rounded-full border-white/40 bg-transparent px-3 text-of-ink-foreground hover:bg-white/10"
            onClick={() => void submit("demo")}
          >
            {savedCopy.openDemo}
          </Button>
        ) : null}
      </div>
      <p id="header-topic-hint" className={error ? "mt-1 truncate text-xs text-red-200" : "sr-only"} role={error ? "alert" : undefined}>
        {error ?? copy.home.topicHint}
      </p>
    </form>
  );
}
