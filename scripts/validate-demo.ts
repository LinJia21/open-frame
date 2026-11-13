/**
 * Validate official fixtures and the bundles the app actually serves.
 * Ajv draft 2020-12 (all schemas together) and the vendored Zod schema.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { AnalysisBundleSchema } from "../src/lib/openframe/openframe";
import { adapterFixtures } from "../src/lib/demo/catalog";

const schemaDir = join(process.cwd(), "spec", "schemas");
const ajv = new Ajv2020({ allErrors: true, strict: false, strictRequired: false, strictTypes: false, allowUnionTypes: true });
addFormats(ajv);
for (const name of [
  "common.schema.json",
  "news-article.schema.json",
  "narrative-comparison.schema.json",
  "claim-extraction.schema.json",
  "evidence-audit.schema.json",
  "research-report.schema.json",
  "bundle.schema.json",
]) {
  ajv.addSchema(JSON.parse(readFileSync(join(schemaDir, name), "utf8")));
}
const validate = ajv.getSchema("https://openframe.example/schemas/bundle.schema.json");
if (!validate) throw new Error("Bundle schema was not registered.");

const official = ["demo-dataset.json", "sample-analysis-ai-animation.json"].map((name) => ({
  name,
  bundle: JSON.parse(readFileSync(join(process.cwd(), "spec", "data", name), "utf8")),
}));

let failed = 0;
const lines: string[] = ["OpenFrame 1.2.0 validation", ""];
for (const fixture of [...official, ...adapterFixtures()]) {
  const ajvOk = Boolean(validate(fixture.bundle));
  const zod = AnalysisBundleSchema.safeParse(fixture.bundle);
  const generation = (fixture.bundle as { analysis_generation?: string }).analysis_generation;
  const ok = ajvOk && zod.success && generation === "PRECOMPUTED";
  if (!ok) failed += 1;
  lines.push(`${ok ? "PASS" : "FAIL"}  ${fixture.name}  ajv=${ajvOk ? "ok" : "fail"}  zod=${zod.success ? "ok" : "fail"}  analysis_generation=${generation}`);
  if (!ajvOk) lines.push((validate.errors ?? []).slice(0, 8).map((error) => `  ajv ${error.instancePath} ${error.message}`).join("\n"));
  if (!zod.success) lines.push(zod.error.issues.slice(0, 8).map((issue) => `  zod ${issue.path.join(".")} ${issue.message}`).join("\n"));
}
lines.push("", failed === 0 ? "Result: all bundles passed." : `Result: ${failed} failed.`);
process.stdout.write(`${lines.join("\n")}\n`);
if (failed > 0) process.exit(1);
