import { connection } from "next/server";
import { cookies } from "next/headers";
import { RunPanel } from "@/components/analysis/run-panel";
import { isLanguage, type Language } from "@/lib/i18n/languages";

export const metadata = { title: "Cursor run" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const jar = await cookies();
  const cookie = jar.get("openframe_lang")?.value;
  const language: Language = isLanguage(cookie) ? cookie : "en";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <RunPanel jobId={id} language={language} />
    </div>
  );
}
