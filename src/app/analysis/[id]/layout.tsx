import type { ReactNode } from "react";
import { connection } from "next/server";
import { ErrorPanel, UnsupportedSchemaPanel } from "@/components/states/panels";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { analysisFrame } from "@/lib/i18n/app-pages";
import { isAnalysisId } from "@/lib/analysis/ids";
import { SUPPORTED_SCHEMA_VERSIONS } from "@/lib/adapters/schema-version";
import { getBundleRecord } from "@/lib/store/bundle-store";

export const instant = false;

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const language = await readUiLanguage();
  const frame = analysisFrame(language);
  let unsupported: string | null = null;
  let invalid = false;
  if (isAnalysisId(id)) {
    await connection();
    const record = await getBundleRecord(id);
    if (record?.kind === "unsupported") unsupported = record.schemaVersion;
    if (record?.kind === "invalid") invalid = true;
  }
  return (
    <PaperFrame language={language} lead={frame.lead} points={frame.points}>
      {unsupported ? (
        <UnsupportedSchemaPanel found={unsupported} supported={SUPPORTED_SCHEMA_VERSIONS} language={language} />
      ) : invalid ? (
        <ErrorPanel language={language} />
      ) : (
        children
      )}
    </PaperFrame>
  );
}
