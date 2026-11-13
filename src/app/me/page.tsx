import Link from "next/link";
import { PaperFrame, readUiLanguage } from "@/components/layout/paper-frame";
import { meCopy } from "@/lib/i18n/app-pages";

export default async function MePage() {
  const language = await readUiLanguage();
  const copy = meCopy(language);
  return (
    <PaperFrame language={language} lead={copy.lead} points={copy.points}>
      <p className="wordmark text-[1.85rem]">SpectraX</p>
      <h1 className="mt-4 text-[1.75rem] font-bold">{copy.title}</h1>
      <section className="topic-card mt-5">
        <div className="flex items-center gap-3">
          <span className="profile-mark" aria-hidden="true">
            <PersonMark />
          </span>
          <div className="min-w-0">
            <p className="text-[1.25rem] font-bold">{copy.name}</p>
            <span className="lav-badge mt-1">{copy.badge}</span>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-7 text-[#3a342c]">{copy.intro}</p>
      </section>
      <ul className="mt-4 space-y-3">
        <li>
          <Link href="/settings" className="topic-card menu-row">
            <span>
              <span className="block text-[16px] font-bold">{copy.settings}</span>
              <span className="mt-1 block text-[13px] leading-6 text-muted-foreground">{copy.settingsHint}</span>
            </span>
            <span className="scope-pill">{copy.settingsState}</span>
          </Link>
        </li>
        <li className="topic-card menu-row">
          <span>
            <span className="block text-[16px] font-bold">{copy.account}</span>
            <span className="mt-1 block text-[13px] leading-6 text-muted-foreground">{copy.accountHint}</span>
          </span>
          <span className="lav-badge">{copy.accountState}</span>
        </li>
      </ul>
      <button type="button" className="closed-action mt-4" disabled>
        {copy.login}
      </button>
      <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{copy.loginHint}</p>
    </PaperFrame>
  );
}

function PersonMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-7">
      <circle cx="12" cy="8.2" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19.2c1.2-2.6 3.4-3.9 6.5-3.9s5.3 1.3 6.5 3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
