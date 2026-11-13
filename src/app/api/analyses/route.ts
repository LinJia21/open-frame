import { connection } from "next/server";
import { publicFailure } from "@/lib/analysis/errors";
import { handleCreateAnalysis } from "@/lib/analysis/analyses-http";
import { liveDeps } from "@/lib/analysis/live-deps";
import { listBundles } from "@/lib/store/bundle-store";
import { toSummary } from "@/lib/adapters/to-view";

export async function GET() {
  await connection();
  try {
    const bundles = await listBundles();
    return Response.json({
      ok: true,
      data: bundles.map(toSummary),
      warnings: bundles.map((bundle) =>
        bundle.data_mode === "DEMO" ? `${bundle.bundle_id}: fictional sources` : `${bundle.bundle_id}: real sources`,
      ),
    });
  } catch (error) {
    return publicFailure(error, { message: "The demo store could not be read.", status: 500, code: "PARSE_FAILED", recoverable: true });
  }
}

export async function POST(request: Request) {
  await connection();
  return handleCreateAnalysis(request, liveDeps());
}
