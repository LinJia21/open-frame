import { messages } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { BriefingIntro } from "@/components/briefing/views";

export const metadata = { title: "Briefing" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await loadBriefing(id);
  const copy = messages[view.language];
  return (
    <>
      <BriefingIntro view={view} current={null} copy={copy} />
      <p className="mt-6 text-sm">{view.masthead}</p>
      <p className="mt-2 text-sm text-muted-foreground">data_mode {view.sourceMode}</p>
    </>
  );
}
