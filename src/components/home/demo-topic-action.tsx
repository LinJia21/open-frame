"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postAnalysis } from "@/components/home/post-analysis";
import { messageForApiError, messagesForUi } from "@/lib/i18n/messages";
import { providerErrorText } from "@/lib/i18n/provider-copy";
import { toAnalysisLanguage, type UiLanguage } from "@/lib/i18n/ui-language";
import { TOPIC_MAX_LENGTH } from "@/lib/analysis/validate";

/** Opens the existing demo briefing path. Unmatched titles stay a labeled generic demo. */
export function DemoTopicAction({
  topic,
  language,
  note,
  label,
  working,
}: {
  topic: string;
  language: UiLanguage;
  note: string;
  label: string;
  working: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const query = topic.replace(/\s+/g, " ").trim().slice(0, TOPIC_MAX_LENGTH);

  async function run() {
    setPending(true);
    setError(null);
    const result = await postAnalysis({
      query,
      language: toAnalysisLanguage(language),
      intent: "demo",
    });
    if (result.ok) {
      router.push(result.href);
      return;
    }
    setPending(false);
    if (result.reason === "network") {
      setError(messagesForUi(language).home.errorNetwork);
      return;
    }
    if (result.reason === "invalid") {
      setError(messageForApiError(result.code, language));
      return;
    }
    setError(providerErrorText(result.token, language) ?? messageForApiError(result.token, language));
  }

  return (
    <div className="topic-card mt-4">
      <p className="text-[15px] leading-7 text-[#3a342c]">{note}</p>
      <button type="button" className="paper-action mt-4 w-full" disabled={pending || query.length < 2} onClick={() => void run()}>
        {pending ? working : label}
      </button>
      {error ? (
        <p className="mt-3 text-sm leading-6 text-[#8a3b2d]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
