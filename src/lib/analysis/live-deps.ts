import "server-only";
import path from "node:path";
import { buildDemoBundle } from "@/lib/demo/catalog";
import { saveBundle } from "@/lib/store/bundle-store";
import { allowRequest } from "@/lib/analysis/rate-limit";
import { resolveProviderKind } from "@/lib/analysis/index";
import { createCursorClient, createDefaultTransport } from "@/lib/analysis/cursor-client";
import { createCursorAnalysisService, type CursorAnalysisService } from "@/lib/analysis/cursor-service";
import {
  pinnedModelSelection,
  readAllowNetwork,
  readApiBase,
  readCursorApiKey,
  readModelPinFromEnv,
  readPollIntervalMs,
  readTimeoutMs,
} from "@/lib/analysis/cursor-config";
import { describeProvider, type PublicProviderStatus } from "@/lib/analysis/provider-status";
import type { AnalysisHttpDeps } from "@/lib/analysis/analyses-http";
import { liveCorpusStore } from "@/lib/corpus/live";

let singleton: CursorAnalysisService | null = null;

function cursorService(): CursorAnalysisService {
  if (!singleton) {
    const env = process.env;
    singleton = createCursorAnalysisService({
      getApiKey: () => readCursorApiKey(env),
      allowNetwork: () => readAllowNetwork(env),
      assertReady: () => {
        pinnedModelSelection(readModelPinFromEnv(env));
      },
      client: createCursorClient({
        getApiKey: () => readCursorApiKey(env),
        apiBase: readApiBase(env),
        getModelPin: () => readModelPinFromEnv(env),
        transport: createDefaultTransport({ allowNetwork: () => readAllowNetwork(env) }),
      }),
      storePath: path.join(process.cwd(), "data", "store", "cursor-jobs.json"),
      persistBundle: saveBundle,
      timeoutMs: readTimeoutMs(env),
      pollIntervalMs: readPollIntervalMs(env),
      resolveSources: (ids) => liveCorpusStore().resolve(ids),
    });
  }
  return singleton;
}

export function liveDeps(): AnalysisHttpDeps {
  const provider = resolveProviderKind(process.env.ANALYSIS_PROVIDER);
  return {
    provider,
    invalidProvider: provider === "invalid" ? process.env.ANALYSIS_PROVIDER : undefined,
    createDemo: async (input) => buildDemoBundle(input.query, input.language),
    saveBundle,
    cursor: provider === "cursor" ? cursorService() : null,
    allowRequest,
  };
}

/** Reads the key only when the selected provider is cursor, and only to report presence. */
export function getPublicProviderStatus(): PublicProviderStatus {
  const provider = resolveProviderKind(process.env.ANALYSIS_PROVIDER);
  const keyPresent = provider === "cursor" ? Boolean(readCursorApiKey(process.env)) : false;
  const networkEnabled = provider === "cursor" ? readAllowNetwork(process.env) : false;
  return describeProvider({ provider, keyPresent, networkEnabled });
}
