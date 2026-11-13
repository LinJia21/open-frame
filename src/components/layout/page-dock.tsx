"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Language } from "@/lib/i18n/languages";

/**
 * App tab bar: 首页, 资料库, 订阅, 我的.
 * Subscribe and Me are named entries. Those sections are not open:
 * no plans, no charges, and no account.
 */
export function PageDock({
  placement,
  language,
}: {
  placement: "frame" | "viewport";
  language: Language;
}) {
  const pathname = usePathname();
  const copy = language === "zh" ? zhCopy : enCopy;
  const items = [
    { href: "/", label: copy.home, current: pathname === "/" || pathname === "/app", icon: HomeIcon },
    { href: "/library", label: copy.library, current: pathname.startsWith("/library"), icon: LibraryIcon },
    { href: "/subscribe", label: copy.subscribe, current: pathname.startsWith("/subscribe"), icon: SubscribeIcon },
    { href: "/me", label: copy.me, current: pathname.startsWith("/me"), icon: MeIcon },
  ] as const;

  return (
    <nav aria-label={copy.bottomLabel} className={placement === "frame" ? "news-dock" : "viewport-dock no-print"}>
      <div className="dock-row">
        {items.map((item) => {
          const Icon = item.icon;
          const body = (
            <>
              <Icon />
              <span>{item.label}</span>
            </>
          );
          return item.current ? (
            <span key={item.href} className="dock-tab" aria-current="page">
              {body}
            </span>
          ) : (
            <Link key={item.href} href={item.href} className="dock-tab">
              {body}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const zhCopy = {
  home: "首页",
  library: "资料库",
  subscribe: "订阅",
  me: "我的",
  bottomLabel: "底部菜单",
};

const enCopy = {
  home: "Home",
  library: "Library",
  subscribe: "Subscribe",
  me: "Me",
  bottomLabel: "Bottom menu",
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 10.5 12 4.5l7.5 6V19a1 1 0 0 1-1 1h-4.2v-5.2H9.7V20H5.5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h7.5L19 9v10.5H7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14.2 4.7V9H18.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function SubscribeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.2L6 20V5.5a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 19.2c1.2-2.6 3.4-3.9 6.5-3.9s5.3 1.3 6.5 3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
