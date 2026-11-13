import { isReservedDemoUrl } from "@/lib/openframe/openframe";
import { CorpusError } from "@/lib/corpus/types";

/**
 * Check a stored https URL. This function never looks up DNS and never fetches.
 * A private, local, documentation, or reserved-demo host is rejected so the
 * library cannot hold a placeholder or an address that would be dangerous to
 * open later. A trailing dot names the same host and is removed before those
 * checks. An explicit port, including 443, is rejected.
 */
export function assertPublicArticleUrl(raw: string, index: number | null = null): string {
  const text = raw.trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new CorpusError("invalid_url", index);
  }
  if (url.protocol !== "https:") throw new CorpusError("unsafe_url", index);
  if (url.username || url.password || text.includes("\\") || text.includes("@")) throw new CorpusError("unsafe_url", index);
  if (url.port || hasExplicitPort(text)) throw new CorpusError("unsafe_url", index);
  const host = normalizedHost(url.hostname);
  if (!host) throw new CorpusError("unsafe_url", index);
  if (host !== url.hostname) url.hostname = host;
  if (isBlockedHost(host)) throw new CorpusError("unsafe_url", index);
  if (isReservedDemoUrl(url.toString())) throw new CorpusError("reserved_demo_host", index);
  return canonicalUrl(url);
}

export function canonicalUrl(url: URL): string {
  url.hash = "";
  const host = normalizedHost(url.hostname);
  if (host) url.hostname = host;
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function isBlockedHost(host: string): boolean {
  const name = normalizedHost(host.replace(/^\[|\]$/g, ""));
  if (!name) return true;
  if (
    name === "localhost" ||
    name.endsWith(".localhost") ||
    name.endsWith(".local") ||
    name.endsWith(".localdomain") ||
    name === "localdomain" ||
    name.endsWith(".internal") ||
    name.endsWith(".home.arpa") ||
    name === "metadata.google.internal"
  ) {
    return true;
  }
  if (name.includes(":")) return true;
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(name);
  if (!ipv4) return false;
  const parts = [Number(ipv4[1]), Number(ipv4[2]), Number(ipv4[3]), Number(ipv4[4])];
  if (parts.some((part) => part > 255)) return true;
  return isNonPublicIpv4(parts);
}

function normalizedHost(host: string): string {
  return host.toLowerCase().replace(/\.+$/, "");
}

function hasExplicitPort(raw: string): boolean {
  const match = /^https:\/\/([^/?#]*)/i.exec(raw);
  if (!match) return false;
  let authority = match[1] ?? "";
  const at = authority.lastIndexOf("@");
  if (at !== -1) authority = authority.slice(at + 1);
  if (authority.startsWith("[")) {
    const end = authority.indexOf("]");
    return end !== -1 && authority.slice(end + 1).startsWith(":");
  }
  return authority.includes(":");
}

function isNonPublicIpv4(parts: number[]): boolean {
  const [a, b, c] = parts;
  if (a === undefined || b === undefined || c === undefined) return true;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}
