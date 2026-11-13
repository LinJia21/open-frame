"use client";

import { useRouter } from "next/navigation";
import { rememberLanguage } from "@/components/layout/language-menu";
import { isUiLanguage, type UiLanguage } from "@/lib/i18n/ui-language";

const OPTIONS = [
  { id: "zh", label: "简体" },
  { id: "zh-Hant", label: "繁體" },
  { id: "en", label: "English" },
] as const;

export function LanguageSwitch({ language }: { language: UiLanguage }) {
  const router = useRouter();
  const label = language === "zh-Hant" ? "介面語言" : language === "en" ? "Interface language" : language === "es" ? "Idioma de la interfaz" : language === "fr" ? "Langue de l’interface" : "界面语言";
  const extras =
    language === "es"
      ? [{ id: "es" as const, label: "Español" }]
      : language === "fr"
        ? [{ id: "fr" as const, label: "Français" }]
        : [];

  return (
    <div className="lang-switch" role="group" aria-label={label}>
      {[...OPTIONS, ...extras].map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={language === option.id}
          onClick={() => {
            if (language === option.id || !isUiLanguage(option.id)) return;
            rememberLanguage(option.id);
            router.refresh();
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
