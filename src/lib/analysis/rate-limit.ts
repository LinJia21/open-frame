const WINDOW_MS = 60_000;
const LIMIT = 10;
const hits = new Map<string, number[]>();

/** In-memory limit: 10 requests per key per minute. */
export function allowRequest(key: string, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export const MAX_REQUEST_BYTES = 8_192;
