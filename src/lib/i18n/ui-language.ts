import { isLanguage, languageOption, type Language } from "@/lib/i18n/languages";

/**
 * Interface language. `zh`, `en`, `es`, and `fr` stay the analysis-language
 * cookie values. `zh-Hant` is chrome only and is never sent as a briefing language.
 */
export type UiLanguage = Language | "zh-Hant";

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "zh-Hant" || isLanguage(value);
}

export function parseUiLanguage(value: unknown, fallback: UiLanguage = "zh"): UiLanguage {
  return isUiLanguage(value) ? value : fallback;
}

/** Briefing requests stay on the existing analysis languages. Traditional UI maps to zh. */
export function toAnalysisLanguage(language: UiLanguage): Language {
  return language === "zh-Hant" ? "zh" : language;
}

export function htmlLangFor(language: UiLanguage): string {
  if (language === "zh-Hant") return "zh-Hant";
  return languageOption(language).htmlLang;
}
