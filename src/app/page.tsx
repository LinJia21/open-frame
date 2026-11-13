import { Suspense } from "react";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { NewsHome } from "@/components/home/news-home";
import { homeCardViews } from "@/lib/home/feed";
import { isLanguage, type Language } from "@/lib/i18n/languages";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <HomeData searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeData({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  await connection();
  const params = await searchParams;
  const jar = await cookies();
  const cookie = jar.get("openframe_lang")?.value;
  const language: Language = isLanguage(cookie) ? cookie : "zh";
  const tab = params.tab === "foryou" || params.tab === "locate" ? params.tab : "all";
  return <NewsHome cards={homeCardViews()} initialQuery={params.q ?? ""} initialTab={tab} language={language} />;
}
