"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppEntry() {
  const pathname = usePathname();
  const inApp = pathname === "/app";
  return (
    <Link href={inApp ? "/" : "/app"} className="hover:text-white">
      {inApp ? "Web" : "App"}
    </Link>
  );
}
