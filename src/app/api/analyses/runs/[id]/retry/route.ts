import { connection } from "next/server";
import { handleRetryJob } from "@/lib/analysis/analyses-http";
import { liveDeps } from "@/lib/analysis/live-deps";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await context.params;
  return handleRetryJob(id, request, liveDeps());
}
