import type { ReactNode } from "react";
import { connection } from "next/server";
import { ErrorPanel, UnsupportedSchemaPanel } from "@/components/states/panels";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
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
  const zh = language === "zh";
  let unsupported: string | null = null;
  let invalid = false;
  if (isAnalysisId(id)) {
    await connection();
    const record = await getBundleRecord(id);
    if (record?.kind === "unsupported") unsupported = record.schemaVersion;
    if (record?.kind === "invalid") invalid = true;
  }
  return (
    <PaperFrame
      language={language}
      lead={
        zh
          ? "这一页读的是已经准备好的简报。三个分页不会再调用模型。"
          : "This page reads a prepared briefing. The three sections do not call a model."
      }
      points={
        zh
          ? [
              "真实来源样本使用报道链接，分析是 PRECOMPUTED。",
              "虚构演示保持 DEMO，不是真实新闻。",
              "证据核查只看单条主张，不对整件事下结论。",
            ]
          : [
              "The real-source sample uses reporting links. Its analysis is PRECOMPUTED.",
              "The fictional demonstration stays DEMO. It is not real news.",
              "Evidence audit checks claims one by one. It does not judge the whole story.",
            ]
      }
    >
      {unsupported ? (
        <UnsupportedSchemaPanel found={unsupported} supported={SUPPORTED_SCHEMA_VERSIONS} />
      ) : invalid ? (
        <ErrorPanel />
      ) : (
        children
      )}
    </PaperFrame>
  );
}
