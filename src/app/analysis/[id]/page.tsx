import type { Metadata } from "next";
import { messagesForUi } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { BriefingIntro } from "@/components/briefing/views";
import { screenTitle } from "@/lib/i18n/app-pages";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "briefing") };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { view } = await loadBriefing(id);
  const language = await readUiLanguage();
  return <BriefingIntro view={view} current={null} copy={messagesForUi(language)} />;
}
