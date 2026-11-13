import { ZodError } from "zod";
import type { Language } from "@/lib/i18n/languages";
import type { AnalysisBundle } from "@/lib/openframe/openframe";
import { apiError, publicFailure } from "@/lib/analysis/errors";
import { MAX_REQUEST_BYTES } from "@/lib/analysis/rate-limit";
import { validateTopicInput, type CreateAnalysisInput } from "@/lib/analysis/validate";
import { CursorServiceError, type PublicAnalysisJob } from "@/lib/analysis/cursor-service";

export interface AnalysisHttpDeps {
  provider: "demo" | "cursor" | "retired" | "invalid";
  invalidProvider?: string;
  createDemo: (input: CreateAnalysisInput) => Promise<AnalysisBundle>;
  saveBundle: (bundle: AnalysisBundle) => Promise<void>;
  cursor: {
    start(input: { query: string; language: Language; idempotencyKey: string | null; sourceIds: string[] }): Promise<PublicAnalysisJob>;
    poll(id: string): Promise<PublicAnalysisJob | null>;
    retry(id: string, confirmNewRun: boolean): Promise<PublicAnalysisJob>;
    cancel(id: string): Promise<PublicAnalysisJob>;
  } | null;
  allowRequest: (key: string) => boolean;
}

const JOB_ID = /^job_[0-9a-f-]{36}$/i;

export function isJobId(value: string): boolean {
  return JOB_ID.test(value);
}

export async function handleCreateAnalysis(request: Request, deps: AnalysisHttpDeps): Promise<Response> {
  const size = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(size) && size > MAX_REQUEST_BYTES) {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
  }
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!deps.allowRequest(key)) {
    return apiError({ code: "RATE_LIMITED", message: "rate_limited", field: null, recoverable: true }, 429);
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_REQUEST_BYTES) {
      return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
    }
    body = JSON.parse(text);
  } catch {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
  }
  const record = body && typeof body === "object"
    ? (body as { query?: unknown; language?: unknown; intent?: unknown; sourceIds?: unknown })
    : {};
  const intent = record.intent === "demo" || record.intent === "saved"
    ? record.intent
    : deps.provider === "demo"
      ? "demo"
      : "saved";
  const parsed = validateTopicInput(record.query, record.language);
  if (!parsed.ok) {
    return apiError(
      {
        code: parsed.code === "language_invalid" ? "INVALID_FORMAT" : "MISSING_REQUIRED_FIELD",
        message: parsed.code,
        field: parsed.code === "language_invalid" ? "language" : "query",
        recoverable: true,
      },
      400,
    );
  }
  if (deps.provider === "invalid") {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_provider", field: "ANALYSIS_PROVIDER", recoverable: true }, 400);
  }
  if (deps.provider === "retired") {
    return apiError({ code: "UNKNOWN", message: "retired_provider", field: null, recoverable: false }, 501);
  }
  if (intent === "demo") {
    if (deps.provider !== "demo" && deps.provider !== "cursor") {
      return apiError({ code: "UNKNOWN", message: "config_not_ready", field: null, recoverable: true }, 503);
    }
    try {
      const bundle = await deps.createDemo(parsed.value);
      await deps.saveBundle(bundle);
      return Response.json({ ok: true, data: bundle, warnings: [bundle.data_mode_notice ?? "DEMO"] }, { status: 201 });
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(`validation failed (${error.issues.length} issues)`);
        return apiError({ code: "VALIDATION_FAILED", message: "validation_failed", field: null, recoverable: false }, 422);
      }
      return publicFailure(error, { message: "store_failed", status: 500 });
    }
  }
  if (deps.provider === "demo") {
    return apiError({ code: "UNKNOWN", message: "saved_analysis_needs_cursor", field: null, recoverable: true }, 409);
  }
  if (!deps.cursor) {
    return apiError({ code: "UNKNOWN", message: "config_not_ready", field: null, recoverable: true }, 503);
  }
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey != null && !/^[A-Za-z0-9._:-]{8,80}$/.test(idempotencyKey)) {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_idempotency_key", field: "Idempotency-Key", recoverable: true }, 400);
  }
  const sourceIds = readSourceIds(record.sourceIds);
  if (sourceIds === null) {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_source_ids", field: "sourceIds", recoverable: true }, 400);
  }
  try {
    const job = await deps.cursor.start({
      query: parsed.value.query,
      language: parsed.value.language,
      idempotencyKey,
      sourceIds,
    });
    return Response.json(
      {
        ok: true,
        data: { job },
        warnings: ["Saved materials were sent to Cursor. This is not a live internet search. liveCallVerified is false."],
      },
      { status: 202 },
    );
  } catch (error) {
    return serviceFailure(error);
  }
}

export async function handlePollJob(id: string, deps: AnalysisHttpDeps): Promise<Response> {
  if (!isJobId(id)) {
    return apiError({ code: "UNKNOWN_REFERENCE", message: "not_found", field: "job_id", recoverable: false }, 404);
  }
  if (!deps.cursor) {
    return apiError({ code: "UNKNOWN", message: "config_not_ready", field: null, recoverable: true }, 503);
  }
  try {
    const job = await deps.cursor.poll(id);
    if (!job) return apiError({ code: "UNKNOWN_REFERENCE", message: "not_found", field: "job_id", recoverable: false }, 404);
    return Response.json({ ok: true, data: { job }, warnings: job.liveCallVerified ? [] : ["liveCallVerified is false"] });
  } catch (error) {
    return serviceFailure(error);
  }
}

export async function handleRetryJob(id: string, request: Request, deps: AnalysisHttpDeps): Promise<Response> {
  if (!isJobId(id)) {
    return apiError({ code: "UNKNOWN_REFERENCE", message: "not_found", field: "job_id", recoverable: false }, 404);
  }
  if (!deps.cursor) {
    return apiError({ code: "UNKNOWN", message: "config_not_ready", field: null, recoverable: true }, 503);
  }
  let confirmNewRun = false;
  try {
    const text = await request.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { confirmNewRun?: unknown };
      confirmNewRun = body.confirmNewRun === true;
    }
  } catch {
    return apiError({ code: "INVALID_FORMAT", message: "invalid_json", field: null, recoverable: true }, 400);
  }
  try {
    const job = await deps.cursor.retry(id, confirmNewRun);
    return Response.json({ ok: true, data: { job }, warnings: ["A retry can start another billed run. liveCallVerified is false."] });
  } catch (error) {
    return serviceFailure(error);
  }
}

export async function handleCancelJob(id: string, deps: AnalysisHttpDeps): Promise<Response> {
  if (!isJobId(id)) {
    return apiError({ code: "UNKNOWN_REFERENCE", message: "not_found", field: "job_id", recoverable: false }, 404);
  }
  if (!deps.cursor) {
    return apiError({ code: "UNKNOWN", message: "config_not_ready", field: null, recoverable: true }, 503);
  }
  try {
    const job = await deps.cursor.cancel(id);
    return Response.json({ ok: true, data: { job }, warnings: [] });
  } catch (error) {
    return serviceFailure(error);
  }
}

function readSourceIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) return value == null ? [] : null;
  if (!value.every((item) => typeof item === "string" && /^[a-z]{2,4}_[A-Za-z0-9_-]{1,64}$/.test(item))) return null;
  return [...new Set(value)];
}

function serviceFailure(error: unknown): Response {
  if (error instanceof CursorServiceError || (error instanceof Error && "code" in error && "status" in error)) {
    const code = (error as { code: string }).code;
    const status = (error as { status: number }).status;
    return apiError(
      {
        code: code === "rate_limited" || code === "too_many_runs" ? "RATE_LIMITED" : code === "validation_failed" ? "VALIDATION_FAILED" : "UNKNOWN",
        message: code,
        field: null,
        recoverable: code === "confirmation_required" || code === "rate_limited" || code === "config_not_ready" || code === "network_disabled",
      },
      status,
    );
  }
  return publicFailure(error, { message: "store_failed", status: 500 });
}
