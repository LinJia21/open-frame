import { NotFoundPanel } from "@/components/states/panels";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { messagesForUi } from "@/lib/i18n/messages";

export default async function NotFound() {
  const language = await readUiLanguage();
  const copy = messagesForUi(language).briefing;
  return (
    <PaperFrame language={language} lead={copy.notFoundBody}>
      <p className="wordmark text-[1.85rem]">SpectraX</p>
      <div className="mt-4">
        <NotFoundPanel language={language} />
      </div>
    </PaperFrame>
  );
}
