import { messagesForUi } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { BriefingIntro, PerspectivesBody } from "@/components/briefing/views";

export const instant = false;

export const metadata = { title: "Perspectives" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await loadBriefing(id);
  const language = await readUiLanguage();
  const copy = messagesForUi(language);
  return (
    <>
      <BriefingIntro view={view} current="perspectives" copy={copy} />
      <PerspectivesBody view={view} copy={copy} />
    </>
  );
}
