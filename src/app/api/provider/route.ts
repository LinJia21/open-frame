import { connection } from "next/server";
import { getPublicProviderStatus } from "@/lib/analysis/live-deps";

export async function GET() {
  await connection();
  const status = getPublicProviderStatus();
  return Response.json({ ok: true, data: status, warnings: status.liveCallVerified ? [] : ["liveCallVerified is false"] });
}
