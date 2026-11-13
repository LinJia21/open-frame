import type { Language } from "@/lib/i18n/languages";
import { validateTopicInput } from "@/lib/analysis/validate";

export type AnalysisPostResult =
  | { ok: true; href: string }
  | { ok: false; reason: "invalid"; code: string }
  | { ok: false; reason: "http"; token?: string }
  | { ok: false; reason: "network" };

export async function postAnalysis(input: {
  query: string;
  language: Language;
  intent: "demo" | "saved";
  sourceIds?: string[];
}): Promise<AnalysisPostResult> {
  const checked = validateTopicInput(input.query, input.language);
  if (!checked.ok) return { ok: false, reason: "invalid", code: checked.code };
  try {
    const response = await fetch("/api/analyses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...checked.value,
        intent: input.intent,
        sourceIds: input.intent === "saved" ? input.sourceIds : undefined,
      }),
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      data?: { bundle_id?: string; job?: { id?: string } };
      errors?: Array<{ message?: string }>;
    };
    const jobId = payload.data?.job?.id;
    if (response.status === 202 && payload.ok && jobId) {
      return { ok: true, href: `/analysis/runs/${jobId}` };
    }
    if (!response.ok || !payload.ok || !payload.data?.bundle_id) {
      return { ok: false, reason: "http", token: payload.errors?.[0]?.message };
    }
    return { ok: true, href: `/analysis/${payload.data.bundle_id}/perspectives` };
  } catch {
    return { ok: false, reason: "network" };
  }
}
