import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { SourceSubscriptions } from "@/components/home/source-subscriptions";
import { SubscribePlans } from "@/components/home/subscribe-plans";
import type { Metadata } from "next";
import { screenTitle, subscribeCopy } from "@/lib/i18n/app-pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "subscribe") };
}

export default async function SubscribePage() {
  const language = await readUiLanguage();
  const copy = subscribeCopy(language);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
        <span className="lav-badge">{copy.badge}</span>
      </div>
      <p className="mt-3 text-base leading-7 text-[#3a342c]">{copy.intro}</p>
      <SubscribePlans copy={copy} />
      <div className="mt-8">
        <SourceSubscriptions language={language} />
      </div>
    </PaperFrame>
  );
}
