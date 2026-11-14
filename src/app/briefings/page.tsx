import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { toSummary } from "@/lib/adapters/to-view";
import { FIXTURE_IDS } from "@/lib/analysis/fixture-ids";
import { screenTitle } from "@/lib/i18n/app-pages";
import { subpageCopy } from "@/lib/i18n/subpages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { listBundles } from "@/lib/store/bundle-store";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalysisBundle } from "@/lib/openframe/openframe";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return { title: screenTitle(await readUiLanguage(), "briefings") };
}

export default function BriefingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <BriefingsData />
    </Suspense>
  );
}

async function BriefingsData() {
  await connection();
  const language = await readUiLanguage();
  const copy = subpageCopy(language).briefings;
  let bundles: AnalysisBundle[] = [];
  let failed = false;
  try {
    bundles = await listBundles();
  } catch {
    failed = true;
  }
  const fixtureIds = new Set<string>(FIXTURE_IDS);
  const fixtures = bundles.filter((bundle) => fixtureIds.has(bundle.bundle_id));
  const local = bundles.filter((bundle) => !fixtureIds.has(bundle.bundle_id));
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
      {failed ? (
        <section className="topic-card mt-4" role="alert">
          <h2 className="text-[1.15rem] font-bold">{copy.errorTitle}</h2>
          <p className="mt-2 text-[15px] leading-7">{copy.errorBody}</p>
          <a href="/briefings" className="paper-action mt-4 inline-flex">
            {copy.retry}
          </a>
        </section>
      ) : (
        <>
          <section className="mt-5" aria-labelledby="prepared-briefings">
            <h2 id="prepared-briefings" className="text-[1.15rem] font-bold">
              {copy.fixturesTitle}
            </h2>
            <ul className="mt-3 space-y-3">
              {fixtures.map((bundle) => (
                <BriefingRow key={bundle.bundle_id} bundle={bundle} language={language} />
              ))}
            </ul>
          </section>
          <section className="mt-6" aria-labelledby="local-briefings">
            <h2 id="local-briefings" className="text-[1.15rem] font-bold">
              {copy.localTitle}
            </h2>
            {local.length === 0 ? (
              <div className="topic-card mt-3" role="status">
                <h3 className="text-[1.05rem] font-bold">{copy.localEmptyTitle}</h3>
                <p className="mt-2 text-[15px] leading-7">{copy.localEmptyBody}</p>
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {local.map((bundle) => (
                  <BriefingRow key={bundle.bundle_id} bundle={bundle} language={language} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      <Link href="/library" className="paper-action-quiet mt-4 inline-flex">
        {copy.backLibrary}
      </Link>
    </PaperFrame>
  );
}

function BriefingRow({ bundle, language }: { bundle: AnalysisBundle; language: UiLanguage }) {
  const copy = subpageCopy(language);
  const summary = toSummary(bundle);
  const badge = summary.generic ? copy.briefings.generic : copy.briefings.prepared;
  return (
    <li className="topic-card">
      <p className="text-xs text-muted-foreground">
        <span className="lav-badge">{badge}</span> {summary.sourceLabel} · data_mode {summary.dataMode}
      </p>
      <h3 className="mt-2 text-[1.05rem] font-bold">{summary.subject}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href={`/analysis/${bundle.bundle_id}/perspectives`} className="paper-action">
          {copy.story.openPerspectives}
        </Link>
        <Link href={`/analysis/${bundle.bundle_id}/evidence`} className="paper-action-quiet">
          {copy.story.openEvidence}
        </Link>
        <Link href={`/analysis/${bundle.bundle_id}/report`} className="paper-action-quiet">
          {copy.story.openReport}
        </Link>
      </div>
    </li>
  );
}
