import { connection } from "next/server";
import { RunPanel } from "@/components/analysis/run-panel";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { runFrame } from "@/lib/i18n/app-pages";

export const metadata = { title: "Cursor run" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const language = await readUiLanguage();
  const copy = runFrame(language);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
      <div className="mt-5">
        <RunPanel jobId={id} language={language} />
      </div>
    </PaperFrame>
  );
}
