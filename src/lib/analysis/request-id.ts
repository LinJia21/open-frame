import { isAnalysisId } from "@/lib/analysis/ids";

export type DecodedAnalysisId =
  | { ok: true; id: string }
  | { ok: false; status: 400 | 404; code: "INVALID_FORMAT" | "UNKNOWN_REFERENCE"; message: string };

/** Decode a path segment that may be a briefing id. Incomplete percent-encoding is 400, not 500. */
export function decodeAnalysisIdParam(raw: string): DecodedAnalysisId {
  let id: string;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return {
      ok: false,
      status: 400,
      code: "INVALID_FORMAT",
      message: "This briefing id is not valid.",
    };
  }
  if (!isAnalysisId(id)) {
    return {
      ok: false,
      status: 404,
      code: "UNKNOWN_REFERENCE",
      message: "This briefing id is not valid.",
    };
  }
  return { ok: true, id };
}
