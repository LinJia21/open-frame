import { connection } from "next/server";
import { handleCancelJob } from "@/lib/analysis/analyses-http";
import { liveDeps } from "@/lib/analysis/live-deps";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  return handleCancelJob(id, liveDeps());
}
