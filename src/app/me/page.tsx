import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { MePanel } from "@/components/home/me-panel";
import type { Metadata } from "next";
import { meCopy, screenTitle } from "@/lib/i18n/app-pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "me") };
}

export default async function MePage() {
  const language = await readUiLanguage();
  const copy = meCopy(language);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
      <MePanel copy={copy} />
    </PaperFrame>
  );
}
