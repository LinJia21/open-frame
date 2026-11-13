import type { ReactNode } from "react";
import { connection } from "next/server";
import { ErrorPanel, UnsupportedSchemaPanel } from "@/components/states/panels";
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
  let unsupported: string | null = null;
  let invalid = false;
  if (isAnalysisId(id)) {
    await connection();
    const record = await getBundleRecord(id);
    if (record?.kind === "unsupported") unsupported = record.schemaVersion;
    if (record?.kind === "invalid") invalid = true;
  }
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {unsupported ? (
        <UnsupportedSchemaPanel found={unsupported} supported={SUPPORTED_SCHEMA_VERSIONS} />
      ) : invalid ? (
        <ErrorPanel />
      ) : (
        children
      )}
    </div>
  );
}
