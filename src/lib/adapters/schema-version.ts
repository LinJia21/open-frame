import type { AnalysisBundle } from "@/lib/openframe/openframe";
import { AnalysisBundleSchema } from "@/lib/openframe/openframe";

/** Versions this app can map. A new spec gets its own adapter; nothing is inferred. */
export const SUPPORTED_SCHEMA_VERSIONS = ["1.2.0"] as const;

export type SupportedSchemaVersion = (typeof SUPPORTED_SCHEMA_VERSIONS)[number];

export interface UnsupportedSchemaPayload {
  code: "UNSUPPORTED_SCHEMA_VERSION";
  message: string;
  field: "schema_version";
  recoverable: false;
}

export class UnsupportedSchemaVersionError extends Error {
  readonly found: string;

  constructor(found: string) {
    super(unsupportedSchemaMessage(found));
    this.name = "UnsupportedSchemaVersionError";
    this.found = displaySchemaVersion(found);
  }

  toPayload(): UnsupportedSchemaPayload {
    return {
      code: "UNSUPPORTED_SCHEMA_VERSION",
      message: this.message,
      field: "schema_version",
      recoverable: false,
    };
  }
}

export function isSupportedSchemaVersion(value: string): value is SupportedSchemaVersion {
  return (SUPPORTED_SCHEMA_VERSIONS as readonly string[]).includes(value);
}

/** HTML for an unsupported stored schema is 422. A supported version continues into the page. */
export function unsupportedSchemaHttpStatus(version: string | null | undefined): 422 | null {
  if (typeof version === "string" && isSupportedSchemaVersion(version)) return null;
  return 422;
}

export function displaySchemaVersion(value: string): string {
  const cleaned = value.replace(/[^\w.+-]/g, "").slice(0, 32);
  return cleaned || "missing";
}

export function unsupportedSchemaMessage(found: string): string {
  const shown = displaySchemaVersion(found);
  return `schema_version ${shown} is not supported. Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(", ")}.`;
}

export type ClassifiedBundle =
  | { kind: "ready"; bundle: AnalysisBundle }
  | { kind: "unsupported"; bundleId: string; schemaVersion: string }
  | { kind: "invalid"; bundleId: string; schemaVersion: string };

const BUNDLE_ID = /^bnd_[A-Za-z0-9_-]{1,64}$/;

/** Read one stored object without guessing a mapping for an unknown schema_version. */
export function classifyStoredBundle(item: unknown): ClassifiedBundle | null {
  if (!item || typeof item !== "object") return null;
  const record = item as { bundle_id?: unknown; schema_version?: unknown };
  if (typeof record.bundle_id !== "string" || !BUNDLE_ID.test(record.bundle_id)) return null;
  if (typeof record.schema_version !== "string" || !isSupportedSchemaVersion(record.schema_version)) {
    const found = typeof record.schema_version === "string" ? record.schema_version : "missing";
    return { kind: "unsupported", bundleId: record.bundle_id, schemaVersion: displaySchemaVersion(found) };
  }
  const parsed = AnalysisBundleSchema.safeParse(item);
  if (!parsed.success) {
    console.error(
      `bundle ${record.bundle_id} schema_version ${record.schema_version} failed validation (${parsed.error.issues.length} issues)`,
    );
    return { kind: "invalid", bundleId: record.bundle_id, schemaVersion: record.schema_version };
  }
  return { kind: "ready", bundle: parsed.data };
}

export function partitionBundles(items: unknown[]): {
  ready: AnalysisBundle[];
  unsupported: ClassifiedBundle[];
  invalid: ClassifiedBundle[];
} {
  const ready: AnalysisBundle[] = [];
  const unsupported: ClassifiedBundle[] = [];
  const invalid: ClassifiedBundle[] = [];
  for (const item of items) {
    const classified = classifyStoredBundle(item);
    if (!classified) continue;
    if (classified.kind === "ready") ready.push(classified.bundle);
    else if (classified.kind === "unsupported") unsupported.push(classified);
    else invalid.push(classified);
  }
  return { ready, unsupported, invalid };
}
