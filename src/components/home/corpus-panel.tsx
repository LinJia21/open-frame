"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
}: {
  language: UiLanguage;
  provider: PublicProviderStatus;
  selectedIds: string[];
  onSelectedIds: (ids: string[]) => void;
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
  const [pending, setPending] = useState(false);

  async function load(nextQuery = query, nextEvent = event) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextEvent.trim()) params.set("event", nextEvent.trim());
    const response = await fetch(`/api/corpus?${params.toString()}`, { cache: "no-store" });
    const payload = (await response.json()) as SearchPayload;
    if (!response.ok || !payload.ok || !payload.data) {
      setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.empty);
      return;
    }
    setLibrary(payload.data.library);
    setHits(payload.data.hits);
    setListedAll(payload.data.listedAll);
    setRows(payload.data.items);
    setError(null);
  }

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/corpus", { cache: "no-store" });
      const payload = (await response.json()) as SearchPayload;
      if (!response.ok || !payload.ok || !payload.data) return;
      setLibrary(payload.data.library);
      setHits(payload.data.hits);
      setListedAll(payload.data.listedAll);
      setRows(payload.data.items);
    })();
  }, []);

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
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-serif text-2xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy.intro}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Stat label={copy.cutoff} value={library.cutoff ?? copy.noCutoff} />
        <Stat label={copy.libraryItems} value={String(library.itemCount)} />
        <Stat label={copy.libraryOutlets} value={String(library.outletCount)} />
        <Stat label={copy.hitOutlets} value={`${hits.outletCount} / ${copy.hitItems} ${hits.itemCount}`} />
      </dl>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          void load();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="corpus-query">{copy.searchLabel}</Label>
          <input id="corpus-query" value={query} onChange={(change) => setQuery(change.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="corpus-event">{copy.eventLabel}</Label>
          <input id="corpus-event" value={event} onChange={(change) => setEvent(change.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" />
        </div>
        <Button type="submit" className="h-10 sm:self-end">{copy.search}</Button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">{listedAll ? copy.listedAll : copy.intro}</p>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border p-3 text-sm">{library.itemCount === 0 ? copy.empty : copy.noHits}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border p-3">
              <label className="flex gap-3">
                <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggle(row.id)} className="mt-1" />
                <span>
                  <span className="block font-medium">{row.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {row.outlet} · {row.event} · {completeness[row.completeness]} · {syndication[row.syndication]}
                    {row.fixture === "test" ? ` · ${copy.testFixture}` : ""}
                    {row.truncated ? ` · ${copy.truncated}` : ""}
                  </span>
                  <span className="mt-1 block break-all text-xs text-muted-foreground">{row.originalUrl}</span>
                  {row.preview ? <span className="mt-1 block text-sm">{row.preview}</span> : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm">{copy.selected}: {selectedIds.length}</p>
      {provider.provider === "cursor" ? <p className="text-sm text-muted-foreground">{copy.demoSeparate}</p> : <p className="text-sm text-muted-foreground">{copy.needsCursor}</p>}
      <div className="mt-4 space-y-2">
        <Label htmlFor="corpus-import">{copy.importLabel}</Label>
        <Textarea id="corpus-import" value={importText} onChange={(change) => setImportText(change.target.value)} rows={6} placeholder='{"items":[]}' />
        <p className="text-xs text-muted-foreground">{copy.formatHint}</p>
        <Button type="button" disabled={pending || importText.trim().length === 0} onClick={() => void onImport()}>
          {pending ? copy.importing : copy.import}
        </Button>
      </div>
      {error ? (
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
    <div className="rounded-lg border border-border bg-background p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium">{value}</dd>
    </div>
  );
}
