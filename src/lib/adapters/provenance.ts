import { PROVENANCE_BADGES, type BundleDataMode, type DataMode } from "@/lib/openframe/openframe";

/** Source badge from data_mode only. Labels come from PROVENANCE_BADGES. */
export function sourceBadge(dataMode: DataMode | BundleDataMode): { label: string; dataMode: DataMode | BundleDataMode } {
  if (dataMode === "MIXED") {
    return { label: "Mixed sources", dataMode };
  }
  return { label: PROVENANCE_BADGES.data_mode[dataMode], dataMode };
}

/** Badge text comes from analysis_generation, never from notice prose. */
export function analysisBadge(generation: "PRECOMPUTED" | "LIVE_AI", generatedAt: string | null): {
  label: string;
  generatedAt: string | null;
} {
  return { label: PROVENANCE_BADGES.analysis_generation[generation], generatedAt };
}

/**
 * Older name. PRECOMPUTED still renders. LIVE_AI now renders as Live AI Analysis.
 * A live badge does not mean the sources were retrieved.
 */
export function precomputedBadge(generation: "PRECOMPUTED" | "LIVE_AI", generatedAt: string | null): {
  label: string;
  generatedAt: string | null;
} | null {
  return analysisBadge(generation, generatedAt);
}
