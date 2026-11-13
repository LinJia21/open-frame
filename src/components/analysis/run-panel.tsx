"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Language } from "@/lib/i18n/languages";
import { providerCopy, providerErrorText } from "@/lib/i18n/provider-copy";
import type { PublicAnalysisJob } from "@/lib/analysis/cursor-service";

export function RunPanel({ jobId, language }: { jobId: string; language: Language }) {
  const router = useRouter();
  const copy = providerCopy(language);
  const [job, setJob] = useState<PublicAnalysisJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [watch, setWatch] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function tick() {
      try {
        const response = await fetch(`/api/analyses/runs/${jobId}`, { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: { job?: PublicAnalysisJob };
          errors?: Array<{ message?: string }>;
        };
        if (stop) return;
        if (!response.ok || !payload.ok || !payload.data?.job) {
          setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.failed);
          return;
        }
        const next = payload.data.job;
        setJob(next);
        setError(null);
        if (next.status === "ready" && next.bundleId) {
          router.push(`/analysis/${next.bundleId}/perspectives`);
          return;
        }
        if (next.status === "queued" || next.status === "running") {
          timer = setTimeout(() => void tick(), 3000);
        }
      } catch {
        if (!stop) setError(copy.network);
      }
    }
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [copy.failed, copy.network, jobId, language, router, watch]);

  async function act(path: "retry" | "cancel") {
    setActing(true);
    setError(null);
    try {
      const response = await fetch(`/api/analyses/runs/${jobId}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(path === "retry" ? { confirmNewRun: true } : {}),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: { job?: PublicAnalysisJob };
        errors?: Array<{ message?: string }>;
      };
      if (!response.ok || !payload.ok || !payload.data?.job) {
        setError(providerErrorText(payload.errors?.[0]?.message, language) ?? copy.failed);
        return;
      }
      setJob(payload.data.job);
      if (payload.data.job.status === "ready" && payload.data.job.bundleId) {
        router.push(`/analysis/${payload.data.job.bundleId}/perspectives`);
      } else if (payload.data.job.status === "queued" || payload.data.job.status === "running") {
        setWatch((value) => value + 1);
      }
    } catch {
      setError(copy.network);
    } finally {
      setActing(false);
    }
  }

  const failure = job?.errorCode ? providerErrorText(job.errorCode, language) : null;
  const busy = job?.status === "queued" || job?.status === "running";

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <p className="text-xs tracking-[0.18em] text-of-accent uppercase">{copy.model}</p>
      <h1 className="font-serif text-4xl">Cursor</h1>
      <Alert>
        <AlertTitle>{busy ? copy.processing : job?.status === "ready" ? copy.open : copy.failed}</AlertTitle>
        <AlertDescription>
          {copy.notVerified} {job ? `${job.model.id} · effort ${job.model.effort} · fast ${String(job.model.fast)}` : ""}
        </AlertDescription>
      </Alert>
      {job ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-medium">{job.query}</p>
          <p className="mt-2 text-muted-foreground">
            {job.status}
            {job.pollNotice ? ` · ${job.pollNotice}` : ""} · creates {job.createCount} · follow-ups {job.followupCount}
          </p>
          <p className="mt-2 text-muted-foreground">
            Saved-history search, not a live internet search. Selected {job.sourceCount} item(s) from {job.selectedOutletCount} outlet(s). Library outlets: {job.libraryOutletCount}. Materials saved through {job.materialsCutoff ?? "no timestamp"}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{copy.processing}</p>
      )}
      {failure ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.failed}</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.failed}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        {job?.retryMayBill ? (
          <Button type="button" disabled={acting} onClick={() => void act("retry")}>
            {copy.retry}
          </Button>
        ) : null}
        {busy ? (
          <Button type="button" variant="outline" disabled={acting} onClick={() => void act("cancel")}>
            {copy.cancel}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => router.push("/")}>
          {copy.back}
        </Button>
      </div>
      {job?.retryMayBill ? <p className="text-sm text-muted-foreground">{copy.retryHint}</p> : null}
    </section>
  );
}
