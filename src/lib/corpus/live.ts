import "server-only";
import path from "node:path";
import { allowRequest } from "@/lib/analysis/rate-limit";
import { readCursorApiKey } from "@/lib/analysis/cursor-config";
import { createCorpusStore, type CorpusStore } from "@/lib/corpus/store";
import type { CorpusHttpDeps } from "@/lib/corpus/corpus-http";

let singleton: CorpusStore | null = null;

export function liveCorpusStore(): CorpusStore {
  if (!singleton) {
    singleton = createCorpusStore(path.join(process.cwd(), "data", "corpus", "items.json"));
  }
  return singleton;
}

export function liveCorpusDeps(): CorpusHttpDeps {
  return {
    store: liveCorpusStore(),
    allowRequest,
    secrets: () => [readCursorApiKey(process.env)],
  };
}
