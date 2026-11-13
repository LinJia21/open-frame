import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function BriefingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">Loading briefing</p>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export function NotFoundPanel() {
  return (
    <div className="mx-auto max-w-xl space-y-3 py-16">
      <h1 className="font-serif text-3xl">This briefing is not in the local store</h1>
      <p className="text-sm text-muted-foreground">
        The link may be mistyped, or the demo file was cleared. Start a new analysis from the home page.
      </p>
      <Link href="/" className="inline-flex text-sm paper-link underline-offset-2 hover:underline">
        Back to home
      </Link>
    </div>
  );
}

export function UnsupportedSchemaPanel({ found, supported }: { found: string; supported: readonly string[] }) {
  return (
    <div className="mx-auto max-w-xl space-y-3 py-16">
      <h1 className="font-serif text-3xl">This briefing uses a schema version this app does not read</h1>
      <p className="text-sm text-muted-foreground">
        Found schema_version <span className="font-mono text-foreground">{found}</span>. Supported versions:{" "}
        <span className="font-mono text-foreground">{supported.join(", ")}</span>. A version without its own mapping is
        left unread. This page does not guess one.
      </p>
      <Link href="/" className="inline-flex text-sm paper-link underline-offset-2 hover:underline">
        Back to home
      </Link>
    </div>
  );
}

export function ErrorPanel({ retry }: { retry?: () => void }) {
  return (
    <div className="mx-auto max-w-xl space-y-3 py-16">
      <h1 className="font-serif text-3xl">The briefing could not be loaded</h1>
      <p className="text-sm text-muted-foreground">Something went wrong while reading the local demo store.</p>
      {retry ? (
        <button type="button" onClick={retry} className="rounded-full bg-[#1c1915] px-4 py-2 text-sm text-[#fbf7f1]">
          Try again
        </button>
      ) : null}
      <Link href="/" className="block text-sm paper-link">
        Back to home
      </Link>
    </div>
  );
}
