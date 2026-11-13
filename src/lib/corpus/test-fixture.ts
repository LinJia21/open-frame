/**
 * Labeled test records for mock runs. Nothing in this file is written into the saved library.
 * The outlet and URL are a test shape, not a real historical article.
 */
import { mockUnretrievedBundle } from "@/lib/analysis/cursor-fixture";
import { normalizeImport, prepareSelection } from "@/lib/corpus/materials";
import type { CorpusItem, ResolvedSelection, SavedMaterial } from "@/lib/corpus/types";

export const FIXTURE_NOW = "2026-11-13T04:00:00.000Z";
export const FIXTURE_OUTLET_URL = "https://www.fixture-outlet.org/2026/11/weekday-ferry";
export const FIXTURE_WIRE_URL = "https://www.fixture-wire.org/2026/11/weekday-ferry";

export function harborPayload(now = FIXTURE_NOW, body = "The saved test text says the weekday ferry note is unresolved and gives no checked figures.") {
  return {
    items: [
      {
        event: "weekday-ferries",
        outlet: "Test Fixture Desk",
        title: "Weekday ferry note saved for a test",
        publishedAt: "2026-11-01",
        originalUrl: FIXTURE_OUTLET_URL,
        body,
        summary: "A test fixture summary. The weekday ferry note is unresolved in this saved text.",
        completeness: "full_text",
        syndication: "original",
        fixture: "test",
        savedAt: now,
        country: "this field is ignored and must not set a stance",
      },
    ],
  };
}

export function wirePayload(now = FIXTURE_NOW) {
  return {
    items: [
      {
        event: "weekday-ferries",
        outlet: "Test Fixture Wire",
        title: "Wire copy of the weekday ferry note",
        publishedAt: "2026-11-01",
        originalUrl: FIXTURE_WIRE_URL,
        summary: "A test fixture wire summary of the same saved note.",
        body: null,
        completeness: "summary_only",
        syndication: "reprint",
        reprintOfUrl: FIXTURE_OUTLET_URL,
        fixture: "test",
        savedAt: now,
      },
    ],
  };
}

export function harborSelection(now = FIXTURE_NOW, body?: string): { items: CorpusItem[]; resolved: ResolvedSelection; material: SavedMaterial } {
  const items = normalizeImport(harborPayload(now, body), now);
  const resolved = prepareSelection(items, items.map((item) => item.id));
  return { items, resolved, material: resolved.items[0]! };
}

/** Model-shaped bundle that cites one saved test material. The server still replaces the article body. */
export function citingBundle(material: SavedMaterial, topic: string): Record<string, unknown> {
  const bundle = mockUnretrievedBundle(topic);
  retarget(bundle, material);
  const report = bundle.research_report as { metadata: { warnings: Array<{ code: string; message: string }> } };
  report.metadata.warnings = [{
    code: "OTHER",
    message: "Saved test fixture text only. Not a live internet search and not an external fact check.",
  }];
  return bundle;
}

function retarget(value: unknown, material: SavedMaterial): void {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index];
      if (item === "art_mockcursor01") value[index] = material.id;
      else if (item === "grp_mockcursor01") value[index] = material.independenceGroupId;
      else retarget(item, material);
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (child === "art_mockcursor01") record[key] = material.id;
    else if (child === "grp_mockcursor01") record[key] = material.independenceGroupId;
    else if (child === "https://desk.example/notes/harbor") record[key] = material.originalUrl;
    else if (child === "Example Desk") record[key] = material.outlet;
    else if (child === "DEMO") record[key] = "LIVE";
    else if (child === "Fictional desk note about the topic") record[key] = material.title;
    else if (key === "retrieval_method" && child === "generated_demo") record[key] = "manual_entry";
    else if (key === "accessible_text_origin" && child === "generated_demo") record[key] = "user_supplied";
    else if (key === "fictional_demo_publisher") record[key] = false;
    else if (key === "summary" && child === "A fictional desk note used to illustrate framing. It was not retrieved from a publisher.") record[key] = material.summary;
    else if (key === "accessible_text") record[key] = material.excerpt;
    else retarget(child, material);
  }
}
