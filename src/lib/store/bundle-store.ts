import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AnalysisBundleSchema, type AnalysisBundle } from "@/lib/openframe/openframe";
import { classifyStoredBundle, partitionBundles, type ClassifiedBundle } from "@/lib/adapters/schema-version";
import { FIXTURE_IDS } from "@/lib/analysis/fixture-ids";
import { fixtureById } from "@/lib/demo/catalog";
import { readQaSeedBundles } from "@/lib/store/schema-lookup";

const STORE_PATH = path.join(process.cwd(), "data", "store", "analyses.json");
const MAX_BUNDLES = 40;

interface StoreFile {
  version: 1;
  bundles: AnalysisBundle[];
}

let chain: Promise<void> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("bundles" in parsed)) {
      throw new Error("The demo store file has an unexpected shape.");
    }
    const bundles = (parsed as { bundles?: unknown }).bundles;
    if (!Array.isArray(bundles)) {
      throw new Error("The demo store file has an unexpected shape.");
    }
    const { ready } = partitionBundles(bundles);
    return { version: 1, bundles: ready };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { version: 1, bundles: [] };
    }
    throw error;
  }
}

export async function listBundles(): Promise<AnalysisBundle[]> {
  const store = await readStore();
  const fixtures = FIXTURE_IDS.map((id) => fixtureById(id)).filter((bundle): bundle is AnalysisBundle => bundle !== null);
  const seen = new Set(fixtures.map((bundle) => bundle.bundle_id));
  return [...fixtures, ...store.bundles.filter((bundle) => !seen.has(bundle.bundle_id))];
}

export async function getBundle(id: string): Promise<AnalysisBundle | null> {
  const record = await getBundleRecord(id);
  return record?.kind === "ready" ? record.bundle : null;
}

export async function getBundleRecord(id: string): Promise<ClassifiedBundle | null> {
  const raw = await readRawBundles();
  for (const item of raw) {
    const classified = classifyStoredBundle(item);
    if (!classified) continue;
    const bundleId = classified.kind === "ready" ? classified.bundle.bundle_id : classified.bundleId;
    if (bundleId === id) return classified;
  }
  const fixture = fixtureById(id);
  if (fixture) return { kind: "ready", bundle: fixture };
  return null;
}

async function readRawBundles(): Promise<unknown[]> {
  const qa = readQaSeedBundles();
  const qaIds = new Set(
    qa
      .map((item) => (item && typeof item === "object" ? (item as { bundle_id?: unknown }).bundle_id : null))
      .filter((id): id is string => typeof id === "string"),
  );
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("bundles" in parsed)) {
      throw new Error("The demo store file has an unexpected shape.");
    }
    const bundles = (parsed as { bundles?: unknown }).bundles;
    if (!Array.isArray(bundles)) {
      throw new Error("The demo store file has an unexpected shape.");
    }
    return [...qa, ...bundles.filter((item) => bundleIdOf(item) === null || !qaIds.has(bundleIdOf(item) as string))];
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") return qa;
    throw error;
  }
}

export async function saveBundle(bundle: AnalysisBundle): Promise<void> {
  const parsed = AnalysisBundleSchema.parse(bundle);
  await withLock(async () => {
    const raw = await readRawBundles();
    const others = raw.filter((item) => {
      const id = bundleIdOf(item);
      return id !== parsed.bundle_id && !FIXTURE_IDS.includes(id as (typeof FIXTURE_IDS)[number]);
    });
    const kept = raw.filter((item) => {
      const id = bundleIdOf(item);
      return id !== parsed.bundle_id && FIXTURE_IDS.includes(id as (typeof FIXTURE_IDS)[number]);
    });
    const room = Math.max(0, MAX_BUNDLES - kept.length - 1);
    const next = [parsed, ...kept, ...others.slice(0, room)];
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    const temporary = `${STORE_PATH}.tmp`;
    await fs.writeFile(temporary, JSON.stringify({ version: 1, bundles: next }, null, 2));
    await fs.rename(temporary, STORE_PATH);
  });
}

function bundleIdOf(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const id = (item as { bundle_id?: unknown }).bundle_id;
  return typeof id === "string" ? id : null;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
