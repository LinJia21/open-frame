import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import { PrototypeBanner, SiteFooter, SiteHeader } from "@/components/layout/chrome";
import { PageDock } from "@/components/layout/page-dock";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { isLanguage, languageOption, type Language } from "@/lib/i18n/languages";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

export const instant = false;

export const metadata: Metadata = {
  title: {
    default: "OpenFrame AI",
    template: "%s · OpenFrame AI",
  },
  description: "See Beyond the Headlines. Compare reporting, audit claims, and export a research briefing. Source badges follow data_mode.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const provider = getPublicProviderStatus();
  const jar = await cookies();
  const cookie = jar.get("openframe_lang")?.value;
  const language: Language = isLanguage(cookie) ? cookie : "zh";
  const reportLanguage: Language = isLanguage(cookie) ? cookie : "en";
  return (
    <html lang={languageOption(language).htmlLang} className={`${sourceSans.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
          Skip to content
        </a>
        <SiteHeader language={reportLanguage} provider={provider} />
        <PrototypeBanner provider={provider} />
        <main id="content" className="flex-1">{children}</main>
        <SiteFooter provider={provider} />
        <PageDock placement="viewport" language={language} />
      </body>
    </html>
  );
}
