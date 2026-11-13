import type { OpenFrameError } from "@/lib/openframe/openframe";
import { UnsupportedSchemaVersionError, type UnsupportedSchemaPayload } from "@/lib/adapters/schema-version";

type ApiFailure = OpenFrameError | UnsupportedSchemaPayload;

export function apiError(error: ApiFailure, status: number): Response {
  return Response.json({ ok: false, errors: [error] }, { status });
}

/** Client-facing failure. Never includes a stack, path, or the thrown message. */
export function publicFailure(
  error: unknown,
  fallback: { message: string; status: number; code?: OpenFrameError["code"]; recoverable?: boolean },
): Response {
  console.error(error);
  if (error instanceof UnsupportedSchemaVersionError) {
    return apiError(error.toPayload(), 422);
  }
  const message = error instanceof Error ? error.message : "";
  const notReady = message === "retired_provider" || message === "cursor_provider_is_async" || message.includes("not implemented");
  if (notReady) {
    return apiError(
      {
        code: "VALIDATION_FAILED",
        message: "Live analysis is not available in this prototype.",
        field: null,
        recoverable: true,
      },
      501,
    );
  }
  return apiError(
    {
      code: fallback.code ?? "UNKNOWN",
      message: fallback.message,
      field: null,
      recoverable: fallback.recoverable ?? fallback.status < 500,
    },
    fallback.status,
  );
}
