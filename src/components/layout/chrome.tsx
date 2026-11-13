import Link from "next/link";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";
import type { Language } from "@/lib/i18n/languages";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { AppEntry } from "@/components/layout/app-entry";
import { ProductLockup } from "@/components/layout/brand-lockup";
import { HeaderTopic } from "@/components/layout/header-topic";
import { LanguageMenu } from "@/components/layout/language-menu";

const headerLabels: Record<UiLanguage, { nav: string; library: string; settings: string }> = {
  en: { nav: "Pages", library: "Library", settings: "Settings" },
  zh: { nav: "页面", library: "资料库", settings: "设置" },
  "zh-Hant": { nav: "頁面", library: "資料庫", settings: "設定" },
  es: { nav: "Páginas", library: "Biblioteca", settings: "Ajustes" },
  fr: { nav: "Pages", library: "Bibliothèque", settings: "Réglages" },
};

export function SiteHeader({
  language,
  uiLanguage,
  provider,
}: {
  language: Language;
  uiLanguage?: UiLanguage;
  provider: PublicProviderStatus;
}) {
  const labels = headerLabels[uiLanguage ?? language];
  return (
    <header className="site-header no-print sticky top-0 z-40 border-b border-white/10 bg-of-ink text-of-ink-foreground">
      <div className="header-bar mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:flex-nowrap sm:px-6">
        <Link href="/" className="header-brand flex shrink-0 items-center gap-3">
          <span>
            <ProductLockup tone="dark" variant="chrome" />
            <span className="header-tagline mt-1 hidden text-xs tracking-wide text-white/70 sm:block">See Beyond the Headlines.</span>
          </span>
        </Link>
        <HeaderTopic language={language} provider={provider} />
        <nav aria-label={labels.nav} className="header-nav flex shrink-0 items-center gap-3 text-xs tracking-[0.14em] whitespace-nowrap text-white/70 sm:gap-4">
          <Link href="/library" className="hover:text-white">
            {labels.library}
          </Link>
          <Link href="/settings" className="hover:text-white">
            {labels.settings}
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
    <span className="lav-badge">
      {label}
      {fictional ? <span className="tracking-[0.12em]">DEMO DATA</span> : null}
    </span>
  );
}

export function AnalysisBadge({ label, generatedAt }: { label: string; generatedAt: string | null }) {
  return (
    <span title={generatedAt ? `Generated ${generatedAt}` : undefined} className="lav-badge">
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
    <nav aria-label={labels.progress} className="scope-row no-print">
      {items.map(([key, label, href]) => (
        <Link key={key} href={href} aria-current={current === key ? "page" : undefined} className="scope-pill">
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteFooter({ provider }: { provider: PublicProviderStatus }) {
  const body = provider.provider === "demo"
    ? "SpectraX AI is a research prototype. It does not call a model. Analyses are pre-generated. The fictional set uses reserved domains; the primary sample uses the fixture’s source links."
    : `${provider.note} Live calls are not marked verified on this screen.`;
  return (
    <footer className="no-print border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
      {body}
    </footer>
  );
}
