import Link from "next/link";
import { connection } from "next/server";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { liveCorpusStore } from "@/lib/corpus/live";
import { homeEventCards } from "@/lib/home/feed";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { describeHomeSample, settingsFrame } from "@/lib/i18n/app-pages";

export default async function SettingsPage() {
  await connection();
  const language = await readUiLanguage();
  const copy = settingsFrame(language);
  const provider = getPublicProviderStatus();
  let libraryCount = 0;
  try {
    libraryCount = (await liveCorpusStore().search("", "")).library.itemCount;
  } catch {
    libraryCount = 0;
  }
  const cards = homeEventCards();
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <h1 className="text-[1.75rem] font-bold">{copy.title}</h1>
      <ul className="mt-6 space-y-4">
        <li className="topic-card">
          <Link href="/library" className="paper-link text-base font-medium">
            {copy.library}
          </Link>
          <p className="mt-2 text-base leading-7">{copy.libraryBody(libraryCount)}</p>
        </li>
        <li className="topic-card">
          <h2 className="text-base font-bold">{copy.provider}</h2>
          <p className="mt-2 text-base leading-7">{provider.note}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            provider {provider.provider} · liveCallVerified {String(provider.liveCallVerified)}。{copy.providerSecret}
          </p>
        </li>
        <li className="topic-card">
          <h2 className="text-base font-bold">{copy.samples}</h2>
          <p className="mt-2 text-base leading-7">{copy.samplesBody}</p>
          <ul className="mt-4 space-y-4">
            {cards.map((card) => (
              <li key={card.sampleKind + (card.bundleId ?? "layout")} className="text-base leading-7">
                <p className="font-medium">{card.title}</p>
                <p className="text-sm text-muted-foreground">{describeHomeSample(language, card)}</p>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </PaperFrame>
  );
}
