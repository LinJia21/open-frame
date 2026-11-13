import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { MePanel } from "@/components/home/me-panel";
import { meCopy } from "@/lib/i18n/app-pages";

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
