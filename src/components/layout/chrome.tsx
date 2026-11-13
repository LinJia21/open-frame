import Link from "next/link";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";
import type { Language } from "@/lib/i18n/languages";
import { AppEntry } from "@/components/layout/app-entry";
import { HeaderTopic } from "@/components/layout/header-topic";
import { LanguageMenu } from "@/components/layout/language-menu";

export function FrameMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
      <rect x="2" y="2" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="10" width="12" height="12" fill="var(--of-mark)" />
    </svg>
  );
}

export function SiteHeader({ language, provider }: { language: Language; provider: PublicProviderStatus }) {
  return (
    <header className="site-header no-print sticky top-0 z-40 border-b border-white/10 bg-of-ink text-of-ink-foreground">
      <div className="header-bar mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="header-brand flex shrink-0 items-center gap-3">
          <FrameMark />
          <span>
            <span className="font-serif text-xl leading-none">OpenFrame</span>
            <span className="header-tagline mt-1 hidden text-xs tracking-wide text-white/70 sm:block">See Beyond the Headlines.</span>
          </span>
        </Link>
        <HeaderTopic language={language} provider={provider} />
        <nav aria-label="页面" className="header-nav flex shrink-0 items-center gap-3 text-xs tracking-[0.14em] whitespace-nowrap text-white/70 sm:gap-4">
          <Link href="/library" className="hover:text-white">
            资料库<span className="sr-only"> Library</span>
          </Link>
          <Link href="/settings" className="hover:text-white">
            设置<span className="sr-only"> Settings</span>
          </Link>
          <LanguageMenu language={language} />
          <AppEntry />
        </nav>
      </div>
    </header>
  );
}

export function PrototypeBanner({ provider }: { provider: PublicProviderStatus }) {
  const demo = provider.provider === "demo";
  return (
    <div className="prototype-banner no-print border-b border-of-cream-border bg-of-cream text-of-cream-foreground">
      <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm leading-snug sm:px-6">
        {demo
          ? "This prototype does not call a model. Every analysis on screen is pre-generated. Source badges say whether the underlying articles are real or fictional."
          : provider.note}
      </p>
    </div>
  );
}

export function SourceBadge({ label, mode }: { label: string; mode: string }) {
  const fictional = mode === "DEMO";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${fictional ? "bg-of-accent text-of-accent-foreground" : "bg-sky-100 text-sky-950"}`}>
      {label}
      {fictional ? <span className="tracking-[0.12em]">DEMO DATA</span> : null}
    </span>
  );
}

export function AnalysisBadge({ label, generatedAt }: { label: string; generatedAt: string | null }) {
  return (
    <span title={generatedAt ? `Generated ${generatedAt}` : undefined} className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-900">
      {label}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  Verified: "bg-emerald-100 text-emerald-950 ring-emerald-200",
  "Partially Supported": "bg-sky-100 text-sky-950 ring-sky-200",
  Disputed: "bg-amber-100 text-amber-950 ring-amber-200",
  Unverified: "bg-slate-100 text-slate-800 ring-slate-200",
  Contradicted: "bg-rose-100 text-rose-950 ring-rose-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_TONE[status] ?? "bg-muted"}`}>
      {status}
    </span>
  );
}

export function AnalysisNav({
  id,
  current,
  labels,
}: {
  id: string;
  current: "perspectives" | "evidence" | "report" | null;
  labels: { perspectives: string; evidence: string; report: string; progress: string };
}) {
  const items = [
    ["perspectives", labels.perspectives, `/analysis/${id}/perspectives`],
    ["evidence", labels.evidence, `/analysis/${id}/evidence`],
    ["report", labels.report, `/analysis/${id}/report`],
  ] as const;
  return (
    <nav aria-label={labels.progress} className="no-print grid grid-cols-3 gap-2">
      {items.map(([key, label, href], index) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? "page" : undefined}
          className={`rounded-lg border px-2 py-2 text-center text-sm ${
            current === key ? "border-of-accent bg-of-accent text-of-accent-foreground" : "border-border bg-card"
          }`}
        >
          <span className="block text-[10px] tracking-widest opacity-80">0{index + 1}</span>
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteFooter({ provider }: { provider: PublicProviderStatus }) {
  const body = provider.provider === "demo"
    ? "OpenFrame AI is a research prototype. It does not call a model. Analyses are pre-generated. The fictional set uses reserved domains; the primary sample uses the fixture’s source links."
    : `${provider.note} Live calls are not marked verified on this screen.`;
  return (
    <footer className="no-print border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
      {body}
    </footer>
  );
}
