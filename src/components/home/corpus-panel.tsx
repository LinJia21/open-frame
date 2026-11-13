"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { UiLanguage } from "@/lib/i18n/ui-language";
import { corpusCopy } from "@/lib/i18n/corpus-copy";
import { providerErrorText } from "@/lib/i18n/provider-copy";
import type { PublicProviderStatus } from "@/lib/analysis/provider-status";

interface LibraryStats {
  itemCount: number;
  outletCount: number;
  cutoff: string | null;
}

interface SavedRow {
  id: string;
  event: string;
  outlet: string;
  title: string;
  publishedAt: string | null;
  originalUrl: string;
  savedAt: string;
  completeness: "full_text" | "summary_only" | "title_only";
  syndication: "original" | "reprint" | "unknown";
  fixture: "test" | null;
  truncated: boolean;
  preview: string | null;
}

interface SearchPayload {
  ok?: boolean;
  data?: {
    mode: "saved_history";
    liveInternetSearch: false;
    listedAll: boolean;
    library: LibraryStats;
    hits: { itemCount: number; outletCount: number };
    items: SavedRow[];
  };
  errors?: Array<{ message?: string }>;
}

export function CorpusPanel({
  language,
  provider,
  selectedIds,
  onSelectedIds,
  showHeading = true,
}: {
  language: UiLanguage;
  provider: PublicProviderStatus;
  selectedIds: string[];
  onSelectedIds: (ids: string[]) => void;
  showHeading?: boolean;
}) {
  const copy = corpusCopy(language);
  const [query, setQuery] = useState("");
  const [event, setEvent] = useState("");
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [library, setLibrary] = useState<LibraryStats>({ itemCount: 0, outletCount: 0, cutoff: null });
  const [hits, setHits] = useState({ itemCount: 0, outletCount: 0 });
  const [listedAll, setListedAll] = useState(true);
  const [importText, setImportText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [pending, setPending] = useState(false);
  const [searching, setSearching] = useState(true);
  const ticketRef = useRef(0);
  const hasData = useRef(false);

  async function load(nextQuery = query, nextEvent = event) {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    setSearching(true);
    setError(null);
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextEvent.trim()) params.set("event", nextEvent.trim());
    try {
      const response = await fetch(`/api/corpus?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as SearchPayload;
      if (ticket !== ticketRef.current) return;
      if (!response.ok || !payload.ok || !payload.data) {
        setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.loadFailed);
        if (!hasData.current) setPhase("error");
        return;
      }
      hasData.current = true;
      setLibrary(payload.data.library);
      setHits(payload.data.hits);
      setListedAll(payload.data.listedAll);
      setRows(payload.data.items);
      setPhase("ready");
    } catch {
      if (ticket !== ticketRef.current) return;
      setError(copy.loadFailed);
      if (!hasData.current) setPhase("error");
    } finally {
      if (ticket === ticketRef.current) setSearching(false);
    }
  }

  useEffect(() => {
    const ticket = ticketRef.current + 1;
    ticketRef.current = ticket;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/corpus", { cache: "no-store" });
        const payload = (await response.json()) as SearchPayload;
        if (cancelled || ticket !== ticketRef.current) return;
        if (!response.ok || !payload.ok || !payload.data) {
          setError(copy.loadFailed);
          if (!hasData.current) setPhase("error");
          return;
        }
        hasData.current = true;
        setLibrary(payload.data.library);
        setHits(payload.data.hits);
        setListedAll(payload.data.listedAll);
        setRows(payload.data.items);
        setPhase("ready");
        setError(null);
      } catch {
        if (cancelled || ticket !== ticketRef.current) return;
        setError(copy.loadFailed);
        if (!hasData.current) setPhase("error");
      } finally {
        if (!cancelled && ticket === ticketRef.current) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.loadFailed]);

  function toggle(id: string) {
    onSelectedIds(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  }

  async function onImport() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/corpus", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: importText,
      });
      const payload = (await response.json()) as SearchPayload;
      if (!response.ok || !payload.ok) {
        setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.formatHint);
        return;
      }
      setImportText("");
      await load();
    } catch {
      setError(copy.formatHint);
    } finally {
      setPending(false);
    }
  }

  const completeness = {
    full_text: copy.fullText,
    summary_only: copy.summaryOnly,
    title_only: copy.titleOnly,
  };
  const syndication = {
    original: copy.original,
    reprint: copy.reprint,
    unknown: copy.unknown,
  };

  return (
    <section className="topic-card" aria-labelledby={showHeading ? "saved-library-title" : undefined} aria-busy={phase === "loading" || searching}>
      {showHeading ? <h2 id="saved-library-title" className="text-[1.35rem] font-bold">{copy.title}</h2> : null}
      <p className={showHeading ? "mt-2 text-[15px] leading-7 text-[#3a342c]" : "text-[15px] leading-7 text-[#3a342c]"}>{copy.intro}</p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          void load();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="corpus-query">{copy.searchLabel}</Label>
          <input id="corpus-query" value={query} onChange={(change) => setQuery(change.target.value)} className="paper-field" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="corpus-event">{copy.eventLabel}</Label>
          <input id="corpus-event" value={event} onChange={(change) => setEvent(change.target.value)} className="paper-field" />
        </div>
        <button type="submit" className="paper-action w-full" disabled={searching || pending}>
          {searching ? copy.searching : copy.search}
        </button>
      </form>
      {phase === "loading" ? (
        <p className="paper-note mt-4 text-[15px] leading-7" role="status">{copy.searching}</p>
      ) : null}
      {phase === "error" ? (
        <div className="paper-note mt-4" role="alert">
          <p className="text-[15px] leading-7">{error ?? copy.loadFailed}</p>
          <button type="button" className="paper-action mt-3 w-full" disabled={searching} onClick={() => void load()}>
            {searching ? copy.searching : copy.retry}
          </button>
        </div>
      ) : null}
      {phase === "ready" ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Stat label={copy.libraryItems} value={String(library.itemCount)} />
            <Stat label={copy.libraryOutlets} value={String(library.outletCount)} />
            <Stat label={copy.hitItems} value={String(hits.itemCount)} />
            <Stat label={copy.hitOutlets} value={String(hits.outletCount)} />
          </dl>
          <p className="mt-3 text-[13px] leading-6 text-muted-foreground">
            {copy.cutoff}: {library.cutoff ?? copy.noCutoff}
          </p>
          {listedAll ? <p className="mt-2 text-[13px] leading-6 text-muted-foreground">{copy.listedAll}</p> : null}
          {rows.length === 0 ? (
            <p className="paper-note mt-3 text-[15px] leading-7" role="status">{library.itemCount === 0 ? copy.empty : copy.noHits}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {rows.map((row) => (
                <li key={row.id} className="rounded-[1.15rem] border border-border bg-[#f4efe6] p-3">
                  <label className="flex min-h-11 cursor-pointer gap-3">
                    <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggle(row.id)} className="mt-1 size-5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{row.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                        {row.outlet} · {row.event} · {completeness[row.completeness]} · {syndication[row.syndication]}
                        {row.fixture === "test" ? ` · ${copy.testFixture}` : ""}
                        {row.truncated ? ` · ${copy.truncated}` : ""}
                      </span>
                      <span className="mt-1 block break-all text-xs text-muted-foreground">{row.originalUrl}</span>
                      {row.preview ? <span className="mt-1 block text-sm leading-6">{row.preview}</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm">{copy.selected}: {selectedIds.length}</p>
        </>
      ) : null}
      {provider.provider === "cursor" ? <p className="mt-2 text-sm text-muted-foreground">{copy.demoSeparate}</p> : <p className="mt-2 text-sm text-muted-foreground">{copy.needsCursor}</p>}
      <div className="mt-4 space-y-2">
        <Label htmlFor="corpus-import">{copy.importLabel}</Label>
        <Textarea id="corpus-import" value={importText} onChange={(change) => setImportText(change.target.value)} rows={6} placeholder='{"items":[]}' className="paper-field min-h-32" />
        <p className="text-xs leading-5 text-muted-foreground">{copy.formatHint}</p>
        <button type="button" className="paper-action w-full" disabled={pending || importText.trim().length === 0} onClick={() => void onImport()}>
          {pending ? copy.importing : copy.import}
        </button>
      </div>
      {error && phase === "ready" ? (
        <Alert variant="destructive" className="mt-3">
          <AlertTitle>{error}</AlertTitle>
          <AlertDescription>{copy.formatHint}</AlertDescription>
        </Alert>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-border bg-[#f4efe6] p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}
