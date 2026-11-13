import {
  pinnedModelSelection,
  readApiBase,
  redactSecrets,
  type ModelPinInput,
} from "@/lib/analysis/cursor-config";

/**
 * Cursor Cloud Agents API transport.
 * Protocol (public docs + the verified no-repo reference):
 * POST /v1/agents
 * GET  /v1/agents/{id}/runs/{runId}
 * POST /v1/agents/{id}/runs          follow-up, same agent
 * POST /v1/agents/{id}/runs/{runId}/cancel
 * Auth: HTTP Basic, API key as the username and an empty password.
 * Repos and env are omitted so the agent is a no-repo agent.
 * The model object is always included.
 */

export interface TransportRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface TransportResponse {
  status: number;
  data: unknown;
}

export interface CursorTransport {
  request(input: TransportRequest): Promise<TransportResponse>;
}

export class CursorClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly upstreamStatus?: number;

  constructor(code: string, status: number, upstreamStatus?: number) {
    super(code);
    this.name = "CursorClientError";
    this.code = code;
    this.status = status;
    this.upstreamStatus = upstreamStatus;
  }
}

export interface CreatedRun {
  agentId: string;
  runId: string;
  status: string;
}

export interface RunSnapshot {
  status: string;
  result: string | null;
  durationMs: number | null;
}

export interface CursorClient {
  createNoRepoAgent(input: { name: string; promptText: string }): Promise<CreatedRun>;
  getRun(input: { agentId: string; runId: string }): Promise<RunSnapshot>;
  followUp(input: { agentId: string; promptText: string }): Promise<CreatedRun>;
  cancelRun(input: { agentId: string; runId: string }): Promise<void>;
}

export interface CursorClientOptions {
  getApiKey: () => string | null;
  transport: CursorTransport;
  apiBase?: string;
  /** Read at create time so a later environment change cannot leave a stale pin. */
  getModelPin?: () => ModelPinInput;
  modelPin?: ModelPinInput;
}

export function createCursorClient(options: CursorClientOptions): CursorClient {
  const apiBase = (options.apiBase ?? DEFAULT_FROM_ENV()).replace(/\/$/, "");

  function requireKey(): string {
    const key = options.getApiKey();
    if (!key) throw new CursorClientError("config_not_ready", 503);
    return key;
  }

  return {
    async createNoRepoAgent({ name, promptText }) {
      const key = requireKey();
      const model = pinnedModelSelection(options.getModelPin ? options.getModelPin() : options.modelPin);
      const body = {
        name: String(name || "openframe-analysis").slice(0, 100),
        prompt: { text: promptText },
        model,
      };
      const res = await options.transport.request({
        method: "POST",
        url: `${apiBase}/v1/agents`,
        headers: authHeaders(key),
        body,
      });
      if (res.status >= 400) throw upstreamError(res.status);
      const agentId = readId(res.data, ["agent", "id"]) ?? readId(res.data, ["id"]);
      const runId = readId(res.data, ["run", "id"]) ?? readId(res.data, ["runId"]);
      if (!agentId || !runId) throw new CursorClientError("agent_create_malformed", 502, res.status);
      const status = readString(res.data, ["run", "status"]) ?? readString(res.data, ["status"]) ?? "RUNNING";
      return { agentId, runId, status };
    },

    async getRun({ agentId, runId }) {
      const key = requireKey();
      const res = await options.transport.request({
        method: "GET",
        url: `${apiBase}/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
        headers: authHeaders(key),
      });
      if (res.status >= 400) throw upstreamError(res.status);
      const status = readString(res.data, ["status"]);
      if (!status) throw new CursorClientError("run_fetch_malformed", 502, res.status);
      const result = readString(res.data, ["result"]);
      const duration = readNumber(res.data, ["durationMs"]);
      return { status, result, durationMs: duration };
    },

    async followUp({ agentId, promptText }) {
      const key = requireKey();
      const res = await options.transport.request({
        method: "POST",
        url: `${apiBase}/v1/agents/${encodeURIComponent(agentId)}/runs`,
        headers: authHeaders(key),
        body: { prompt: { text: promptText } },
      });
      if (res.status >= 400) throw upstreamError(res.status);
      const runId = readId(res.data, ["run", "id"]) ?? readId(res.data, ["runId"]);
      if (!runId) throw new CursorClientError("followup_malformed", 502, res.status);
      const status = readString(res.data, ["run", "status"]) ?? "CREATING";
      return { agentId, runId, status };
    },

    async cancelRun({ agentId, runId }) {
      const key = requireKey();
      const res = await options.transport.request({
        method: "POST",
        url: `${apiBase}/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}/cancel`,
        headers: authHeaders(key),
      });
      if (res.status === 409) throw new CursorClientError("run_not_cancellable", 409, 409);
      if (res.status >= 400) throw upstreamError(res.status);
    },
  };
}

function DEFAULT_FROM_ENV(): string {
  return readApiBase(process.env);
}

export function authHeaders(key: string): Record<string, string> {
  const token = Buffer.from(`${key}:`, "utf8").toString("base64");
  return {
    Authorization: `Basic ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export function createDefaultTransport(options: {
  allowNetwork: () => boolean;
  fetchImpl?: typeof fetch;
}): CursorTransport {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    async request({ method, url, headers, body }) {
      if (!options.allowNetwork()) {
        throw new CursorClientError("network_disabled", 503);
      }
      let res: Response;
      try {
        res = await fetchImpl(url, {
          method,
          headers,
          body: body == null ? undefined : JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        if (name === "TimeoutError" || name === "AbortError") {
          throw new CursorClientError("upstream_timeout", 504);
        }
        throw new CursorClientError("upstream_unavailable", 502);
      }
      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text.slice(0, 180) };
        }
      }
      return { status: res.status, data };
    },
  };
}

export function createMockTransport(
  handler: (request: TransportRequest) => Promise<TransportResponse> | TransportResponse,
): CursorTransport {
  return {
    async request(request) {
      return handler(request);
    },
  };
}

function upstreamError(status: number): CursorClientError {
  let code = "upstream_rejected";
  let http = 502;
  if (status === 401 || status === 403) {
    code = "auth_failed";
    http = 502;
  } else if (status === 429) {
    code = "rate_limited";
    http = 429;
  } else if (status === 408 || status === 504) {
    code = "upstream_timeout";
    http = 504;
  } else if (status >= 500) {
    code = "upstream_unavailable";
    http = 502;
  }
  return new CursorClientError(code, http, status);
}

function readId(data: unknown, path: string[]): string | null {
  const value = readString(data, path);
  if (!value) return null;
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(value)) return null;
  return value;
}

function readString(data: unknown, path: string[]): string | null {
  let current: unknown = data;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" && current.trim() ? current : null;
}

function readNumber(data: unknown, path: string[]): number | null {
  let current: unknown = data;
  for (const key of path) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" && Number.isFinite(current) ? current : null;
}

export function safeErrorText(error: unknown, secrets: Array<string | null | undefined>): string {
  const raw = error instanceof Error ? error.message : "unknown_error";
  return redactSecrets(raw, secrets).slice(0, 200);
}
