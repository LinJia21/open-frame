"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UiLanguage } from "@/lib/i18n/ui-language";

const LABEL: Record<"zh" | "zh-Hant" | "en", string> = {
  zh: "内容范围",
  "zh-Hant": "內容範圍",
  en: "Scope",
};

export function ScopeNav({ language }: { language: UiLanguage }) {
  const pathname = usePathname();
  const label = language === "zh" || language === "zh-Hant" ? LABEL[language] : LABEL.en;
  const items = [
    { href: "/", name: "All", current: pathname === "/" || pathname === "/app" },
    { href: "/for-you", name: "For You", current: pathname.startsWith("/for-you") },
    { href: "/locate", name: "Locate", current: pathname.startsWith("/locate") },
  ];
  return (
    <nav aria-label={label} className="scope-row">
      {items.map((item) => (
        <Link key={item.href} href={item.href} className="scope-pill" aria-current={item.current ? "page" : undefined}>
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
