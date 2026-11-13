import type { Metadata } from "next";
import { messagesForUi } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { briefingToMarkdown } from "@/lib/adapters/markdown";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { BriefingIntro, ReportBody } from "@/components/briefing/views";
import { screenTitle } from "@/lib/i18n/app-pages";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "report") };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view, bundle } = await loadBriefing(id);
  const language = await readUiLanguage();
  const copy = messagesForUi(language);
  return (
    <>
      <BriefingIntro view={view} current="report" copy={copy} />
      <ReportBody view={view} copy={copy} markdown={briefingToMarkdown(view)} json={JSON.stringify(bundle, null, 2)} />
    </>
  );
}
