import { messages } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { BriefingIntro, EvidenceBody } from "@/components/briefing/views";

export const metadata = { title: "Evidence Audit" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await loadBriefing(id);
  const language = await readUiLanguage();
  const copy = messages[language];
  return (
    <>
      <BriefingIntro view={view} current="evidence" copy={copy} />
      <EvidenceBody view={view} copy={copy} />
    </>
  );
}
