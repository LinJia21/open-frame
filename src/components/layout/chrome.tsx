import Link from "next/link";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";

export function FrameMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8">
      <rect x="2" y="2" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="10" y="10" width="12" height="12" fill="#c46a3a" />
    </svg>
  );
}

export function SiteHeader() {
  return (
    <header className="no-print border-b border-[#ddd6c8] bg-[#f7f4ee] text-[#1c1915]">
      <div className="mx-auto flex max-w-[40rem] items-baseline justify-between gap-4 px-5 py-4">
        <Link href="/" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1c1915]">
          <span className="text-[1.375rem] font-medium leading-none tracking-[-0.02em]">OpenFrame</span>
        </Link>
        <span className="text-[13px] leading-5 text-[#3a342c]">See Beyond the Headlines</span>
      </div>
    </header>
  );
}

export function PrototypeBanner({ provider }: { provider: PublicProviderStatus }) {
  const demo = provider.provider === "demo";
  return (
    <div className="no-print border-b border-[#ddd6c8] bg-[#f7f4ee] text-[#5c564c]">
      <p className="mx-auto max-w-[40rem] px-4 py-2 text-[0.8rem] leading-5 sm:px-6">
        {demo
          ? "Provider: demonstration. This screen does not call a model. Prepared analyses are pre-generated. Source badges follow data_mode."
          : provider.note}
      </p>
    </div>
  );
}

export function SourceBadge({ label, mode }: { label: string; mode: string }) {
  const fictional = mode === "DEMO";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${fictional ? "bg-[#8d4324] text-white" : "bg-sky-100 text-sky-950"}`}>
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
            current === key ? "border-[#8d4324] bg-[#8d4324] text-white" : "border-border bg-card"
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
    ? "OpenFrame AI is a research prototype. The demonstration provider does not call a model. Prepared analyses are pre-generated. The fictional set uses reserved domains; the primary sample uses the fixture’s source links."
    : `${provider.note} Live calls are not marked verified on this screen.`;
  return (
    <footer className="no-print border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6">
      {body}
    </footer>
  );
}
