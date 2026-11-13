"use client";

import { ErrorPanel } from "@/components/states/panels";
import type { UiLanguage } from "@/lib/i18n/ui-language";

const ORDER: UiLanguage[] = ["zh", "zh-Hant", "en"];

export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <style>{`
        .of-err-zh, .of-err-hant, .of-err-en { display: none; }
        html[lang="zh-Hant"] .of-err-hant { display: block; }
        html[lang="zh"] .of-err-zh { display: block; }
        html:not([lang="zh"]):not([lang="zh-Hant"]) .of-err-en { display: block; }
      `}</style>
      {ORDER.map((language) => (
        <div key={language} className={language === "zh-Hant" ? "of-err-hant" : language === "en" ? "of-err-en" : "of-err-zh"}>
          <ErrorPanel retry={retry} language={language} />
        </div>
      ))}
    </>
  );
}
