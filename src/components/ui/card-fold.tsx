"use client";

import { useState, type ReactNode } from "react";

export function CardFold({
  label,
  openLabel,
  children,
  startOpen = false,
}: {
  label: string;
  openLabel?: string;
  children: ReactNode;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className="mt-3">
      <button type="button" className="paper-action-quiet w-full" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {open ? (openLabel ?? label) : label}
      </button>
      <div className="card-fold" data-open={open ? "true" : "false"}>
        <div>
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
