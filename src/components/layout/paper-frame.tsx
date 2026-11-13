import { ViewTransition, type ReactNode } from "react";
import { cookies } from "next/headers";
import { HeaderLockup, StageLockup } from "@/components/layout/brand-lockup";
import { LanguageSwitch } from "@/components/layout/language-switch";
import { PageDock } from "@/components/layout/page-dock";
import { messagesForUi } from "@/lib/i18n/messages";
import { parseUiLanguage, type UiLanguage } from "@/lib/i18n/ui-language";

export async function readUiLanguage(): Promise<UiLanguage> {
  const jar = await cookies();
  return parseUiLanguage(jar.get("openframe_lang")?.value);
}

export function PaperFrame({
  language,
  kicker,
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
  const slogan = kicker ?? messagesForUi(language).home.sloganTranslated;
  return (
    <div className="spectrax-stage">
      <aside className="spectrax-aside">
        <StageLockup />
        <ViewTransition name="spectrax-aside" share="paper-fade" enter="paper-fade" exit="paper-fade" update="none" default="none">
          <div>
            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">{slogan}</p>
            <p className="mt-6 text-[16px] leading-7 text-[#3a342c]">{lead}</p>
            {points.length > 0 ? (
              <ol className="mt-5 list-decimal space-y-3 pl-5 text-[15px] leading-7 text-[#3a342c]">
                {points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ol>
            ) : null}
          </div>
        </ViewTransition>
      </aside>
      <div className="newsroom news-home">
        <div className="news-home-scroll">
          <div className="mx-auto w-full max-w-[40rem] px-4 pb-6 pt-5">
            <div className="flex items-center justify-between gap-3">
              <HeaderLockup />
              <div className="shrink-0">
                <LanguageSwitch language={language} />
              </div>
            </div>
            <ViewTransition name="paper-page" share="paper-fade" enter="paper-fade" exit="paper-fade" update="none" default="none">
              <div className="mt-4">{children}</div>
            </ViewTransition>
          </div>
        </div>
        <PageDock placement="frame" language={language} />
      </div>
    </div>
  );
}
