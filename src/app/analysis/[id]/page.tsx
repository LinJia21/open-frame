import { messages } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { BriefingIntro } from "@/components/briefing/views";

export const metadata = { title: "Briefing" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await loadBriefing(id);
  const language = await readUiLanguage();
  return <BriefingIntro view={view} current={null} copy={messages[language]} />;
}
