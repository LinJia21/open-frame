import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { messagesForUi } from "@/lib/i18n/messages";
import type { UiLanguage } from "@/lib/i18n/ui-language";

export function BriefingSkeleton({ language = "zh" }: { language?: UiLanguage }) {
  const copy = messagesForUi(language).briefing;
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">{copy.loading}</p>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <div className="grid gap-3 lg:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export function NotFoundPanel({ language = "zh" }: { language?: UiLanguage }) {
  const copy = messagesForUi(language).briefing;
  return (
    <div className="paper-card space-y-3 p-6">
      <h1 className="text-2xl font-bold">{copy.notFoundTitle}</h1>
      <p className="text-sm text-muted-foreground">{copy.notFoundBody}</p>
      <Link href="/" className="paper-action mt-2 inline-flex">
        {copy.backHome}
      </Link>
    </div>
  );
}

export function UnsupportedSchemaPanel({
  found,
  supported,
  language = "zh",
}: {
  found: string;
  supported: readonly string[];
  language?: UiLanguage;
}) {
  const copy = messagesForUi(language).briefing;
  const body =
    language === "zh-Hant"
      ? `發現 schema_version ${found}。支持的版本：${supported.join(", ")}。沒有單獨映射的版本會保持未讀。這一頁不會猜測映射。`
      : language === "zh"
        ? `发现 schema_version ${found}。支持的版本：${supported.join(", ")}。没有单独映射的版本会保持未读。这一页不会猜测映射。`
        : `Found schema_version ${found}. Supported versions: ${supported.join(", ")}. A version without its own mapping stays unread. This page does not guess one.`;
  const title =
    language === "zh-Hant"
      ? "這份簡報使用的 schema 版本，這個應用讀不了"
      : language === "zh"
        ? "这份简报使用的 schema 版本，这个应用读不了"
        : "This briefing uses a schema version this app does not read";
  return (
    <div className="paper-card space-y-3 p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link href="/" className="paper-action mt-2 inline-flex">
        {copy.backHome}
      </Link>
    </div>
  );
}

export function ErrorPanel({ retry, language = "zh" }: { retry?: () => void; language?: UiLanguage }) {
  const copy = messagesForUi(language).briefing;
  return (
    <div className="paper-card space-y-3 p-6">
      <h1 className="text-2xl font-bold">{copy.errorTitle}</h1>
      <p className="text-sm text-muted-foreground">{copy.errorBody}</p>
      {retry ? (
        <button type="button" onClick={retry} className="paper-action">
          {copy.retry}
        </button>
      ) : null}
      <Link href="/" className="paper-action inline-flex">
        {copy.backHome}
      </Link>
    </div>
  );
}
