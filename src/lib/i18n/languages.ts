export const LANGUAGES = ["en", "zh", "es", "fr"] as const;

/** Languages the prototype can write a briefing in. Article records use BCP 47 tags. */
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  id: Language;
  label: string;
  locale: string;
  htmlLang: string;
  /** BCP 47 tag stored on article records. */
  bcp47: string;
}> = [
  { id: "en", label: "English", locale: "en-US", htmlLang: "en", bcp47: "en" },
  { id: "zh", label: "中文", locale: "zh-CN", htmlLang: "zh-CN", bcp47: "zh-Hans" },
  { id: "es", label: "Español", locale: "es-ES", htmlLang: "es", bcp47: "es" },
  { id: "fr", label: "Français", locale: "fr-FR", htmlLang: "fr", bcp47: "fr" },
];

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" && LANGUAGES.some((language) => language === value)
  );
}

export function languageOption(language: Language) {
  const match = LANGUAGE_OPTIONS.find((option) => option.id === language);
  return match ?? LANGUAGE_OPTIONS[0];
}

export function languageFromTag(tag: string): Language {
  const lower = tag.toLowerCase();
  if (lower.startsWith("zh")) return "zh";
  if (lower.startsWith("es")) return "es";
  if (lower.startsWith("fr")) return "fr";
  return "en";
}

export function formatLongDate(isoDate: string, language: Language): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return new Intl.DateTimeFormat(languageOption(language).locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

export function formatTimestamp(isoTimestamp: string, language: Language): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat(languageOption(language).locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
