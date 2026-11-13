"use client";

import Image from "next/image";
import Link from "next/link";

const LOCKUP = {
  light: "/brand/lockup-horizontal-light.svg",
  dark: "/brand/lockup-horizontal-dark.svg",
} as const;

const LOCKUP_WIDTH = 1360;
const LOCKUP_HEIGHT = 190;

export function ProductLockup({
  tone,
  variant,
}: {
  tone: keyof typeof LOCKUP;
  variant: "header" | "stage" | "chrome";
}) {
  return (
    <Image
      src={LOCKUP[tone]}
      alt="SpectraX"
      width={LOCKUP_WIDTH}
      height={LOCKUP_HEIGHT}
      unoptimized
      priority={variant === "header"}
      className={`brand-lockup brand-lockup-${variant}`}
    />
  );
}

export function HeaderLockup() {
  return (
    <Link href="/" className="brand-lockup-link">
      <ProductLockup tone="light" variant="header" />
    </Link>
  );
}

export function StageLockup() {
  return <ProductLockup tone="light" variant="stage" />;
}
