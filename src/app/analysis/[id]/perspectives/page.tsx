import type { Metadata } from "next";
import { messagesForUi } from "@/lib/i18n/messages";
import { loadBriefing } from "@/lib/analysis/load";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { BriefingIntro, PerspectivesBody } from "@/components/briefing/views";
import { screenTitle } from "@/lib/i18n/app-pages";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "perspectives") };
}

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
