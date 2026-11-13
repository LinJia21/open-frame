import { connection } from "next/server";
import { handlePollJob } from "@/lib/analysis/analyses-http";
import { liveDeps } from "@/lib/analysis/live-deps";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  return handlePollJob(id, liveDeps());
}
