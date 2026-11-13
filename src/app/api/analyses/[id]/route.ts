import { connection } from "next/server";
import { apiError, publicFailure } from "@/lib/analysis/errors";
import { getBundleRecord } from "@/lib/store/bundle-store";
import { UnsupportedSchemaVersionError } from "@/lib/adapters/schema-version";
import { isAnalysisId } from "@/lib/analysis/ids";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  if (!isAnalysisId(id)) {
    return apiError(
      { code: "UNKNOWN_REFERENCE", message: "This briefing id is not valid.", field: "bundle_id", recoverable: false },
      404,
    );
  }
  try {
    const record = await getBundleRecord(id);
    if (!record) {
      return apiError(
        { code: "UNKNOWN_REFERENCE", message: "This briefing is not in the local store.", field: "bundle_id", recoverable: false },
        404,
      );
    }
    if (record.kind === "unsupported") {
      return apiError(new UnsupportedSchemaVersionError(record.schemaVersion).toPayload(), 422);
    }
    if (record.kind === "invalid") {
      return apiError(
        { code: "VALIDATION_FAILED", message: "This briefing could not be validated.", field: "schema_version", recoverable: false },
        422,
      );
    }
    const bundle = record.bundle;
    return Response.json({
      ok: true,
      data: bundle,
      warnings: bundle.data_mode === "DEMO" ? ["DEMO DATA"] : [],
    });
  } catch (error) {
    return publicFailure(error, { message: "The demo store could not be read.", status: 500, code: "PARSE_FAILED", recoverable: true });
  }
}
