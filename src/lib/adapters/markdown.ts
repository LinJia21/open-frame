import type { BriefingView } from "@/lib/adapters/to-view";

export function timelineLines(events: Array<{ date: string | null; event: string }>): string[] {
  const dated = events.filter((event) => event.date);
  if (dated.length === 0) return ["No timeline data available"];
  return dated.map((event) => `- ${event.date}: ${event.event}`);
}

function cell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function briefingToMarkdown(view: BriefingView): string {
  const claims = view.report.claims
    .map(
      (claim) =>
        `| ${cell(claim.text)} | ${claim.status} | ${cell(claim.explanation)} | ${claim.claimId} → ${claim.articleId} |`,
    )
    .join("\n");
  const sources = view.report.sources
    .map((source) => `- ${source.publisher}: ${source.title} (${source.url})`)
    .join("\n");
  return [
    `# ${view.subject}`,
    "",
    `> ${view.sourceLabel} (data_mode ${view.sourceMode}). ${view.analysisLabel}.`,
    view.generation === "LIVE_AI"
      ? "> This export is generated analysis. OpenFrame did not retrieve or verify the sources. It is not a checked web search."
      : "> This export is from a pre-generated briefing. It is not a model call.",
    view.generation === "LIVE_AI" && view.modelName ? `> Model pin recorded by the server: ${view.modelName}.` : "",
    "",
    `Schema ${view.schemaVersion}. Topic entered: ${view.query}`,
    `Generated ${view.generatedAt}. ${view.masthead}`,
    "",
    `## Summary`,
    view.report.summary,
    "",
    view.report.bottomLine,
    "",
    view.report.bottomLineClaimIds
      ? `Claims: ${view.report.bottomLineClaimIds.join(", ")}`
      : "not linked in data",
    "",
    `## Findings`,
    ...view.report.findings.map(
      (finding) => `- ${finding.text} (${finding.id}; ${finding.claimIds ? finding.claimIds.join(", ") : "not linked in data"})`,
    ),
    "",
    `## Timeline`,
    ...timelineLines(view.report.timeline),
    "",
    `## Key perspectives`,
    ...view.report.rows.map((row) => `- **${row.publisher}** (${row.articleId}): ${row.argument}`),
    "",
    `## Claim audit`,
    `| Claim | Verification | Rationale | Links |`,
    `| --- | --- | --- | --- |`,
    claims,
    "",
    `## Methodology`,
    view.report.methodology,
    "",
    `## Limitations`,
    ...view.limitations.map((item) => `- ${item}`),
    "",
    `## Evidence text`,
    ...view.audits.flatMap((audit) =>
      [...audit.supporting, ...audit.contradicting, ...audit.unverifiable].map((item) => {
        const kind = item.matchLabel ?? (item.quoteVerification === "unverifiable" ? "Quote not checkable" : "paraphrase");
        const excerpt = item.asQuotation ? `“${item.excerpt ?? ""}”` : (item.excerpt ?? "");
        return `- ${item.id} · ${kind} · ${item.textOrigin ?? "origin not stored"} · ${excerpt}`;
      }),
    ),
    "",
    `## Sources`,
    sources,
    "",
  ].join("\n");
}
