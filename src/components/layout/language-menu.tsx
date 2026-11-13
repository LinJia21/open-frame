"use client";

import { useRouter } from "next/navigation";
import { LANGUAGE_OPTIONS, isLanguage, type Language } from "@/lib/i18n/languages";
import { messages } from "@/lib/i18n/messages";
import { parseUiLanguage, toAnalysisLanguage, type UiLanguage } from "@/lib/i18n/ui-language";

export function rememberLanguage(language: UiLanguage) {
  document.cookie = `openframe_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function cookieValue(): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("openframe_lang="))
    ?.slice("openframe_lang=".length);
}

export function uiLanguageFromDocument(fallback: UiLanguage = "zh"): UiLanguage {
  return parseUiLanguage(cookieValue(), fallback);
}

export function languageFromDocument(fallback: Language): Language {
  return toAnalysisLanguage(parseUiLanguage(cookieValue(), fallback));
}

export function LanguageMenu({ language }: { language: Language }) {
  const router = useRouter();
  const label = messages[language].home.languageLabel;

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select
        key={language}
        defaultValue={language}
        aria-label={label}
        onChange={(event) => {
          const next = event.target.value;
          if (!isLanguage(next)) return;
          rememberLanguage(next);
          router.refresh();
        }}
        className="h-8 max-w-[9rem] rounded-md border border-white/30 bg-transparent px-2 text-xs text-of-ink-foreground"
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id} className="text-foreground">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
