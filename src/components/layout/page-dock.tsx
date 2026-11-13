"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Language } from "@/lib/i18n/languages";

/**
 * Bottom bar for the paper layout.
 * The pale-yellow pill is only the page you are actually on.
 * The three icons stay unnamed and are not links: the repo has not named them.
 * Follow and Me are not pages here. Settings and the library link are the real entries.
 */
export function PageDock({
  placement,
  language,
}: {
  placement: "frame" | "viewport";
  language: Language;
}) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const onSettings = pathname.startsWith("/settings");
  const onLibrary = pathname.startsWith("/library");
  const copy = language === "zh" ? zhCopy : enCopy;

  return (
    <nav aria-label={copy.bottomLabel} className={placement === "frame" ? "news-dock" : "viewport-dock no-print"}>
      <div className="dock-row">
        {onHome ? (
          <span className="dock-pill" aria-current="page">
            {copy.home}
          </span>
        ) : (
          <Link href="/" className="dock-pill">
            {copy.home}
          </Link>
        )}
        <div className="dock-icons" role="group" aria-label={copy.pendingGroup}>
          <MarkIcon />
          <LinesIcon />
          <SquareIcon />
        </div>
        {onSettings ? (
          <span className="dock-pill" aria-current="page">
            {copy.settings}
          </span>
        ) : (
          <Link href="/settings" className="dock-pill">
            {copy.settings}
          </Link>
        )}
      </div>
      <p className="dock-note">
        {copy.pendingNote}{" "}
        <Link href="/library" className="paper-link" aria-current={onLibrary ? "page" : undefined}>
          {copy.library}
        </Link>
      </p>
    </nav>
  );
}

const zhCopy = {
  home: "首页",
  settings: "设置",
  library: "资料库",
  bottomLabel: "底部入口",
  pendingGroup: "导航待确认，这三个图标没有名称，不能点击",
  pendingNote: "导航待确认。这三个图标没有名称，也不能点。资料库在设置里，也可以从这里打开：",
};

const enCopy = {
  home: "Home",
  settings: "Settings",
  library: "Library",
  bottomLabel: "Bottom entries",
  pendingGroup: "Navigation not confirmed. These three icons have no name and are not clickable.",
  pendingNote: "Navigation is not confirmed. These three icons have no name and cannot be used. The library is linked from Settings, and also here:",
};

function MarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h7.5L19 9v10.5H7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.2 4.7V9H18.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function LinesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5h14M5 12h14M5 16.5h9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SquareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
