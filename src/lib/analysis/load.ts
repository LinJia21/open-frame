import "server-only";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getBundle } from "@/lib/store/bundle-store";
import { fixtureById } from "@/lib/demo/catalog";
import { isAnalysisId } from "@/lib/analysis/ids";
import { toBriefingView, type BriefingView } from "@/lib/adapters/to-view";
import type { AnalysisBundle } from "@/lib/openframe/openframe";

export async function loadBriefing(id: string): Promise<{ view: BriefingView; bundle: AnalysisBundle }> {
  if (!isAnalysisId(id)) notFound();
  await connection();
  const bundle = (await getBundle(id)) ?? fixtureById(id);
  if (!bundle) notFound();
  return { view: toBriefingView(bundle), bundle };
}
