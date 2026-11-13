import type { ReactNode } from "react";
import type { BriefingView } from "@/lib/adapters/to-view";
import type { Messages } from "@/lib/i18n/messages";
import { AnalysisBadge, AnalysisNav, SourceBadge, StatusBadge } from "@/components/layout/chrome";
import { FICTIONAL_DEMO_PUBLISHER_LABEL } from "@/lib/openframe/openframe";
import { formatLongDate, formatTimestamp } from "@/lib/i18n/languages";
import { ExportBar } from "@/components/briefing/export-bar";

export function BriefingIntro({
  view,
  current,
  copy,
}: {
  view: BriefingView;
  current: "perspectives" | "evidence" | "report" | null;
  copy: Messages;
}) {
  return (
    <header className="space-y-4">
      <AnalysisNav
        id={view.bundleId}
        current={current}
        labels={{ ...copy.nav, progress: copy.nav.progress }}
      />
      <p className="text-sm text-muted-foreground">{view.generic ? copy.briefing.genericMatch : copy.briefing.preparedMatch}</p>
      <h1 className="font-serif text-3xl leading-tight sm:text-4xl">{view.subject}</h1>
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
      <p className="text-sm">{view.notice}</p>
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
        <div className="grid gap-4 lg:grid-cols-2">
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
        <h2 className="font-serif text-2xl">{copy.briefing.articlesTitle}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {view.analysed.map((article) => (
            <article id={`article-${article.id}`} key={article.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
              <SourceBadge label={article.sourceLabel} mode={article.sourceMode} />
              <p className="text-xs text-muted-foreground">
                <PublisherName name={article.publisher} fictional={article.fictional} />
                {article.date ? ` · ${formatLongDate(article.date, view.language)}` : ""}
                {" · "}
                <AccessChips chips={article.accessChips} />
                {article.textOrigin ?? "origin not stored"}
              </p>
              <h3 className="font-serif text-xl leading-snug">{article.title}</h3>
              <p className="text-sm">{article.summary}</p>
              <a href={article.url} className="text-sm text-of-accent underline-offset-2 hover:underline" target="_blank" rel="noopener noreferrer">
                Original article
                <span className="mt-1 block break-all text-xs text-muted-foreground">{article.url}</span>
              </a>
              <p className="font-mono text-[11px] text-muted-foreground">{article.id}</p>
              <div className="space-y-3 border-t border-border pt-3">
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
              {article.articleOnlyNote ? <p className="text-xs text-muted-foreground">{article.articleOnlyNote}</p> : null}
            </article>
          ))}
        </div>
      </section>
      {view.articles.some((article) => article.role === "evidence_only") ? (
        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Source records</h2>
          <ul className="space-y-3">
            {view.articles
              .filter((article) => article.role === "evidence_only")
              .map((article) => (
                <li id={`article-${article.id}`} key={article.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <p className="font-medium">{article.title}</p>
                  <p className="text-muted-foreground">
                    <PublisherName name={article.publisher} fictional={article.fictional} />
                    {article.date ? ` · ${formatLongDate(article.date, view.language)}` : ""} · <AccessChips chips={article.accessChips} /> {article.textOrigin ?? "origin not stored"} · {article.id}
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
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
          <EvidenceList title="Supporting evidence" items={audit.supporting} bundleId={view.bundleId} />
          <EvidenceList title="Contradicting evidence" items={audit.contradicting} bundleId={view.bundleId} />
          <EvidenceList title="Not counted toward Verified" items={audit.unverifiable} bundleId={view.bundleId} note="Quote not checkable" />
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
}: {
  title: string;
  items: BriefingView["audits"][number]["supporting"];
  bundleId: string;
  note?: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium">{title}</h3>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">None in this file.</p> : null}
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li id={item.id} key={item.id} className="rounded-lg bg-muted/60 p-3 text-sm">
            <p className="font-medium">
              <PublisherName name={item.publisher} fictional={item.fictional} />
              <AccessChips chips={item.accessChips} />
              <span className="ml-2 font-normal text-muted-foreground">{item.textOrigin ?? "origin not stored"}</span>
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
    <article className="print-sheet mt-8 space-y-8 rounded-2xl border border-border bg-card p-5 sm:p-8">
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
      <Section title={copy.report.summary}>
        <p>{view.report.summary}</p>
        <p className="mt-2 font-medium">{view.report.bottomLine}</p>
        <BottomLineLinks view={view} />
      </Section>
      <Section title="Findings">
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
      <Section title="Not linked in this schema">
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
    <div className="mt-8 rounded-xl border border-dashed border-border p-6">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
