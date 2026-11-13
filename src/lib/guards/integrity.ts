import { findStanceTerms, type AnalysisBundle, type DataMode, type VerificationStatus } from "@/lib/openframe/openframe";
import { analysisBadge, sourceBadge } from "@/lib/adapters/provenance";

export interface IntegrityIssue {
  code: "STATUS_MISMATCH" | "UNKNOWN_AUDIT" | "VERBATIM_NOT_IN_SOURCE" | "STANCE_LABEL" | "NOTICE_IGNORED_FOR_BADGE";
  message: string;
  field: string;
}

const LIVE_AI_LABEL = /live\s*ai\s*analysis/i;

/** Report rows must match the audit. A mismatch is withheld instead of shown. */
export function reportAuditIssues(bundle: AnalysisBundle): IntegrityIssue[] {
  const audits = new Map(bundle.evidence_audit.audits.map((audit) => [audit.id, audit]));
  const issues: IntegrityIssue[] = [];
  bundle.research_report.key_claim_verification.forEach((row, index) => {
    const field = `research_report.key_claim_verification.${index}`;
    const audit = audits.get(row.audit_id);
    if (!audit) {
      issues.push({
        code: "UNKNOWN_AUDIT",
        field,
        message: `Report row ${row.audit_id} does not match an audit. Its status was not shown.`,
      });
      return;
    }
    if (audit.claim_id !== row.claim_id || audit.status !== row.status || audit.confidence.level !== row.confidence_level) {
      issues.push({
        code: "STATUS_MISMATCH",
        field: `${field}.status`,
        message: `Report status “${row.status}” does not match audit ${audit.id} (“${audit.status}”). The report status was not shown.`,
      });
    }
  });
  return issues;
}

export function statusForReportRow(
  bundle: AnalysisBundle,
  auditId: string,
  reportedStatus: VerificationStatus,
): { status: VerificationStatus | null; withheld: string | null } {
  const issue = reportAuditIssues(bundle).find((item) => item.field.includes(auditId) || item.message.includes(auditId));
  if (!issue) return { status: reportedStatus, withheld: null };
  return { status: null, withheld: issue.message };
}

/** Verbatim text may be shown in quotes only when it is an exact substring of stored article text. */
export function verbatimIsInSource(quote: string | null | undefined, accessibleText: string | null | undefined): boolean {
  if (!quote) return false;
  if (!accessibleText) return false;
  return accessibleText.includes(quote);
}

export function isStanceLabel(value: string): boolean {
  return findStanceTerms(value).length > 0;
}

/** Hide a free-text value that looks like a stance label. The stored text is not rewritten. */
export function visibleFrame(value: string): string | null {
  if (isStanceLabel(value)) return null;
  return value;
}

/**
 * Badges come only from data_mode and analysis_generation.
 * Notice text is never consulted.
 */
export function badgesFromFields(input: {
  dataMode: DataMode | "MIXED";
  analysisGeneration: "PRECOMPUTED" | "LIVE_AI";
  generatedAt: string | null;
  notice?: string | null;
}): { sourceLabel: string; analysisLabel: string | null; notice: string; issues: IntegrityIssue[] } {
  void input.notice;
  const issues: IntegrityIssue[] = [];
  let notice = input.notice ?? "";
  if (LIVE_AI_LABEL.test(notice)) {
    issues.push({
      code: "NOTICE_IGNORED_FOR_BADGE",
      field: "data_mode_notice",
      message: "A notice contained a live-analysis label. Badges were taken from the fields, and that label was not displayed.",
    });
    notice = notice.replace(LIVE_AI_LABEL, "[label withheld]");
  }
  return {
    sourceLabel: sourceBadge(input.dataMode).label,
    analysisLabel: analysisBadge(input.analysisGeneration, input.generatedAt).label,
    notice,
    issues,
  };
}
