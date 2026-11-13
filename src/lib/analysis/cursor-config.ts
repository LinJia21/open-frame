/**
 * Product pin for the Cursor Cloud Agents API.
 * grok-4.5 uses param id `effort` (not `reasoning_effort`, which belongs to grok-4.7).
 * The model object is always sent. Omitting it would select the account default.
 * This module does not read any token other than CURSOR_API_KEY.
 */

export const PINNED_MODEL_ID = "grok-4.5";
export const PINNED_EFFORT = "medium";
export const PINNED_EFFORT_PARAM = "effort";
export const PINNED_FAST = "false";
export const DEFAULT_API_BASE = "https://api.cursor.com";
export const DEFAULT_TIMEOUT_MS = 600_000;
export const DEFAULT_POLL_INTERVAL_MS = 5_000;

export interface ModelSelection {
  id: typeof PINNED_MODEL_ID;
  params: [
    { id: typeof PINNED_EFFORT_PARAM; value: typeof PINNED_EFFORT },
    { id: "fast"; value: typeof PINNED_FAST },
  ];
}

export interface ModelPinInput {
  modelId?: string | null;
  effort?: string | null;
  fast?: string | null;
}

export class CursorConfigError extends Error {
  readonly code: "model_pin_violation" | "config_not_ready" | "network_disabled";
  readonly status: number;

  constructor(code: CursorConfigError["code"], status: number) {
    super(code);
    this.name = "CursorConfigError";
    this.code = code;
    this.status = status;
  }
}

/** Reject any model, effort, or fast value other than the product pin. Never fall back. */
export function pinnedModelSelection(input: ModelPinInput = {}): ModelSelection {
  const id = (input.modelId ?? PINNED_MODEL_ID).trim();
  const effort = (input.effort ?? PINNED_EFFORT).trim();
  const fast = (input.fast ?? PINNED_FAST).trim();
  if (id !== PINNED_MODEL_ID || effort !== PINNED_EFFORT || fast !== PINNED_FAST) {
    throw new CursorConfigError("model_pin_violation", 500);
  }
  return {
    id: PINNED_MODEL_ID,
    params: [
      { id: PINNED_EFFORT_PARAM, value: PINNED_EFFORT },
      { id: "fast", value: PINNED_FAST },
    ],
  };
}

export function readCursorApiKey(env: Record<string, string | undefined>): string | null {
  const key = env.CURSOR_API_KEY;
  if (typeof key !== "string" || !key.trim()) return null;
  return key.trim();
}

export function readAllowNetwork(env: Record<string, string | undefined>): boolean {
  return env.CURSOR_ANALYSIS_ALLOW_NETWORK === "1";
}

export function readApiBase(env: Record<string, string | undefined>): string {
  const raw = env.CURSOR_API_BASE?.trim() || DEFAULT_API_BASE;
  return raw.replace(/\/$/, "");
}

export function readTimeoutMs(env: Record<string, string | undefined>): number {
  return readPositiveInt(env.CURSOR_ANALYSIS_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
}

export function readPollIntervalMs(env: Record<string, string | undefined>): number {
  return readPositiveInt(env.CURSOR_POLL_INTERVAL_MS, DEFAULT_POLL_INTERVAL_MS);
}

export function readModelPinFromEnv(env: Record<string, string | undefined>): ModelPinInput {
  return {
    modelId: env.CURSOR_AGENT_MODEL_ID,
    effort: env.CURSOR_AGENT_EFFORT,
    fast: env.CURSOR_AGENT_FAST,
  };
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return fallback;
  return value;
}

/** Replace known secrets and auth headers before anything is stored or returned. */
export function redactSecrets(value: string, secrets: Array<string | null | undefined>): string {
  let out = value;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) out = out.split(secret).join("[REDACTED]");
  }
  out = out.replace(/Basic\s+[A-Za-z0-9+/=]+/gi, "Basic [REDACTED]");
  out = out.replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]");
  return out;
}
