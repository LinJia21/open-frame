import { NotFoundPanel } from "@/components/states/panels";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { messagesForUi } from "@/lib/i18n/messages";

export const metadata = { title: "Briefing not found" };

export default async function MissingAnalysisPage() {
  const language = await readUiLanguage();
  const copy = messagesForUi(language).briefing;
  return (
    <PaperFrame language={language} lead={copy.notFoundBody}>
      <NotFoundPanel language={language} />
    </PaperFrame>
  );
}
