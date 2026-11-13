import Link from "next/link";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { missingRoute } from "@/lib/i18n/app-pages";

export default async function NotFound() {
  const language = await readUiLanguage();
  const copy = missingRoute(language);
  return (
    <PaperFrame language={language} lead={copy.lead}>
      <div className="paper-card space-y-3 p-6">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="text-[15px] leading-7 text-[#3a342c]">{copy.body}</p>
        <Link href="/" className="paper-link text-sm">
          {copy.home}
        </Link>
      </div>
    </PaperFrame>
  );
}
