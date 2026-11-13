import { PINNED_EFFORT, PINNED_MODEL_ID } from "@/lib/analysis/cursor-config";

export interface PublicProviderStatus {
  provider: "demo" | "cursor" | "retired" | "invalid";
  /** True only when ANALYSIS_PROVIDER=cursor and a non-empty CURSOR_API_KEY is present. The key itself is never included. */
  keyPresent: boolean;
  /** True only when CURSOR_ANALYSIS_ALLOW_NETWORK=1. This is still not proof of a live call. */
  networkEnabled: boolean;
  model: { id: typeof PINNED_MODEL_ID; effort: typeof PINNED_EFFORT; fast: false; effortParam: "effort" } | null;
  liveCallVerified: false;
  note: string;
}

export function describeProvider(input: {
  provider: PublicProviderStatus["provider"];
  keyPresent: boolean;
  networkEnabled: boolean;
}): PublicProviderStatus {
  if (input.provider === "demo") {
    return {
      provider: "demo",
      keyPresent: false,
      networkEnabled: false,
      model: null,
      liveCallVerified: false,
      note: "Demonstration provider. Prepared fixtures only. No model is called.",
    };
  }
  if (input.provider === "retired") {
    return {
      provider: "retired",
      keyPresent: false,
      networkEnabled: false,
      model: null,
      liveCallVerified: false,
      note: "ANALYSIS_PROVIDER=grok is retired. It does not call xAI. Use demo or cursor.",
    };
  }
  if (input.provider === "invalid") {
    return {
      provider: "invalid",
      keyPresent: false,
      networkEnabled: false,
      model: null,
      liveCallVerified: false,
      note: "ANALYSIS_PROVIDER is not demo or cursor.",
    };
  }
  const keyPresent = input.keyPresent;
  const networkEnabled = input.networkEnabled;
  let note = "Cursor provider is selected, but CURSOR_API_KEY is not configured. New analyses fail closed. Demonstration fixtures remain readable. This is not a live connection.";
  if (keyPresent && !networkEnabled) {
    note = "A server key is present, but outbound Cursor calls are disabled until CURSOR_ANALYSIS_ALLOW_NETWORK=1. Nothing is sent. This is not a live connection.";
  } else if (keyPresent && networkEnabled) {
    note = "Cursor is configured for grok-4.5, effort medium, fast false. It analyzes only saved materials you select. It does not search the live web. A key being present is not a completed live call.";
  }
  return {
    provider: "cursor",
    keyPresent,
    networkEnabled,
    model: { id: PINNED_MODEL_ID, effort: PINNED_EFFORT, fast: false, effortParam: "effort" },
    liveCallVerified: false,
    note,
  };
}
