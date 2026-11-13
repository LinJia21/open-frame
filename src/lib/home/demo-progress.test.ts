import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEMO_PROGRESS_STORAGE_KEY,
  DEMO_STEP_COUNT,
  DEMO_STEP_MS,
  demoProgressPhase,
  parseDemoProgress,
  readDemoProgress,
  writeDemoProgress,
} from "@/lib/home/demo-progress";

function storage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

test("demo progress survives a round trip and drops unknown sources", () => {
  const store = storage();
  writeDemoProgress(store, { query: "rates", sourceIds: ["bbc", "not-a-source"], startedAt: 1_000 });
  const snapshot = readDemoProgress(store);
  assert.deepEqual(snapshot, { query: "rates", sourceIds: ["bbc"], startedAt: 1_000 });
});

test("invalid stored progress is ignored", () => {
  assert.equal(parseDemoProgress(null), null);
  assert.equal(parseDemoProgress("not json"), null);
  assert.equal(parseDemoProgress("{}"), null);
  assert.equal(parseDemoProgress(JSON.stringify({ query: "", sourceIds: [], startedAt: 1 })), null);
  assert.equal(readDemoProgress(null), null);
});

test("phase advances one step per interval and finishes after four", () => {
  const snapshot = { query: "rates", sourceIds: ["bbc"], startedAt: 10_000 };
  assert.deepEqual(demoProgressPhase(snapshot, 10_000), { step: 0, done: false });
  assert.deepEqual(demoProgressPhase(snapshot, 10_000 + DEMO_STEP_MS), { step: 1, done: false });
  assert.deepEqual(demoProgressPhase(snapshot, 10_000 + DEMO_STEP_MS * 3.5), { step: 3, done: false });
  assert.deepEqual(demoProgressPhase(snapshot, 10_000 + DEMO_STEP_MS * DEMO_STEP_COUNT), { step: 4, done: true });
});

test("the storage key stays stable for existing browsers", () => {
  assert.equal(DEMO_PROGRESS_STORAGE_KEY, "openframe_demo_progress");
});
