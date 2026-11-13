import { NextResponse, type NextRequest } from "next/server";
import { FIXTURE_IDS } from "@/lib/analysis/fixture-ids";
import { decodeAnalysisIdParam } from "@/lib/analysis/request-id";
import { SUPPORTED_SCHEMA_VERSIONS, unsupportedSchemaHttpStatus } from "@/lib/adapters/schema-version";
import { storedSchemaVersion } from "@/lib/store/schema-lookup";

/**
 * Unknown analysis ids must answer 404 before the page shell is streamed.
 * With Cache Components, notFound() inside the page arrives after a 200 shell.
 */
function invalidApiId(status: 400 | 404, code: "INVALID_FORMAT" | "UNKNOWN_REFERENCE") {
  return NextResponse.json(
    {
      ok: false,
      errors: [{ code, message: "This briefing id is not valid.", field: "bundle_id", recoverable: false }],
    },
    { status, headers: { "x-robots-tag": "noindex" } },
  );
}

export function proxy(request: NextRequest) {
  const apiMatch = request.nextUrl.pathname.match(/^\/api\/analyses\/([^/]+)$/);
  if (apiMatch) {
    const decoded = decodeAnalysisIdParam(apiMatch[1]);
    if (!decoded.ok) return invalidApiId(decoded.status, decoded.code);
    return NextResponse.next();
  }
  const match = request.nextUrl.pathname.match(/^\/analysis\/([^/]+)/);
  if (!match) return NextResponse.next();
  const decoded = decodeAnalysisIdParam(match[1]);
  if (!decoded.ok) {
    return new NextResponse(missingAnalysisHtml(), {
      status: decoded.status === 400 ? 404 : decoded.status,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
    });
  }
  const id = decoded.id;
  if (FIXTURE_IDS.includes(id as (typeof FIXTURE_IDS)[number])) return NextResponse.next();
  const stored = storedSchemaVersion(id);
  if (stored === undefined) {
    return new NextResponse(missingAnalysisHtml(), {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
    });
  }
  if (unsupportedSchemaHttpStatus(stored) === 422) {
    return new NextResponse(unsupportedSchemaHtml(stored ?? "missing"), {
      status: 422,
      headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
    });
  }
  return NextResponse.next();
}

function missingAnalysisHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Briefing not found · OpenFrame AI</title>
  <style>
    body { margin: 0; font-family: "Source Sans 3", "Segoe UI", sans-serif; background: #f6f1e7; color: #1c1915; }
    main { max-width: 36rem; margin: 4rem auto; padding: 0 1.25rem; }
    h1 { font-family: Georgia, serif; font-size: 2rem; font-weight: 500; }
    a { color: #8d4324; }
  </style>
</head>
<body>
  <main>
    <h1>This briefing is not in the local store</h1>
    <p>The link may be mistyped, or the demo file was cleared. Start a new analysis from the home page.</p>
    <p><a href="/">Back to home</a></p>
  </main>
</body>
</html>`;
}

function unsupportedSchemaHtml(found: string): string {
  const supported = SUPPORTED_SCHEMA_VERSIONS.join(", ");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>Unsupported schema · OpenFrame AI</title>
  <style>
    body { margin: 0; font-family: "Source Sans 3", "Segoe UI", sans-serif; background: #f6f1e7; color: #1c1915; }
    main { max-width: 36rem; margin: 4rem auto; padding: 0 1.25rem; }
    h1 { font-family: Georgia, serif; font-size: 2rem; font-weight: 500; }
    a { color: #8d4324; }
  </style>
</head>
<body>
  <main>
    <h1>This briefing uses a schema version this app does not read</h1>
    <p>Found schema_version ${escapeHtml(found)}. Supported versions: ${escapeHtml(supported)}. A version without its own mapping is left unread. This page does not guess one.</p>
    <p><a href="/">Back to home</a></p>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}

export const config = {
  matcher: ["/analysis/:path*", "/api/analyses/:id"],
};
