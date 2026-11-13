import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export function BriefingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted-foreground">正在加载简报</p>
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

export function NotFoundPanel() {
  return (
    <div className="paper-card space-y-3 p-6">
      <h1 className="text-2xl font-bold">本地库里没有这份简报</h1>
      <p className="text-sm text-muted-foreground">
        链接可能写错了，或演示文件已被清空。请从首页开始一次新的分析。
      </p>
      <Link href="/" className="paper-link text-sm">
        返回首页
      </Link>
    </div>
  );
}

export function UnsupportedSchemaPanel({ found, supported }: { found: string; supported: readonly string[] }) {
  return (
    <div className="paper-card space-y-3 p-6">
      <h1 className="text-2xl font-bold">这份简报使用的 schema 版本，这个应用读不了</h1>
      <p className="text-sm text-muted-foreground">
        发现 schema_version <span className="font-mono text-foreground">{found}</span>。支持的版本：{" "}
        <span className="font-mono text-foreground">{supported.join(", ")}</span>。没有单独映射的版本会保持未读。这一页不会猜测映射。
      </p>
      <Link href="/" className="paper-link text-sm">
        返回首页
      </Link>
    </div>
  );
}

export function ErrorPanel({ retry }: { retry?: () => void }) {
  return (
    <div className="paper-card space-y-3 p-6">
      <h1 className="text-2xl font-bold">简报无法加载</h1>
      <p className="text-sm text-muted-foreground">读取本地演示库时出了问题。</p>
      {retry ? (
        <button type="button" onClick={retry} className="rounded-full border border-[#e4d48a] bg-[#f3e6a4] px-4 py-2 text-sm text-[#1c1915]">
          重试
        </button>
      ) : null}
      <Link href="/" className="paper-link block text-sm">
        返回首页
      </Link>
    </div>
  );
}
