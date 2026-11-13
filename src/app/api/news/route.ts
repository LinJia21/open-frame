import { connection } from "next/server";
import { allowRequest } from "@/lib/analysis/rate-limit";
import { createNewsDiscovery } from "@/lib/sources/discovery";
import { handleNewsGet } from "@/lib/sources/news-http";

const discovery = createNewsDiscovery();

export async function GET(request: Request) {
  await connection();
  return handleNewsGet(request, { discovery, allowRequest });
}
