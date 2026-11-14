export const AUXILIARY_ICON_NAMES = [
  "viewfinder",
  "framed-volume",
  "corner-grid",
  "aperture",
  "newspaper",
  "focus-text",
  "clipping",
  "tone-c",
] as const;

export type AuxiliaryIconName = (typeof AUXILIARY_ICON_NAMES)[number];

export function AuxiliaryIcon({
  name,
  size = 36,
  className,
}: {
  name: AuxiliaryIconName;
  size?: number;
  className?: string;
}) {
  return (
    // Brand vectors stay files under public/brand/icons. The optimizer would rasterize them.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/brand/icons/${name}.svg`}
      alt=""
      width={size}
      height={size}
      aria-hidden="true"
      className={className ? `aux-mark ${className}` : "aux-mark"}
    />
  );
}

export function AsideMark() {
  return <AuxiliaryIcon name="tone-c" size={32} className="aux-mark-aside" />;
}

export function StoryCornerTicks() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className="story-corners">
      <path d="M4 18 V4 H18" fill="none" stroke="#231971" strokeWidth="2.4" />
      <path d="M82 4 H96 V18" fill="none" stroke="#231971" strokeWidth="2.4" />
      <path d="M4 82 V96 H18" fill="none" stroke="#231971" strokeWidth="2.4" />
      <path d="M82 96 H96 V82" fill="none" stroke="#231971" strokeWidth="2.4" />
    </svg>
  );
}
