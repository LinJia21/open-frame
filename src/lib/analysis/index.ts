import "server-only";
import type { AnalysisBundle } from "@/lib/openframe/openframe";
import type { CreateAnalysisInput } from "@/lib/analysis/validate";
import { buildDemoBundle } from "@/lib/demo/catalog";
import { rejectRetiredGrokProvider } from "@/lib/analysis/grok-provider";

export type ProviderKind = "demo" | "cursor" | "retired" | "invalid";

export interface AnalysisProvider {
  readonly name: "demo";
  createAnalysis(input: CreateAnalysisInput): Promise<AnalysisBundle>;
}

class DemoAnalysisProvider implements AnalysisProvider {
  readonly name = "demo" as const;

  async createAnalysis(input: CreateAnalysisInput): Promise<AnalysisBundle> {
    return buildDemoBundle(input.query, input.language);
  }
}

/** Empty or `demo` is the demonstration provider. `cursor` is async. `grok` is retired. */
export function resolveProviderKind(raw = process.env.ANALYSIS_PROVIDER): ProviderKind {
  const choice = (raw ?? "demo").trim().toLowerCase();
  if (choice === "" || choice === "demo") return "demo";
  if (choice === "cursor") return "cursor";
  if (choice === "grok") return "retired";
  return "invalid";
}

/** Synchronous demonstration provider. Cursor runs are started by the analyses route, not here. */
export function getAnalysisProvider(): AnalysisProvider {
  const kind = resolveProviderKind();
  if (kind === "demo") return new DemoAnalysisProvider();
  if (kind === "retired") rejectRetiredGrokProvider();
  throw new Error(kind === "cursor" ? "cursor_provider_is_async" : "invalid_provider");
}
