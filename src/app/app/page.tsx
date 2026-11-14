import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { NewsHome } from "@/components/home/news-home";
import { homeCardViews } from "@/lib/home/feed";
import { readUiLanguage } from "@/components/layout/paper-frame";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tab?: string }>;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <AppData searchParams={searchParams} />
    </Suspense>
  );
}

async function AppData({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  await connection();
  const params = await searchParams;
  if (params.tab === "foryou") redirect("/for-you");
  if (params.tab === "locate") redirect("/locate");
  const language = await readUiLanguage();
  return (
    <div className="app-frame">
      <NewsHome cards={homeCardViews()} initialQuery={params.q ?? ""} language={language} />
    </div>
  );
}
