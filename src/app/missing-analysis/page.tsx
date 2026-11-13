import { NotFoundPanel } from "@/components/states/panels";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import type { Metadata } from "next";
import { messagesForUi } from "@/lib/i18n/messages";
import { screenTitle } from "@/lib/i18n/app-pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "missing") };
}

export default async function MissingAnalysisPage() {
  const language = await readUiLanguage();
  const copy = messagesForUi(language).briefing;
  return (
    <PaperFrame language={language} lead={copy.notFoundBody}>
      <NotFoundPanel language={language} />
    </PaperFrame>
  );
}
