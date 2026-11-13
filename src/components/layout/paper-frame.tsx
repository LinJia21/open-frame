import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { PageDock } from "@/components/layout/page-dock";
import { parseUiLanguage, type UiLanguage } from "@/lib/i18n/ui-language";

export async function readUiLanguage(): Promise<UiLanguage> {
  const jar = await cookies();
  return parseUiLanguage(jar.get("openframe_lang")?.value);
}

export function PaperFrame({
  language,
  kicker = "See Beyond the Headlines",
  lead,
  points = [],
  children,
}: {
  language: UiLanguage;
  kicker?: string;
  lead: string;
  points?: string[];
  children: ReactNode;
}) {
  return (
    <div className="spectrax-stage">
      <aside className="spectrax-aside">
        <p className="wordmark text-[3.25rem]">SpectraX</p>
        <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{kicker}</p>
        <p className="mt-6 text-[16px] leading-7 text-[#3a342c]">{lead}</p>
        {points.length > 0 ? (
          <ol className="mt-5 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-[#3a342c]">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ol>
        ) : null}
      </aside>
      <div className="newsroom news-home">
        <div className="news-home-scroll">
          <div className="mx-auto w-full max-w-[40rem] px-4 pb-6 pt-5">
            <div className="mb-4 flex justify-end">
              <LanguageSwitch language={language} />
            </div>
            {children}
          </div>
        </div>
        <PageDock placement="frame" language={language} />
      </div>
    </div>
  );
}
