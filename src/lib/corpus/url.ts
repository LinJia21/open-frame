import { isReservedDemoUrl } from "@/lib/openframe/openframe";
import { CorpusError } from "@/lib/corpus/types";

/**
 * Check a stored https URL. This function never looks up DNS and never fetches.
 * A private, local, or reserved-demo host is rejected so the library cannot
 * hold a placeholder or an address that would be dangerous to open later.
 */
export function assertPublicArticleUrl(raw: string, index: number | null = null): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CorpusError("invalid_url", index);
  }
  if (url.protocol !== "https:") throw new CorpusError("unsafe_url", index);
  if (url.username || url.password) throw new CorpusError("unsafe_url", index);
  if (url.port) throw new CorpusError("unsafe_url", index);
  if (raw.includes("\\") || raw.includes("@")) throw new CorpusError("unsafe_url", index);
  const host = url.hostname.toLowerCase();
  if (isBlockedHost(host)) throw new CorpusError("unsafe_url", index);
  if (isReservedDemoUrl(url.toString())) throw new CorpusError("reserved_demo_host", index);
  return canonicalUrl(url);
}

export function canonicalUrl(url: URL): string {
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function isBlockedHost(host: string): boolean {
  const name = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name.endsWith(".local") ||
    name.endsWith(".internal") ||
    name === "metadata.google.internal"
  ) {
    return true;
  }
  if (name.includes(":")) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (!ipv4) return false;
  const parts = [Number(ipv4[1]), Number(ipv4[2]), Number(ipv4[3]), Number(ipv4[4])];
  if (parts.some((part) => part > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}
