import Link from "next/link";

export default function MePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-xs tracking-[0.18em] text-of-accent uppercase">Me</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">我的</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
        这里还没有账号。设置仍在单独的页面。
      </p>
      <p className="mt-6">
        <Link href="/settings" className="text-base font-medium text-of-accent underline-offset-2 hover:underline">
          设置
        </Link>
      </p>
    </div>
  );
}
