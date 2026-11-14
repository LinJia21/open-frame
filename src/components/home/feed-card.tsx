import type { ReactNode } from "react";
import Link from "next/link";
import { StoryFigure } from "@/components/media/story-figure";

const SOURCE_SWATCHES = ["var(--of-cream)", "var(--of-live)", "var(--of-neutral)", "var(--of-cream-border)", "var(--of-mark)"];

export function FeedCard({
  title,
  href,
  kicker,
  tone,
  sourceLine,
  sourceName,
  imageNote,
  heatLabel,
  heat,
  verify,
  children,
}: {
  title: string;
  href: string;
  kicker: string;
  tone: "live" | "demo" | "neutral";
  sourceLine: string;
  sourceName: string | null;
  imageNote: string;
  heatLabel: string;
  heat: string;
  verify?: string;
  children?: ReactNode;
}) {
  return (
    <article className="topic-card">
      <StoryFigure title={title} note={imageNote} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 flex-1 text-[1.35rem] font-bold leading-[1.35] text-foreground">
          <Link href={href} className="text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground">
            {title}
          </Link>
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-[13px] leading-[1.4] text-muted-foreground">
            <span className="sr-only">{heatLabel} </span>
            {heat}
          </p>
          <span className="lav-badge" data-tone={tone}>
            {kicker}
          </span>
        </div>
      </div>
      <p className="mt-3 flex min-w-0 items-center gap-2 text-[15px] leading-[1.7] text-foreground">
        <SourceMark name={sourceName} />
        <span className="min-w-0">
          <span className="lav-kicker">{kicker}</span> {sourceLine}
        </span>
      </p>
      {children}
      {verify ? <p className="mt-3 text-[13px] leading-[1.55] text-muted-foreground">{verify}</p> : null}
    </article>
  );
}

function SourceMark({ name }: { name: string | null }) {
  if (!name) return null;
  const swatch = SOURCE_SWATCHES[name.charCodeAt(0) % SOURCE_SWATCHES.length] ?? SOURCE_SWATCHES[0];
  return (
    <span className="source-mark" style={{ background: swatch }} aria-hidden="true">
      {name.slice(0, 1)}
    </span>
  );
}
