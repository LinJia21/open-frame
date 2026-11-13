import Link from "next/link";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import type { Metadata } from "next";
import { missingRoute, screenTitle } from "@/lib/i18n/app-pages";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "missing") };
}

export default async function NotFound() {
  const language = await readUiLanguage();
  const copy = missingRoute(language);
  return (
    <PaperFrame language={language} lead={copy.lead}>
      <div className="paper-card space-y-3 p-6">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="text-[15px] leading-7 text-[#3a342c]">{copy.body}</p>
        <Link href="/" className="paper-action mt-2 inline-flex">
          {copy.home}
        </Link>
      </div>
    </PaperFrame>
  );
}
