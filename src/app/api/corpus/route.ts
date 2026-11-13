import { connection } from "next/server";
import { handleCorpusGet, handleCorpusImport } from "@/lib/corpus/corpus-http";
import { liveCorpusDeps } from "@/lib/corpus/live";

export async function GET(request: Request) {
  await connection();
  return handleCorpusGet(request, liveCorpusDeps());
}

export async function POST(request: Request) {
  await connection();
  return handleCorpusImport(request, liveCorpusDeps());
}
