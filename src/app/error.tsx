"use client";

import { ErrorPanel } from "@/components/states/panels";
import type { UiLanguage } from "@/lib/i18n/ui-language";

const ORDER: UiLanguage[] = ["zh", "zh-Hant", "en"];

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <LangStyle />
      {ORDER.map((language) => (
        <div key={language} className={langClass(language)}>
          <ErrorPanel retry={retry} language={language} />
        </div>
      ))}
    </>
  );
}

function langClass(language: UiLanguage) {
  if (language === "zh-Hant") return "of-err-hant";
  if (language === "en") return "of-err-en";
  return "of-err-zh";
}

function LangStyle() {
  return (
    <style>{`
      .of-err-zh, .of-err-hant, .of-err-en { display: none; }
      html[lang="zh-Hant"] .of-err-hant { display: block; }
      html[lang="zh"] .of-err-zh { display: block; }
      html:not([lang="zh"]):not([lang="zh-Hant"]) .of-err-en { display: block; }
    `}</style>
  );
}
