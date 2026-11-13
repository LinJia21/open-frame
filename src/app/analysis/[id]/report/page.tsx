import { messages } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { briefingToMarkdown } from "@/lib/adapters/markdown";
import { BriefingIntro, ReportBody } from "@/components/briefing/views";

export const metadata = { title: "Research Report" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view, bundle } = await loadBriefing(id);
  const copy = messages[view.language];
  return (
    <>
      <BriefingIntro view={view} current="report" copy={copy} />
      <ReportBody view={view} copy={copy} markdown={briefingToMarkdown(view)} json={JSON.stringify(bundle, null, 2)} />
    </>
  );
}
