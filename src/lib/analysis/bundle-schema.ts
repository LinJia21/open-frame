/**
 * The Cursor one-shot prompt must carry the exact 1.2.0 shape; the model has
 * never seen these schemas. Bundle the $ref files into one document and strip
 * prose so the prompt stays a few tens of KB.
 */
import sampleBundle from "../../../spec/data/sample-analysis-ai-animation.json";
import bundleSchema from "../../../spec/schemas/bundle.schema.json";
import claimExtractionSchema from "../../../spec/schemas/claim-extraction.schema.json";
import commonSchema from "../../../spec/schemas/common.schema.json";
import evidenceAuditSchema from "../../../spec/schemas/evidence-audit.schema.json";
import narrativeComparisonSchema from "../../../spec/schemas/narrative-comparison.schema.json";
import newsArticleSchema from "../../../spec/schemas/news-article.schema.json";
import researchReportSchema from "../../../spec/schemas/research-report.schema.json";

type Node = Record<string, unknown>;

const SOURCES: Array<[string, Node]> = [
  ["common", commonSchema as Node],
  ["news-article", newsArticleSchema as Node],
  ["narrative-comparison", narrativeComparisonSchema as Node],
  ["claim-extraction", claimExtractionSchema as Node],
  ["evidence-audit", evidenceAuditSchema as Node],
  ["research-report", researchReportSchema as Node],
];

const KEEP = new Set([
  "$ref",
  "type",
  "properties",
  "required",
  "items",
  "enum",
  "const",
  "oneOf",
  "anyOf",
  "allOf",
  "not",
  "if",
  "then",
  "else",
  "additionalProperties",
  "minItems",
  "maxItems",
  "minLength",
  "maxLength",
  "minimum",
  "maximum",
  "pattern",
  "format",
  "uniqueItems",
]);

function isNode(value: unknown): value is Node {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function rewriteRef(ref: string, owner: string): string {
  if (ref.startsWith("#/$defs/")) return `#/$defs/${owner}__${ref.slice("#/$defs/".length)}`;
  const match = ref.match(/^([a-z-]+)\.schema\.json(#\/\$defs\/(.+))?$/);
  if (!match) return ref;
  const [, file, , def] = match;
  return def ? `#/$defs/${file}__${def}` : `#/$defs/${file}`;
}

function compact(value: unknown, owner: string): unknown {
  if (Array.isArray(value)) return value.map((item) => compact(item, owner));
  if (!isNode(value)) return value;
  const out: Node = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "$schema" || key === "$id" || key === "title" || key === "description" || key === "examples" || key === "$comment") continue;
    if (key === "properties" && isNode(child)) {
      out.properties = Object.fromEntries(Object.entries(child).map(([name, node]) => [name, compact(node, owner)]));
      continue;
    }
    if (key === "$defs" && isNode(child)) {
      out.$defs = Object.fromEntries(Object.entries(child).map(([name, node]) => [name, compact(node, owner)]));
      continue;
    }
    if (!KEEP.has(key)) continue;
    if (key === "$ref" && typeof child === "string") {
      out.$ref = rewriteRef(child, owner);
      continue;
    }
    out[key] = compact(child, owner);
  }
  return out;
}

function build(): Node {
  const defs: Node = {};
  for (const [name, schema] of SOURCES) {
    const ownDefs = isNode(schema.$defs) ? schema.$defs : {};
    for (const [defName, def] of Object.entries(ownDefs)) {
      defs[`${name}__${defName}`] = compact(def, name);
    }
    const body: Node = {};
    for (const [key, value] of Object.entries(schema)) {
      if (key === "$defs" || key === "$schema" || key === "$id") continue;
      body[key] = compact(value, name);
    }
    defs[name] = compact(body, name);
  }
  const root: Node = {};
  for (const [key, value] of Object.entries(bundleSchema as Node)) {
    if (key === "$schema" || key === "$id" || key === "title" || key === "description") continue;
    root[key] = compact(value, "bundle");
  }
  root.$defs = defs;
  return root;
}

let cached: string | null = null;

/** Merged, description-free bundle JSON Schema for the prompt. */
export function bundleSchemaForPrompt(): string {
  cached ??= JSON.stringify(build());
  return cached;
}

/** Values become placeholders so the model copies keys, not demo content. */
function shape(value: unknown): unknown {
  if (Array.isArray(value)) return value.length === 0 ? [] : [shape(value[0])];
  if (!isNode(value)) {
    if (typeof value === "string") return "<string>";
    if (typeof value === "number") return 0;
    if (typeof value === "boolean") return false;
    return null;
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
}

let shapeCached: string | null = null;

/** Key tree taken from the official 1.2.0 sample, with every value blanked. */
export function bundleShapeForPrompt(): string {
  const rest = { ...(sampleBundle as Node) };
  delete rest.$schema;
  shapeCached ??= JSON.stringify(
    shape({ ...rest, articles: [{ id: "art_x", original_url: "<string>" }] }),
    null,
    1,
  );
  return shapeCached;
}
