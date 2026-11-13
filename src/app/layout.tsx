import type { Metadata } from "next";
import type { ReactNode } from "react";
import { connection } from "next/server";
import "./globals.css";
import { PrototypeBanner, SiteFooter, SiteHeader } from "@/components/layout/chrome";
import { PageDock } from "@/components/layout/page-dock";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";
import { messagesForUi } from "@/lib/i18n/messages";
import { htmlLangFor, toAnalysisLanguage } from "@/lib/i18n/ui-language";

export const instant = false;

export const metadata: Metadata = {
  title: {
    default: "SpectraX AI",
    template: "%s · SpectraX AI",
  },
  description: "See Beyond the Headlines. Compare reporting, audit claims, and export a research briefing. Source badges follow data_mode.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  const provider = getPublicProviderStatus();
  const language = await readUiLanguage();
  return (
    <html lang={htmlLangFor(language)} className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
          {messagesForUi(language).skip}
        </a>
        <SiteHeader language={toAnalysisLanguage(language)} uiLanguage={language} provider={provider} />
        <PrototypeBanner provider={provider} />
        <main id="content" className="flex-1">{children}</main>
        <SiteFooter provider={provider} />
        <PageDock placement="viewport" language={language} />
      </body>
    </html>
  );
}
