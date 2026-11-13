import { NEWS_SOURCES } from "@/lib/sources/catalog";

export const DEMO_PROGRESS_STORAGE_KEY = "openframe_demo_progress";
export const DEMO_STEP_MS = 6_000;
export const DEMO_STEP_COUNT = 4;

export interface DemoProgressSnapshot {
  query: string;
  sourceIds: string[];
  startedAt: number;
}

const KNOWN_SOURCE_IDS = new Set(NEWS_SOURCES.map((source) => source.id));

function isSnapshot(value: unknown): value is DemoProgressSnapshot {
  if (!value || typeof value !== "object") return false;
  const record = value as { query?: unknown; sourceIds?: unknown; startedAt?: unknown };
  return (
    typeof record.query === "string" &&
    record.query.trim().length > 0 &&
    typeof record.startedAt === "number" &&
    Number.isFinite(record.startedAt) &&
    Array.isArray(record.sourceIds)
  );
}

export function parseDemoProgress(raw: string | null): DemoProgressSnapshot | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isSnapshot(parsed)) return null;
    return {
      query: parsed.query.slice(0, 200),
      sourceIds: [...new Set(parsed.sourceIds.filter((id): id is string => typeof id === "string" && KNOWN_SOURCE_IDS.has(id)))],
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function readDemoProgress(storage: Pick<Storage, "getItem"> | null): DemoProgressSnapshot | null {
  if (!storage) return null;
  return parseDemoProgress(storage.getItem(DEMO_PROGRESS_STORAGE_KEY));
}

export function writeDemoProgress(storage: Pick<Storage, "setItem"> | null, snapshot: DemoProgressSnapshot): void {
  if (!storage) return;
  storage.setItem(DEMO_PROGRESS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function demoProgressPhase(snapshot: DemoProgressSnapshot, now: number): { step: number; done: boolean } {
  const elapsed = Math.max(0, now - snapshot.startedAt);
  const step = Math.min(DEMO_STEP_COUNT, Math.floor(elapsed / DEMO_STEP_MS));
  return { step, done: step >= DEMO_STEP_COUNT };
}
