import { AnalysisBundleSchema, countIndependentSources, isReservedDemoUrl, type AnalysisBundle } from "@/lib/openframe/openframe";
import { PROMPT_TEMPLATE_VERSION } from "@/lib/openframe/prompts";
import { stampRawQuotes } from "@/lib/guards/prompts";
import { PINNED_MODEL_ID, redactSecrets } from "@/lib/analysis/cursor-config";
import type { Language } from "@/lib/i18n/languages";
import { languageOption } from "@/lib/i18n/languages";
import { articlesFromMaterials, savedMaterialNotice } from "@/lib/corpus/materials";
import type { LibrarySnapshot, SavedMaterial } from "@/lib/corpus/types";
import { canonicalUrl, isBlockedHost } from "@/lib/corpus/url";

export const GENERATED_NOTICE =
  "Generated at request time. SpectraX did not retrieve articles and did not verify facts. Reserved example links are illustrations, not citations.";

const BUNDLE_PROMPT_ID = "openframe.cursor_bundle";
const SAVED_PROMPT_ID = "openframe.cursor_saved_materials";
const EXTERNAL_CLAIM_RE = /live internet search|searched the (live )?(web|internet)|fact-?checked against|externally verified|browsed the web|fetched the (url|article|page)/i;

export class OutputRejected extends Error {
  readonly code:
    | "invalid_json"
    | "incomplete_output"
    | "unsafe_url"
    | "claimed_retrieval"
    | "claimed_verification"
    | "sensitive_echo"
    | "validation_failed"
    | "invented_source"
    | "incomplete_sources"
    | "external_verification";
  readonly paths: string[];

  constructor(code: OutputRejected["code"], paths: string[] = []) {
    super(code);
    this.name = "OutputRejected";
    this.code = code;
    this.paths = paths;
  }
}

const URL_LIKE = /\b(?:https?|javascript|data|file):[^\s"'<>)\\]+/gi;
const VERIFIED_STATUSES = new Set(["Verified", "Partially Supported", "Disputed", "Contradicted"]);

export interface AcceptCursorOutputInput {
  text: string;
  query: string;
  language: Language;
  nowIso: string;
  bundleId: string;
  secrets: Array<string | null | undefined>;
}

/** Parse, reject unsafe or unverified-looking claims, then stamp server-owned fields. */
export function acceptCursorOutput(input: AcceptCursorOutputInput): AnalysisBundle {
  const redacted = redactSecrets(input.text, input.secrets);
  if (redacted !== input.text) throw new OutputRejected("sensitive_echo");
  if (/authorization\s*:/i.test(input.text) || /cursor_api_key/i.test(input.text)) {
    throw new OutputRejected("sensitive_echo");
  }
  const parsed = extractJsonObject(input.text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new OutputRejected("incomplete_output");
  }
  const record = parsed as Record<string, unknown>;
  assertUnretrieved(record);
  stampServerFields(record, input);
  const result = AnalysisBundleSchema.safeParse(record);
  if (!result.success) {
    throw new OutputRejected(
      "validation_failed",
      result.error.issues.slice(0, 12).map((issue) => issue.path.map(String).join(".")),
    );
  }
  assertUnretrieved(result.data as unknown as Record<string, unknown>);
  return result.data;
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  const body = (fenced ? fenced[1] : trimmed).trim();
  if (!body.startsWith("{") || !body.endsWith("}")) throw new OutputRejected("invalid_json");
  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new OutputRejected("invalid_json");
  }
}

function stampServerFields(bundle: Record<string, unknown>, input: AcceptCursorOutputInput): void {
  const metadata = {
    generated_at: input.nowIso,
    model_name: PINNED_MODEL_ID,
    prompt_template_id: BUNDLE_PROMPT_ID,
    prompt_version: PROMPT_TEMPLATE_VERSION,
  };
  bundle.schema_version = "1.2.0";
  bundle.bundle_id = input.bundleId;
  bundle.analysis_generation = "LIVE_AI";
  bundle.analysis_metadata = metadata;
  bundle.generated_at = input.nowIso;
  bundle.data_mode_notice = GENERATED_NOTICE;
  for (const key of ["narrative_comparison", "claim_extraction", "evidence_audit", "research_report"] as const) {
    const part = bundle[key];
    if (!part || typeof part !== "object" || Array.isArray(part)) continue;
    const record = part as Record<string, unknown>;
    record.analysis_generation = "LIVE_AI";
    record.analysis_metadata = metadata;
    if ("topic" in record) record.topic = input.query;
  }
  const report = bundle.research_report;
  if (report && typeof report === "object" && !Array.isArray(report)) {
    const metadataRecord = (report as Record<string, unknown>).metadata;
    if (metadataRecord && typeof metadataRecord === "object" && !Array.isArray(metadataRecord)) {
      const meta = metadataRecord as Record<string, unknown>;
      meta.topic = input.query;
      meta.research_question = input.query;
      meta.generated_at = input.nowIso;
      meta.data_mode = bundle.data_mode === "DEMO" ? "DEMO" : meta.data_mode;
    }
  }
  const bcp47 = languageOption(input.language).bcp47;
  if (Array.isArray(bundle.articles)) {
    for (const article of bundle.articles) {
      if (article && typeof article === "object" && !Array.isArray(article)) {
        (article as Record<string, unknown>).language = bcp47;
      }
    }
  }
}

function assertUnretrieved(root: Record<string, unknown>): void {
  walk(root, (value) => {
    if (typeof value === "string") scanString(value);
  });
  walkObjects(root, (record) => {
    if (typeof record.data_mode === "string" && record.data_mode !== "DEMO") {
      throw new OutputRejected("claimed_retrieval", ["data_mode"]);
    }
    if (typeof record.retrieval_method === "string" && record.retrieval_method !== "generated_demo") {
      throw new OutputRejected("claimed_retrieval", ["retrieval_method"]);
    }
    if (typeof record.accessible_text_origin === "string" && record.accessible_text_origin !== "generated_demo") {
      throw new OutputRejected("claimed_retrieval", ["accessible_text_origin"]);
    }
    if (typeof record.status === "string" && VERIFIED_STATUSES.has(record.status)) {
      throw new OutputRejected("claimed_verification", ["status"]);
    }
    if (typeof record.strength === "string" && record.strength !== "not_established") {
      throw new OutputRejected("claimed_verification", ["strength"]);
    }
    if (record.is_verbatim === true) throw new OutputRejected("claimed_verification", ["is_verbatim"]);
    if (record.quote_verification === "verified_substring") {
      throw new OutputRejected("claimed_verification", ["quote_verification"]);
    }
    for (const key of ["original_url", "url", "origin_url"] as const) {
      const url = record[key];
      if (typeof url === "string" && !isSafeIllustrationUrl(url)) {
        throw new OutputRejected("unsafe_url", [key]);
      }
    }
  });
}

function scanString(value: string): void {
  const matches = value.match(URL_LIKE) ?? [];
  for (const match of matches) {
    const cleaned = match.replace(/[.,;]+$/, "");
    if (!isSafeIllustrationUrl(cleaned)) throw new OutputRejected("unsafe_url");
  }
}

export function isSafeIllustrationUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  if (url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  return isReservedDemoUrl(raw);
}

export interface AcceptSavedMaterialInput extends AcceptCursorOutputInput {
  materials: SavedMaterial[];
  library: LibrarySnapshot;
}

/**
 * Accept a model bundle only when every URL and article id is one of the
 * selected saved materials. Article text, outlet, and URL are then replaced
 * from that selection. The model cannot add a source or claim it searched the web.
 */
export function acceptSavedMaterialOutput(input: AcceptSavedMaterialInput): AnalysisBundle {
  assertNoSecretEcho(input.text, input.secrets);
  const parsed = extractJsonObject(input.text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new OutputRejected("incomplete_output");
  }
  const record = parsed as Record<string, unknown>;
  const articles = articlesFromMaterials(input.materials);
  const allowed = new Set(input.materials.flatMap((material) => [material.originalUrl, material.reprintOfUrl, material.sharedOriginalUrl].filter((url): url is string => Boolean(url))));
  const allowedCanonical = new Set([...allowed].map((url) => canonicalUrl(new URL(url))));
  scanSavedUrls(record, allowedCanonical);
  assertSavedMethods(record);
  assertNoExternalClaim(record);
  const modelArticles = Array.isArray(record.articles) ? record.articles : [];
  const modelIds = modelArticles.map((article) => (article && typeof article === "object" ? (article as { id?: unknown }).id : null));
  const expected = [...input.materials.map((material) => material.id)].sort();
  const actual = modelIds.filter((id): id is string => typeof id === "string").sort();
  if (modelIds.length !== actual.length || expected.join("\n") !== actual.join("\n")) {
    throw new OutputRejected("incomplete_sources", ["articles"]);
  }
  for (const article of modelArticles) {
    if (!article || typeof article !== "object") throw new OutputRejected("incomplete_sources", ["articles"]);
    const record = article as { original_url?: unknown; originalUrl?: unknown };
    const url = record.original_url ?? record.originalUrl;
    if (typeof url !== "string" || !allowedCanonical.has(canonicalUrl(new URL(url)))) {
      throw new OutputRejected("invented_source", ["original_url"]);
    }
  }
  record.articles = articles;
  const byId = new Map(articles.map((article) => [article.id, article]));
  alignCitations(record, byId);
  record.data_mode = "LIVE";
  forceLiveMode(record);
  const selectedOutlets = new Set(input.materials.map((material) => material.outlet)).size;
  record.data_mode_notice = savedMaterialNotice({
    cutoff: input.library.cutoff,
    selected: input.materials.length,
    selectedOutlets,
    libraryOutlets: input.library.outletCount,
  });
  stampSavedFields(record, input);
  const stamped = stampRawQuotes(record);
  const result = AnalysisBundleSchema.safeParse(stamped);
  if (!result.success) {
    throw new OutputRejected(
      "validation_failed",
      result.error.issues.slice(0, 12).map((issue) => issue.path.map(String).join(".")),
    );
  }
  return result.data;
}

function assertNoSecretEcho(text: string, secrets: Array<string | null | undefined>): void {
  if (redactSecrets(text, secrets) !== text) throw new OutputRejected("sensitive_echo");
  if (/authorization\s*:/i.test(text) || /cursor_api_key/i.test(text)) throw new OutputRejected("sensitive_echo");
}

function scanSavedUrls(value: unknown, allowed: Set<string>): void {
  walk(value, (item) => {
    if (typeof item !== "string") return;
    const matches = item.match(URL_LIKE) ?? [];
    for (const match of matches) {
      const cleaned = match.replace(/[.,;]+$/, "");
      let url: URL;
      try {
        url = new URL(cleaned);
      } catch {
        throw new OutputRejected("invented_source");
      }
      if (url.protocol !== "https:" || url.username || url.password || url.port || isBlockedHost(url.hostname)) {
        throw new OutputRejected("unsafe_url");
      }
      if (isReservedDemoUrl(url.toString()) || !allowed.has(canonicalUrl(url))) {
        throw new OutputRejected("invented_source");
      }
    }
  });
}

function assertSavedMethods(root: Record<string, unknown>): void {
  walkObjects(root, (record) => {
    if (typeof record.retrieval_method === "string" && record.retrieval_method !== "manual_entry") {
      throw new OutputRejected("claimed_retrieval", ["retrieval_method"]);
    }
    if (typeof record.accessible_text_origin === "string" && record.accessible_text_origin !== "user_supplied") {
      throw new OutputRejected("claimed_retrieval", ["accessible_text_origin"]);
    }
  });
}

function assertNoExternalClaim(root: Record<string, unknown>): void {
  const buckets = [
    textAt(root, ["narrative_comparison", "method_notes"]),
    textAt(root, ["research_report", "executive_summary", "text"]),
    textAt(root, ["research_report", "executive_summary", "bottom_line"]),
    textAt(root, ["research_report", "narrative_analysis", "text"]),
  ];
  walkObjects(root, (record) => {
    for (const key of ["explanation", "basis_note", "absence_interpretation", "why_it_matters", "gap"] as const) {
      if (typeof record[key] === "string") buckets.push(record[key]);
    }
  });
  if (buckets.filter((item): item is string => typeof item === "string").some((item) => EXTERNAL_CLAIM_RE.test(item))) {
    throw new OutputRejected("external_verification");
  }
}

function textAt(root: Record<string, unknown>, path: string[]): string | null {
  let current: unknown = root;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : null;
}

function alignCitations(root: Record<string, unknown>, articles: Map<string, AnalysisBundle["articles"][number]>): void {
  walkObjects(root, (record) => {
    const articleId = record.article_id;
    if (typeof articleId !== "string" || !articles.has(articleId)) return;
    const article = articles.get(articleId)!;
    if (typeof record.url === "string") {
      let url: URL;
      try {
        url = new URL(record.url);
      } catch {
        throw new OutputRejected("invented_source", ["url"]);
      }
      if (canonicalUrl(url) !== canonicalUrl(new URL(article.original_url))) {
        throw new OutputRejected("invented_source", ["url"]);
      }
      record.url = article.original_url;
      record.data_mode = "LIVE";
      record.retrieval_method = "manual_entry";
    }
    if (typeof record.original_source_url === "string") {
      let url: URL;
      try {
        url = new URL(record.original_source_url);
      } catch {
        throw new OutputRejected("invented_source", ["original_source_url"]);
      }
      if (canonicalUrl(url) !== canonicalUrl(new URL(article.original_url)) && !articlesHaveUrl(articles, record.original_source_url)) {
        throw new OutputRejected("invented_source", ["original_source_url"]);
      }
    }
    if ("independence_group_id" in record && (record.excerpt !== undefined || record.main_argument_short !== undefined)) {
      record.independence_group_id = article.dedup.independence_group_id;
    }
    if (typeof record.main_argument_short === "string") {
      record.publisher = article.publisher.name;
      record.content_type = article.content_type;
    }
    if (Array.isArray(record.supporting_evidence) && record.independent_source_count && typeof record.independent_source_count === "object") {
      const supporting = record.supporting_evidence as Array<{ independence_group_id?: string }>;
      const contradicting = Array.isArray(record.contradicting_evidence)
        ? record.contradicting_evidence as Array<{ independence_group_id?: string }>
        : [];
      record.independent_source_count = {
        supporting: countIndependentSources(supporting.filter((item) => item.independence_group_id).map((item) => ({ independence_group_id: item.independence_group_id! }))),
        contradicting: countIndependentSources(contradicting.filter((item) => item.independence_group_id).map((item) => ({ independence_group_id: item.independence_group_id! }))),
      };
    }
  });
}

function articlesHaveUrl(articles: Map<string, AnalysisBundle["articles"][number]>, raw: string): boolean {
  try {
    const canon = canonicalUrl(new URL(raw));
    return [...articles.values()].some((article) => canonicalUrl(new URL(article.original_url)) === canon);
  } catch {
    return false;
  }
}

function forceLiveMode(value: unknown): void {
  walkObjects(value, (record) => {
    if (record.data_mode === "DEMO" || record.data_mode === "MIXED") record.data_mode = "LIVE";
    if (Array.isArray(record.warnings)) {
      record.warnings = record.warnings.filter((warning) => {
        if (!warning || typeof warning !== "object") return true;
        const code = (warning as { code?: unknown }).code;
        return code !== "DEMO_DATA" && code !== "MIXED_DATA";
      });
      (record.warnings as Array<unknown>).push({
        code: "OTHER",
        message: "Audit labels compare the saved materials only. They are not an external fact check.",
      });
    }
  });
}

function stampSavedFields(bundle: Record<string, unknown>, input: AcceptSavedMaterialInput): void {
  const metadata = {
    generated_at: input.nowIso,
    model_name: PINNED_MODEL_ID,
    prompt_template_id: SAVED_PROMPT_ID,
    prompt_version: PROMPT_TEMPLATE_VERSION,
  };
  bundle.schema_version = "1.2.0";
  bundle.bundle_id = input.bundleId;
  bundle.analysis_generation = "LIVE_AI";
  bundle.analysis_metadata = metadata;
  bundle.generated_at = input.nowIso;
  for (const key of ["narrative_comparison", "claim_extraction", "evidence_audit", "research_report"] as const) {
    const part = bundle[key];
    if (!part || typeof part !== "object" || Array.isArray(part)) continue;
    const record = part as Record<string, unknown>;
    record.analysis_generation = "LIVE_AI";
    record.analysis_metadata = metadata;
    if ("topic" in record) record.topic = input.query;
  }
  const report = bundle.research_report;
  if (report && typeof report === "object" && !Array.isArray(report)) {
    const metadataRecord = (report as Record<string, unknown>).metadata;
    if (metadataRecord && typeof metadataRecord === "object" && !Array.isArray(metadataRecord)) {
      const meta = metadataRecord as Record<string, unknown>;
      meta.topic = input.query;
      meta.research_question = input.query;
      meta.generated_at = input.nowIso;
      meta.data_mode = "LIVE";
    }
  }
  const bcp47 = languageOption(input.language).bcp47;
  if (Array.isArray(bundle.articles)) {
    for (const article of bundle.articles) {
      if (article && typeof article === "object" && !Array.isArray(article)) {
        (article as Record<string, unknown>).language = bcp47;
      }
    }
  }
}

function walk(value: unknown, visit: (value: unknown) => void): void {
  visit(value);
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) walk(nested, visit);
  }
}

function walkObjects(value: unknown, visit: (record: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walkObjects(item, visit);
    return;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    visit(record);
    for (const nested of Object.values(record)) walkObjects(nested, visit);
  }
}
