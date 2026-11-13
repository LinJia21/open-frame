import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const STORE_PATH = path.join(process.cwd(), "data", "store", "analyses.json");
const QA_SEED_PATH = path.join(process.cwd(), "data", "qa", "unsupported-schema-bundles.json");

interface LooseBundle {
  bundle_id?: unknown;
  schema_version?: unknown;
}

/** undefined = not stored. null = stored without a schema_version string. QA seed wins over the runtime store. */
export function storedSchemaVersion(id: string): string | null | undefined {
  const fromQa = schemaVersionInFile(QA_SEED_PATH, id);
  if (fromQa !== undefined) return fromQa;
  return schemaVersionInFile(STORE_PATH, id);
}

function schemaVersionInFile(file: string, id: string): string | null | undefined {
  if (!existsSync(file)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { bundles?: LooseBundle[] };
    if (!Array.isArray(parsed.bundles)) return undefined;
    const bundle = parsed.bundles.find((item) => item.bundle_id === id);
    if (!bundle) return undefined;
    return typeof bundle.schema_version === "string" ? bundle.schema_version : null;
  } catch {
    return undefined;
  }
}

export function readQaSeedBundles(): unknown[] {
  if (!existsSync(QA_SEED_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(QA_SEED_PATH, "utf8")) as { bundles?: unknown };
    return Array.isArray(parsed.bundles) ? parsed.bundles : [];
  } catch {
    return [];
  }
}
