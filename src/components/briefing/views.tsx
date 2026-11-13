import type { ReactNode } from "react";
import type { BriefingView } from "@/lib/adapters/to-view";
import type { Messages } from "@/lib/i18n/messages";
import { AnalysisBadge, AnalysisNav, SourceBadge, StatusBadge } from "@/components/layout/chrome";
import { FICTIONAL_DEMO_PUBLISHER_LABEL } from "@/lib/openframe/openframe";
import { formatLongDate, formatTimestamp } from "@/lib/i18n/languages";
import { ExportBar } from "@/components/briefing/export-bar";
import { StoryFigure } from "@/components/media/story-figure";
import { CardFold } from "@/components/ui/card-fold";

function han(copy: Messages): "zh" | "zh-Hant" | null {
  if (copy.nav.home === "首页") return "zh";
  if (copy.nav.home === "首頁") return "zh-Hant";
  return null;
}

function pick(copy: Messages, simplified: string, traditional: string, english: string) {
  const script = han(copy);
  if (script === "zh") return simplified;
  if (script === "zh-Hant") return traditional;
  return english;
}

export function BriefingIntro({
  view,
  current,
  copy,
}: {
  view: BriefingView;
  current: "perspectives" | "evidence" | "report" | null;
  copy: Messages;
}) {
  const script = han(copy);
  const nav =
    script === "zh"
      ? { ...copy.nav, perspectives: "观点", evidence: "证据核查", report: "研究报告", progress: "分析分页" }
      : script === "zh-Hant"
        ? { ...copy.nav, perspectives: "觀點", evidence: "證據核查", report: "研究報告", progress: "分析分頁" }
        : copy.nav;
  return (
    <header className="space-y-4">
      <AnalysisNav id={view.bundleId} current={current} labels={nav} />
      <p className="text-sm text-muted-foreground">{view.generic ? copy.briefing.genericMatch : copy.briefing.preparedMatch}</p>
      <h1 className="text-2xl font-bold leading-tight">{view.subject}</h1>
      <p className="text-sm">
        <span className="text-muted-foreground">{copy.briefing.yourTopic}: </span>
        {view.query}
      </p>
      <p className="text-xs text-muted-foreground">
        {copy.briefing.created} {formatTimestamp(view.createdAt, view.language)} · schema {view.schemaVersion}
      </p>
      <div className="flex flex-wrap gap-2">
        <SourceBadge label={view.sourceLabel} mode={view.sourceMode} />
        {view.analysisLabel ? <AnalysisBadge label={view.analysisLabel} generatedAt={view.analysisGeneratedAt} /> : null}
      </div>
      {view.generation === "LIVE_AI" ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{copy.briefing.generatedUnretrieved}</p>
      ) : null}
      <section className="paper-card space-y-2 p-4">
        <h2 className="text-base font-bold">{pick(copy, "数据模式", "數據模式", "Data mode")}</h2>
        <p className="text-sm">
          {view.sourceMode === "DEMO"
            ? pick(
                copy,
                "虚构演示。来源保持 DEMO 标记。分析是预生成的（PRECOMPUTED），不是真实新闻，也不是实时模型调用。",
                "虛構演示。來源保持 DEMO 標記。分析是預生成的（PRECOMPUTED），不是真實新聞，也不是即時模型呼叫。",
                "Fictional demonstration. Sources stay marked DEMO. The analysis is pre-generated (PRECOMPUTED), not real news and not a live model call.",
              )
            : view.generation === "PRECOMPUTED"
              ? pick(
                  copy,
                  "真实来源样本。报道链接是真实报道。分析是预生成的（PRECOMPUTED），不是打开这一页时的模型调用。",
                  "真實來源樣本。報導連結是真實報導。分析是預生成的（PRECOMPUTED），不是打開這一頁時的模型呼叫。",
                  "Real-source sample. The reporting links are real. The analysis is pre-generated (PRECOMPUTED), not a live model call on this page.",
                )
              : view.masthead}
        </p>
        {view.notice ? <p className="text-sm">{view.notice}</p> : null}
        <p className="text-sm text-muted-foreground">{view.masthead}</p>
        <p className="text-xs text-muted-foreground">
          data_mode {view.sourceMode} · analysis_generation {view.generation}
        </p>
      </section>
      {view.integrityIssues.length > 0 ? (
        <ul className="space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {view.integrityIssues.slice(0, 8).map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

export function PerspectivesBody({ view, copy }: { view: BriefingView; copy: Messages }) {
  if (view.analysed.length === 0) {
    return <Empty title={copy.briefing.emptyArticlesTitle} body={copy.briefing.emptyArticlesBody} />;
  }
  return (
    <div className="mt-8 space-y-8">
      <section className="space-y-4">
        <h2 className="font-serif text-2xl">{copy.briefing.narrativeTitle}</h2>
        <p>{view.comparisonSummary}</p>
        <div className="grid gap-4">
          <article className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-medium">{copy.briefing.sharedTitle}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {view.shared.map((item) => (
                <li key={item.fact}>
                  {item.fact}
                  <span className="mt-1 block text-muted-foreground">{item.note}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-medium">{copy.briefing.divergeTitle}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {view.divergences.map((item) => (
                <li key={item.description}>
                  <span className="font-medium">{item.dimension}. </span>
                  {item.description}
                </li>
              ))}
            </ul>
          </article>
        </div>
        <p className="text-sm text-muted-foreground">{view.voices}</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">{copy.briefing.articlesTitle}</h2>
        <p className="text-sm text-muted-foreground">
          {pick(copy, "每一条描述的是这篇文章，不是这家媒体的整体。", "每一條描述的是這篇文章，不是這家媒體的整體。", "Each note describes that article, not the outlet as a whole.")}
        </p>
        <div className="grid gap-4">
          {view.analysed.map((article) => (
            <article id={`article-${article.id}`} key={article.id} className="topic-card flex flex-col gap-3">
              <StoryFigure
                title={article.title}
                note={pick(copy, "公开授权的主题配图，不是这篇报道的原图。", "公開授權的主題配圖，不是這篇報導的原圖。", "Openly licensed thematic photo, not a picture from this article.")}
              />
              <SourceBadge label={article.sourceLabel} mode={article.sourceMode} />
              <p className="text-xs text-muted-foreground">
                <PublisherName name={article.publisher} fictional={article.fictional} />
                {article.date ? ` · ${formatLongDate(article.date, view.language)}` : ""}
                {" · "}
                <AccessChips chips={article.accessChips} />
                {article.textOrigin ?? pick(copy, "未记录来源", "未記錄來源", "origin not stored")}
              </p>
              <h3 className="font-serif text-xl leading-snug">{article.title}</h3>
              <p className="text-sm">{article.summary}</p>
              <a href={article.url} className="text-sm text-of-accent underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                {copy.briefing.placeholderLink}
                <span className="mt-1 block break-all text-xs text-muted-foreground">{article.url}</span>
              </a>
              <p className="font-mono text-[11px] text-muted-foreground">{article.id}</p>
              <CardFold
                label={pick(copy, "展开这篇的对照", "展開這篇的對照", "Show the comparison")}
                openLabel={pick(copy, "收起对照", "收起對照", "Hide the comparison")}
                startOpen
              >
              <div className="space-y-3">
                {article.dimensions.map((dimension) => (
                  <div key={dimension.key}>
                    <h4 className="text-sm font-semibold">{dimension.label}</h4>
                    <p className="text-sm">{dimension.summary}</p>
                    {dimension.details.length > 0 ? (
                      <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                        {dimension.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
              </CardFold>
              {article.articleOnlyNote ? <p className="text-xs text-muted-foreground">{article.articleOnlyNote}</p> : null}
            </article>
          ))}
        </div>
      </section>
      {view.articles.some((article) => article.role === "evidence_only") ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">{pick(copy, "来源记录", "來源記錄", "Source records")}</h2>
          <ul className="space-y-3">
            {view.articles
              .filter((article) => article.role === "evidence_only")
              .map((article) => (
                <li id={`article-${article.id}`} key={article.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="font-medium">{article.title}</p>
                  <p className="text-muted-foreground">
                    <PublisherName name={article.publisher} fictional={article.fictional} />
                    {article.date ? ` · ${formatLongDate(article.date, view.language)}` : ""} · <AccessChips chips={article.accessChips} /> {article.textOrigin ?? pick(copy, "未记录来源", "未記錄來源", "origin not stored")} · {article.id}
                  </p>
                  <a href={article.url} className="break-all text-of-accent underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                    {article.url}
                  </a>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function EvidenceBody({ view, copy }: { view: BriefingView; copy: Messages }) {
  if (view.audits.length === 0) {
    return <Empty title={copy.briefing.emptyClaimsTitle} body={copy.briefing.emptyClaimsBody} />;
  }
  return (
    <div className="mt-8 space-y-6">
      <p className="paper-card p-4 text-sm">
        {pick(
          copy,
          "这些状态只核对单条主张，不是对整件事的真或假结论。状态名称保持夹具里的英文。",
          "這些狀態只核對單條主張，不是對整件事的真或假結論。狀態名稱保持夾具裡的英文。",
          "These statuses check individual claims. They are not a true or false verdict for the whole story. Status names stay in the fixture’s English.",
        )}
      </p>
      <section className="grid gap-2">
        {(Object.keys(copy.verificationHelp) as Array<keyof typeof copy.verificationHelp>).map((status) => (
          <article key={status} className="rounded-xl border border-border bg-card p-3">
            <StatusBadge status={status} />
            <p className="mt-2 text-xs text-muted-foreground">{copy.verificationHelp[status]}</p>
          </article>
        ))}
      </section>
      {view.audits.map((audit) => (
        <article id={`claim-${audit.claimId}`} key={audit.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={audit.status} />
            <span className="font-mono text-[11px] text-muted-foreground">
              {audit.claimId} → {audit.articleId}
            </span>
          </div>
          <h2 className="font-serif text-xl">{audit.claimText}</h2>
          <p className="text-sm">{audit.explanation}</p>
          <p className="text-xs text-muted-foreground">
            confidence {audit.confidenceLevel}. {audit.confidenceRationale} Independent groups: {audit.independentSupporting} supporting / {audit.independentContradicting} contradicting.
          </p>
          <EvidenceList
            title={pick(copy, "支持该主张的证据", "支持該主張的證據", "Supporting evidence")}
            items={audit.supporting}
            bundleId={view.bundleId}
            empty={pick(copy, "这份记录里没有", "這份記錄裡沒有", "None in this file.")}
            originFallback={pick(copy, "未记录来源", "未記錄來源", "origin not stored")}
          />
          <EvidenceList
            title={pick(copy, "与该主张相反的证据", "與該主張相反的證據", "Contradicting evidence")}
            items={audit.contradicting}
            bundleId={view.bundleId}
            empty={pick(copy, "这份记录里没有", "這份記錄裡沒有", "None in this file.")}
            originFallback={pick(copy, "未记录来源", "未記錄來源", "origin not stored")}
          />
          <EvidenceList
            title={pick(copy, "不计入 Verified", "不計入 Verified", "Not counted toward Verified")}
            items={audit.unverifiable}
            bundleId={view.bundleId}
            note={pick(copy, "引文无法核验", "引文無法核驗", "Quote not checkable")}
            empty={pick(copy, "这份记录里没有", "這份記錄裡沒有", "None in this file.")}
            originFallback={pick(copy, "未记录来源", "未記錄來源", "origin not stored")}
          />
          <div>
            <h3 className="text-sm font-medium">{copy.briefing.limitationsTitle}</h3>
            <ul className="mt-1 list-disc pl-4 text-sm text-muted-foreground">
              {audit.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </article>
      ))}
      <section className="rounded-xl border border-[#e7c99a] bg-[#fbf6ee] p-4">
        <h2 className="font-serif text-xl">{copy.briefing.limitationsTitle}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
          {view.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function EvidenceList({
  title,
  items,
  bundleId,
  note,
  empty = "None in this file.",
  originFallback = "origin not stored",
}: {
  title: string;
  items: BriefingView["audits"][number]["supporting"];
  bundleId: string;
  note?: string;
  empty?: string;
  originFallback?: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : null}
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li id={item.id} key={item.id} className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="font-medium">
              <PublisherName name={item.publisher} fictional={item.fictional} />
              <AccessChips chips={item.accessChips} />
              <span className="ml-2 font-normal text-muted-foreground">{item.textOrigin ?? originFallback}</span>
            </p>
            <p>{item.summary}</p>
            {item.excerpt ? <QuoteText item={item} /> : null}
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              <a href={`#claim-${item.claimId}`}>{item.claimId}</a>
              {" · "}
              <a href={`/analysis/${bundleId}/perspectives#article-${item.articleId}`}>{item.articleId}</a>
              {" · "}
              {item.groupId}
            </p>
            {item.url ? (
              <a href={item.url} className="break-all text-xs text-of-accent" target="_blank" rel="noopener noreferrer">
                {item.url}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ReportBody({
  view,
  copy,
  markdown,
  json,
}: {
  view: BriefingView;
  copy: Messages;
  markdown: string;
  json: string;
}) {
  if (!view.report.summary) {
    return <Empty title={copy.briefing.emptyReportTitle} body={copy.briefing.emptyReportBody} />;
  }
  return (
    <article className="print-sheet topic-card mt-8 space-y-8">
      <header className="space-y-2 border-b border-border pb-4">
        <div className="flex flex-wrap gap-2">
          <SourceBadge label={view.sourceLabel} mode={view.sourceMode} />
          {view.analysisLabel ? <AnalysisBadge label={view.analysisLabel} generatedAt={view.analysisGeneratedAt} /> : null}
        </div>
        <p className="text-sm">{view.masthead}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{copy.report.excerptLimit}</p>
        <h2 className="font-serif text-3xl">{view.subject}</h2>
        <p className="text-sm text-muted-foreground">
          {view.sourceLabel} · data_mode {view.sourceMode} · {view.analysisLabel}
        </p>
      </header>
      <ExportBar
        markdown={markdown}
        json={json}
        filename={`openframe-demo-${view.bundleId}`}
        labels={{ md: copy.report.exportMd, json: copy.report.exportJson, print: copy.report.print, done: copy.report.downloaded }}
      />
      <Section title={pick(copy, "底线", "底線", "Bottom line")}>
        <p className="font-medium">{view.report.bottomLine}</p>
        <BottomLineLinks view={view} />
      </Section>
      <Section title={pick(copy, "执行摘要", "執行摘要", "Executive summary")}>
        <p>{view.report.summary}</p>
      </Section>
      <Section title={pick(copy, "主要发现", "主要發現", "Key findings")}>
        <ul className="space-y-4">
          {view.report.findings.map((finding) => (
            <li id={`finding-${finding.id}`} key={finding.id}>
              <p className="font-medium">{finding.text}</p>
              <p className="text-xs text-muted-foreground">{finding.id} · strength {finding.strength}</p>
              <FindingTrace finding={finding} bundleId={view.bundleId} articles={view.articles} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title={pick(copy, "未挂到这条 schema", "未掛到這條 schema", "Not linked in this schema")}>
        <ul className="space-y-3">
          {view.report.unlinked.map((finding) => (
            <li key={`${finding.heading}-${finding.text.slice(0, 48)}`}>
              <p className="font-medium">{finding.heading}</p>
              <p>{finding.text}</p>
              <FindingTrace finding={finding} bundleId={view.bundleId} articles={view.articles} />
            </li>
          ))}
        </ul>
      </Section>
      <Section title={copy.report.keyPerspectives}>
        <ul className="space-y-2">
          {view.report.rows.map((row) => (
            <li key={row.articleId}>
              <span className="font-medium">
                <PublisherName name={row.publisher} fictional={row.fictional} />.
              </span>{" "}
              {row.argument}
              <span className="mt-1 block text-sm text-muted-foreground">
                {row.frame} · {row.articleId}
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={copy.report.claimAudit}>
        <div className="max-w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-3">{copy.report.columnClaim}</th>
                <th className="py-2 pr-3">{copy.report.columnLabel}</th>
                <th className="py-2">{copy.report.columnRationale}</th>
              </tr>
            </thead>
            <tbody>
              {view.report.claims.map((claim) => (
                <tr key={claim.auditId} className="border-b border-border align-top">
                  <td className="py-3 pr-3">
                    {claim.text}
                    <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                      <a href={`/analysis/${view.bundleId}/evidence#claim-${claim.claimId}`}>{claim.claimId}</a>
                      {" → "}
                      <a href={`/analysis/${view.bundleId}/perspectives#article-${claim.articleId}`}>{claim.articleId}</a>
                    </span>
                  </td>
                  <td className="py-3 pr-3">
                    {claim.status ? <StatusBadge status={claim.status} /> : <span className="text-amber-800">{claim.statusWithheld}</span>}
                  </td>
                  <td className="py-3">{claim.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Timeline">
        <TimelineList events={view.report.timeline} />
      </Section>
      <Section title={copy.report.methodology}>
        <p>{view.report.methodology}</p>
      </Section>
      <Section title={copy.report.limitations}>
        <ul className="list-disc space-y-1 pl-4">
          {view.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>
      <Section title={copy.report.sources}>
        <ul className="space-y-2 text-sm">
          {view.report.sources.map((source) => (
            <li id={`source-${source.id}`} key={source.id}>
              <a href={source.url} className="text-of-accent underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                {source.title}
              </a>
              <span className="block text-muted-foreground">
                <PublisherName name={source.publisher} fictional={source.fictional} />
                {source.date ? ` · ${formatLongDate(source.date, view.language)}` : ""} · {source.usedFor.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </article>
  );
}

function FindingTrace({
  finding,
  bundleId,
  articles,
}: {
  finding: BriefingView["report"]["findings"][number];
  bundleId: string;
  articles: BriefingView["articles"];
}) {
  if (!finding.claimIds) {
    return (
      <div className="text-xs text-muted-foreground">
        <p>not linked in data</p>
        {finding.articleIds.map((articleId) => {
          const article = articles.find((item) => item.id === articleId);
          return (
            <p key={articleId}>
              <a className="text-of-accent underline-offset-2 hover:underline" href={`/analysis/${bundleId}/perspectives#article-${articleId}`}>
                {articleId}
              </a>
              {article ? (
                <>
                  {" → "}
                  <a className="break-all text-of-accent underline-offset-2 hover:underline" href={article.url} target="_blank" rel="noopener noreferrer">
                    {article.url}
                  </a>
                </>
              ) : null}
            </p>
          );
        })}
      </div>
    );
  }
  return (
    <ul className="mt-1 space-y-2 text-xs">
      {finding.claims.map((claim) => (
        <li key={claim.claimId}>
          {claim.auditId ? (
            <a className="text-of-accent underline-offset-2 hover:underline" href={`/analysis/${bundleId}/evidence#claim-${claim.claimId}`}>
              Audit {claim.auditId}
            </a>
          ) : (
            <span>not linked in data</span>
          )}
          {" → "}
          <a className="text-of-accent underline-offset-2 hover:underline" href={`/analysis/${bundleId}/evidence#claim-${claim.claimId}`}>
            Claim {claim.claimId}
          </a>
          {claim.evidence.map((item) => (
            <span key={item.id}>
              {" → "}
              <a className="text-of-accent underline-offset-2 hover:underline" href={`/analysis/${bundleId}/evidence#${item.id}`}>
                {item.id}
              </a>
              {item.matchLabel ? ` (${item.matchLabel})` : item.quoteVerification === "unverifiable" ? " (Quote not checkable)" : " (paraphrase)"}
            </span>
          ))}
          {articles.find((article) => article.id === claim.articleId) ? (
            <span>
              {" → "}
              <a className="text-of-accent underline-offset-2 hover:underline" href={`/analysis/${bundleId}/perspectives#article-${claim.articleId}`}>
                {claim.articleId}
              </a>
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function TimelineList({ events }: { events: BriefingView["report"]["timeline"] }) {
  const dated = events.filter((event) => event.date);
  if (dated.length === 0) return <p>No timeline data available</p>;
  return (
    <ul className="space-y-1">
      {dated.map((event) => (
        <li key={`${event.date}-${event.event}`}>
          <span className="font-medium">{event.date}.</span> {event.event}
          {event.sourceIds.length > 0 ? (
            <span className="ml-2 font-mono text-xs">
              {event.sourceIds.map((id) => (
                <a key={id} href={`#source-${id}`} className="mr-2 text-of-accent">
                  {id}
                </a>
              ))}
            </span>
          ) : (
            <span className="ml-2 text-xs text-muted-foreground">not linked in data</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function BottomLineLinks({ view }: { view: BriefingView }) {
  if (!view.report.bottomLineClaimIds || view.report.bottomLineClaimIds.length === 0) {
    return <p className="mt-2 text-xs text-muted-foreground">not linked in data</p>;
  }
  return (
    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {view.report.bottomLineFindingIds.map((id) => (
        <a key={id} href={`#finding-${id}`} className="text-of-accent underline-offset-2 hover:underline">
          {id}
        </a>
      ))}
      {view.report.bottomLineClaimIds.map((id) => (
        <a key={id} href={`/analysis/${view.bundleId}/evidence#claim-${id}`} className="font-mono text-of-accent underline-offset-2 hover:underline">
          {id}
        </a>
      ))}
    </p>
  );
}

function QuoteText({ item }: { item: BriefingView["audits"][number]["supporting"][number] }) {
  if (item.asQuotation && item.excerpt) {
    return (
      <p className="mt-1">
        “{item.excerpt}”
        <span className="ml-2 text-xs text-muted-foreground">
          Matches stored excerpt
          {item.span ? ` · characters ${item.span.start}–${item.span.end}` : ""}
        </span>
      </p>
    );
  }
  if (item.quoteVerification === "unverifiable") {
    return <p className="mt-1 text-muted-foreground">{item.excerpt} (Quote not checkable)</p>;
  }
  return <p className="mt-1 text-muted-foreground">{item.excerpt} (paraphrase)</p>;
}

function AccessChips({ chips }: { chips: string[] }) {
  if (chips.length === 0) return null;
  return (
    <span className="mr-2 inline-flex flex-wrap gap-1 align-middle">
      {chips.map((chip) => (
        <span key={chip} className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-950">
          {chip}
        </span>
      ))}
    </span>
  );
}

function PublisherName({ name, fictional }: { name: string; fictional: boolean }) {
  return (
    <>
      {name}
      {fictional ? (
        <span className="ml-2 inline-flex rounded-full bg-of-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-of-accent-foreground">
          {FICTIONAL_DEMO_PUBLISHER_LABEL}
        </span>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="font-serif text-2xl">{title}</h3>
      <div className="mt-2 text-sm leading-6">{children}</div>
    </section>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="paper-note mt-8">
      <h2 className="text-[1.35rem] font-bold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
