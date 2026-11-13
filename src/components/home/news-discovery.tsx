"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { NEWS_SOURCES } from "@/lib/sources/catalog";
import { useSourceIds } from "@/lib/sources/use-source-ids";
import type { NewsDiscoveryResult, SourceStatus } from "@/lib/sources/types";

const SOURCE_GROUPS = [
  { kind: "media", label: "媒体" },
  { kind: "investigative", label: "调查" },
  { kind: "institution", label: "国际组织" },
] as const;

const STATUS_LABELS: Record<SourceStatus, string> = {
  ok: "列表已读取",
  empty: "无匹配条目",
  timeout: "请求超时",
  http_error: "HTTP 请求失败",
  invalid_feed: "RSS 格式无效",
  unsafe_redirect: "已拦截不安全跳转",
  oversized: "响应过大，已停止读取",
  network_error: "网络请求失败",
  busy: "检索队列已满，请稍后重试",
};

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-of-accent";

type NewsResponse = { ok?: boolean; data?: NewsDiscoveryResult; error?: string };

function sourceName(id: string) {
  return NEWS_SOURCES.find((source) => source.id === id)?.name ?? id;
}

function safeHref(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function NewsTime({ value }: { value: string | null }) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return <span>时间未提供或无效</span>;
  return (
    <time dateTime={date.toISOString()}>
      {new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date)} UTC
    </time>
  );
}

export function NewsDiscovery() {
  const { ids: subscribedIds } = useSourceIds();
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<NewsDiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestInFlight = useRef(false);
  const selectedIds = draftIds ?? subscribedIds;
  const googleCount = NEWS_SOURCES.filter((source) => selectedIds.includes(source.id) && source.access === "google_rss").length;
  const failedCount = result?.reports.filter((report) => report.status !== "ok" && report.status !== "empty").length ?? 0;

  function toggleSource(id: string) {
    setDraftIds((ids) => {
      const current = ids ?? subscribedIds;
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestInFlight.current || selectedIds.length === 0 || query.length > 200) return;
    requestInFlight.current = true;
    setPending(true);
    setError(null);
    setResult(null);
    const params = new URLSearchParams({ sources: selectedIds.join(",") });
    if (query.trim()) params.set("q", query.trim());

    try {
      const response = await fetch(`/api/news?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null) as NewsResponse | null;
      if (!response.ok) {
        const detail = typeof payload?.error === "string" ? ` 服务提示：${payload.error}` : "";
        setError(response.status === 429
          ? `请求过于频繁（429）。请稍后再点击“检索新闻”，不会自动重试。${detail}`
          : `新闻检索服务未完成请求（HTTP ${response.status}）。请稍后手动重试。${detail}`);
        return;
      }
      if (!payload?.ok || payload.data?.mode !== "rss_discovery" || !Array.isArray(payload.data.items) || !Array.isArray(payload.data.reports) || !Array.isArray(payload.data.warnings)) {
        setError("检索服务返回了无法识别的数据。这不是空结果，请稍后手动重试。");
        return;
      }
      setResult(payload.data);
    } catch {
      setError("网络连接失败，未能取得本次检索结果。请检查网络后再点击“检索新闻”；这不代表没有相关新闻。");
    } finally {
      requestInFlight.current = false;
      setPending(false);
    }
  }

  let statusTitle = "尚未检索新闻";
  let statusBody = "选好来源后点击“检索新闻”才会请求外部 RSS。打开页面、输入关键词或调整来源都不会触发新闻检索。";
  if (pending) {
    statusTitle = "正在检索所选来源…";
    statusBody = "正在等待 RSS 列表或缓存结果，不抓取新闻正文，也不会发送给 AI。";
  } else if (error) {
    statusTitle = "本次检索未完成";
    statusBody = error;
  } else if (result) {
    if (result.status === "unavailable") {
      statusTitle = "全部所选来源暂不可用";
      statusBody = "本次未取得可用的来源列表。请查看逐源状态，稍后手动重试；不能据此判断没有相关报道。";
    } else if (result.status === "partial") {
      statusTitle = `部分来源不可用 · 返回 ${result.items.length} 条未核实线索`;
      statusBody = result.items.length === 0
        ? "可用来源的 RSS 列表中暂无匹配条目，其余来源未能完成检索。结果不完整，不代表没有相关报道。"
        : "这里只展示可用来源返回的条目，结果不完整。未返回的来源不代表没有相关报道。";
    } else if (result.items.length === 0) {
      statusTitle = "本次 RSS 列表中暂无匹配条目";
      statusBody = "这不代表全网没有相关报道。可调整关键词或来源后再次检索；本入口不搜索全文或历史档案。";
    } else {
      statusTitle = `检索完成 · 返回 ${result.items.length} 条未核实线索`;
      statusBody = "以下是 RSS 发现条目，不是事实核验结论，也不是独立佐证数量。链接在新标签页打开，需自行核对原文。";
    }
  }

  return (
    <section id="news-discovery" aria-labelledby="news-discovery-title" className="@container mt-8 min-w-0 scroll-mt-6 rounded-2xl border border-of-cream-border bg-card [overflow-wrap:anywhere]">
      <div className="rounded-t-2xl border-b border-of-cream-border bg-of-cream/50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs tracking-[0.16em] text-of-accent">01 / NEWS DISCOVERY</p>
          <span className="rounded-full border border-of-cream-border bg-card px-3 py-1 text-xs text-of-accent">仅发现线索 · 不送 AI</span>
        </div>
        <h2 id="news-discovery-title" className="mt-3 font-serif text-2xl sm:text-3xl">从 {NEWS_SOURCES.length} 个来源发现新闻</h2>
        <p id="news-scope" className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          官方 RSS 仅筛选最新列表中的标题，不是全网全文检索；Google 查询最近 3 天，日期未知的条目会单独标注。留空关键词可浏览所选来源的列表。
        </p>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="rounded-xl border border-of-cream-border bg-of-cream/30 p-4 text-sm leading-6 text-of-cream-foreground">
          <p className="font-medium">标题不是 AI 证据</p>
          <p className="mt-1">这里只发现线索，不抓正文；条目均未核实，不送 AI，也不会自动保存到下方资料库。</p>
          <p className="mt-1">官方声明不等于事实成立，转载不算独立佐证。Google RSS 仅限个人非商业阅读器用途，NPR 仅限个人使用；其他许可待核实，接通不等于获得公开产品使用授权。</p>
        </div>

        <form role="search" aria-label="新闻线索检索" aria-describedby="news-scope" onSubmit={(event) => void search(event)}>
          <fieldset disabled={pending} className="min-w-0 space-y-4">
            <legend className="sr-only">关键词与新闻来源</legend>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="news-query" className="text-sm font-medium">关键词 <span className="font-normal text-muted-foreground">（可选）</span></label>
                <span className="text-xs text-muted-foreground" aria-hidden="true">{query.length}/200</span>
              </div>
              <input
                id="news-query"
                name="q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={200}
                placeholder="例如：能源、核安全、公共卫生"
                aria-describedby="news-query-hint news-google-notice"
                className={`mt-2 h-12 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-base disabled:opacity-60 ${focusClass}`}
              />
              <p id="news-query-hint" className="mt-2 text-xs leading-5 text-muted-foreground">最多 200 字符。更改关键词或来源后，需再次点击“检索新闻”才会更新结果。</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => setDraftIds(NEWS_SOURCES.map((source) => source.id))}>全选 {NEWS_SOURCES.length} 源</Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => setDraftIds(NEWS_SOURCES.filter((source) => source.access === "official_rss").map((source) => source.id))}>仅官方 RSS</Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setDraftIds([])}>清空选择</Button>
            </div>

            <details className="rounded-xl border border-border bg-background">
              <summary className={`cursor-pointer rounded-xl p-4 text-sm font-medium ${focusClass}`}>
                选择来源 · 已选 {selectedIds.length}/{NEWS_SOURCES.length} <span className="font-normal text-muted-foreground">（展开查看分类与接入方式）</span>
              </summary>
              <div className="space-y-5 border-t border-border p-4">
                {SOURCE_GROUPS.map((group) => (
                  <fieldset key={group.kind} className="min-w-0">
                    <legend className="mb-3 text-sm font-medium text-of-accent">{group.label}</legend>
                    <div className="grid gap-2 @sm:grid-cols-2">
                      {NEWS_SOURCES.filter((source) => source.kind === group.kind).map((source) => (
                        <label key={source.id} className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border p-3 hover:border-of-accent has-checked:border-of-cream-border has-checked:bg-of-cream/25 has-disabled:cursor-wait has-disabled:opacity-60">
                          <input
                            type="checkbox"
                            name="sources"
                            value={source.id}
                            checked={selectedIds.includes(source.id)}
                            onChange={() => toggleSource(source.id)}
                            className={`mt-1 size-4 shrink-0 accent-of-accent ${focusClass}`}
                          />
                          <span className="min-w-0 text-sm">
                            <span className="block font-medium">{source.name}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{source.domain} · {source.access === "official_rss" ? "官方 RSS" : "Google 新闻 RSS"}</span>
                            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{source.focus}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </details>

            <p id="news-google-notice" className="text-sm leading-6 text-muted-foreground">
              {googleCount > 0
                ? `已选 ${googleCount} 个 Google 新闻 RSS 来源：点击检索时，关键词会发送给 Google。可改选“仅官方 RSS”以避免此方式。`
                : "当前未选择 Google 新闻 RSS 来源，本次检索不会将关键词发送给 Google。"}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button type="submit" disabled={pending || selectedIds.length === 0} aria-describedby="news-selection-status" className="h-12 w-full bg-of-accent px-6 text-of-accent-foreground hover:bg-of-accent/90 sm:w-auto">
                {pending ? "检索中…" : "检索新闻"}
              </Button>
              <p id="news-selection-status" role="status" aria-live="polite" className="text-sm text-muted-foreground">
                {selectedIds.length === 0 ? "请至少选择一个来源，才能检索。" : `已选 ${selectedIds.length} 个来源 · 默认来自订阅页 · 仅手动检索`}
              </p>
            </div>
          </fieldset>
        </form>

        <div role="status" aria-live="polite" aria-atomic="true" className={`rounded-xl border p-4 ${error || result?.status === "unavailable" ? "border-destructive/30 bg-destructive/5" : "border-border bg-background"}`}>
          <h3 className="font-medium">{statusTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{statusBody}</p>
        </div>

        <div aria-busy={pending}>
          {result ? (
            <div className="space-y-5">
              <div className="text-sm leading-6 text-muted-foreground">
                <p>本次检索：{result.query ? `“${result.query}”` : "未设关键词"} · {result.reports.length} 个来源报告</p>
                <p>检查时间：<NewsTime value={result.checkedAt} /></p>
              </div>

              {result.warnings.length > 0 ? (
                <div className="rounded-xl border border-of-cream-border bg-of-cream/30 p-4 text-sm leading-6">
                  <h3 className="font-medium">本次检索提示</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    {result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                  </ul>
                </div>
              ) : null}

              <details key={result.checkedAt} open={result.status !== "complete"} className="rounded-xl border border-border">
                <summary className={`cursor-pointer rounded-xl p-4 text-sm font-medium ${focusClass}`}>
                  逐源状态 · {result.reports.length} 个报告 / {failedCount} 个失败
                </summary>
                <div className="border-t border-border p-4">
                  <p className="mb-3 text-xs leading-5 text-muted-foreground">条目数为各来源返回的 RSS 条目数，不是独立确认数；缓存时间不代表新闻发布时间，列表读取成功也不代表内容已核实。</p>
                  <ul className="grid gap-3 @sm:grid-cols-2">
                    {result.reports.map((report) => (
                      <li key={report.sourceId} className="min-w-0 rounded-lg border border-border bg-background p-3 text-xs leading-5">
                        <h4 className="text-sm font-medium">{sourceName(report.sourceId)}</h4>
                        <p className={`mt-1 ${report.status === "ok" || report.status === "empty" ? "text-of-accent" : "text-destructive"}`}>
                          {STATUS_LABELS[report.status]}{report.httpStatus !== null ? ` · HTTP ${report.httpStatus}` : ""}
                        </p>
                        <dl className="mt-2 space-y-1 text-muted-foreground">
                          <div><dt className="inline">条目数：</dt><dd className="inline">{report.itemCount}</dd></div>
                          <div><dt className="inline">缓存：</dt><dd className="inline">{report.cached ? "是（使用缓存）" : "否（未使用缓存）"}</dd></div>
                          <div><dt className="inline">抓取记录时间：</dt><dd className="inline"><NewsTime value={report.fetchedAt} /></dd></div>
                          {report.skippedItems > 0 ? <div><dt className="inline">跳过条目：</dt><dd className="inline">{report.skippedItems}</dd></div> : null}
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>

              {result.items.length > 0 ? (
                <section aria-labelledby="news-results-title">
                  <h3 id="news-results-title" className="font-serif text-xl">新闻线索 <span className="font-sans text-sm text-muted-foreground">/ {result.items.length} 条 · 均未核实</span></h3>
                  <ul className="mt-3 grid gap-3">
                    {result.items.map((item) => {
                      const href = safeHref(item.url);
                      return (
                        <li key={`${item.sourceId}:${item.id}`} className="min-w-0 rounded-xl border border-border bg-background p-4 sm:p-5">
                          <article>
                            <p className="text-xs leading-5 text-of-accent">发布方：{item.publisher || "未提供"} · 来源：{sourceName(item.sourceId)}</p>
                            <h4 className="mt-2 text-lg font-medium leading-7">
                              {href ? (
                                <a href={href} target="_blank" rel="noreferrer noopener" className={`underline decoration-of-cream-border underline-offset-4 hover:text-of-accent ${focusClass}`}>
                                  {item.title || "无标题条目"}<span className="sr-only">（在新标签页打开）</span>
                                </a>
                              ) : (item.title || "无标题条目")}
                            </h4>
                            {!href ? <p className="mt-2 text-xs text-destructive">链接无效或不安全，已禁用跳转。</p> : null}
                            {item.urlKind === "google_redirect" ? <p className="mt-2 text-xs leading-5 text-of-accent">Google 聚合链接（未解析原文）</p> : null}
                            <div className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground">
                              <p>发布时间：<NewsTime value={item.publishedAt} /></p>
                              <p>RSS 署名：{item.byline || "未提供"}</p>
                              {item.attributionHint ? <p>署名线索：{item.attributionHint}（仅为线索，不代表供稿确认）</p> : null}
                              <p>供稿 / 转载关系：未知 · 未核实 · 不送 AI</p>
                            </div>
                            {item.possibleDuplicateGroup ? (
                              <p className="mt-3 rounded-lg border border-of-cream-border bg-of-cream/40 px-3 py-2 text-xs leading-5 text-of-cream-foreground">疑似同稿，需核对 · 分组 {item.possibleDuplicateGroup}</p>
                            ) : null}
                          </article>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
