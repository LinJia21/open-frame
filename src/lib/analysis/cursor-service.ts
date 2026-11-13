import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Language } from "@/lib/i18n/languages";
import type { AnalysisBundle } from "@/lib/openframe/openframe";
import { CursorConfigError, PINNED_EFFORT, PINNED_MODEL_ID, redactSecrets } from "@/lib/analysis/cursor-config";
import { CursorClientError, type CursorClient } from "@/lib/analysis/cursor-client";
import { acceptSavedMaterialOutput, OutputRejected } from "@/lib/analysis/cursor-output";
import { buildCursorBundlePrompt, buildCursorRetryPrompt } from "@/lib/analysis/cursor-prompt";
import { MAX_RETRIES } from "@/lib/openframe/prompts";
import { CorpusError, type LibrarySnapshot, type ResolvedSelection, type SavedMaterial } from "@/lib/corpus/types";

const MAX_CREATES = 3;
const MAX_JOBS = 40;
const ACTIVE = new Set(["queued", "running"]);

export type JobStatus = "queued" | "running" | "ready" | "failed" | "expired" | "cancelled";

export interface PublicAnalysisJob {
  id: string;
  status: JobStatus;
  query: string;
  language: Language;
  provider: "cursor";
  model: { id: typeof PINNED_MODEL_ID; effort: typeof PINNED_EFFORT; fast: false };
  bundleId: string | null;
  errorCode: string | null;
  pollNotice: string | null;
  createCount: number;
  followupCount: number;
  retryMayBill: boolean;
  liveCallVerified: false;
  materialScope: "saved_history";
  liveInternetSearch: false;
  evidencePosture: "saved_materials_not_externally_verified";
  sourceCount: number;
  selectedOutletCount: number;
  libraryOutletCount: number;
  materialsCutoff: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisJob {
  id: string;
  idempotencyKey: string;
  fingerprint: string;
  query: string;
  language: Language;
  status: JobStatus;
  agentId: string | null;
  runId: string | null;
  createCount: number;
  followupCount: number;
  bundleId: string | null;
  errorCode: string | null;
  pollNotice: string | null;
  validationPaths: string;
  previousOutput: string | null;
  createdAt: string;
  updatedAt: string;
  deadlineAt: string;
  pollFailures: number;
  cancelAttempted: boolean;
  materials: SavedMaterial[];
  library: LibrarySnapshot;
}

interface StoreFile {
  version: 1;
  jobs: AnalysisJob[];
}

export class CursorServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = "CursorServiceError";
    this.code = code;
    this.status = status;
  }
}

export interface CursorAnalysisService {
  start(input: { query: string; language: Language; idempotencyKey: string | null; sourceIds: string[] }): Promise<PublicAnalysisJob>;
  poll(id: string): Promise<PublicAnalysisJob | null>;
  retry(id: string, confirmNewRun: boolean): Promise<PublicAnalysisJob>;
  cancel(id: string): Promise<PublicAnalysisJob>;
}

export interface CursorServiceOptions {
  client: CursorClient;
  storePath: string;
  persistBundle: (bundle: AnalysisBundle) => Promise<void>;
  getApiKey: () => string | null;
  allowNetwork: () => boolean;
  now?: () => number;
  timeoutMs?: number;
  pollIntervalMs?: number;
  maxRunning?: number;
  /** Throws model_pin_violation before a job or a request is created. */
  assertReady?: () => void;
  /** Loads the saved materials for this run. A different text hash must not reuse an older job. */
  resolveSources: (ids: string[]) => Promise<ResolvedSelection>;
}

export function createCursorAnalysisService(options: CursorServiceOptions): CursorAnalysisService {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 180_000;
  const pollIntervalMs = options.pollIntervalMs ?? 5_000;
  const maxRunning = options.maxRunning ?? 2;
  let chain: Promise<void> = Promise.resolve();
  const lastPoll = new Map<string, number>();

  function withLock<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task, task);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function secrets(): Array<string | null> {
    return [options.getApiKey()];
  }

  async function readStore(): Promise<StoreFile> {
    try {
      const raw = await fs.readFile(options.storePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { jobs?: unknown }).jobs)) {
        throw new CursorServiceError("store_failed", 500);
      }
      const jobs = (parsed as StoreFile).jobs.map((job) => ({
        ...job,
        materials: job.materials ?? [],
        library: job.library ?? { itemCount: 0, outletCount: 0, cutoff: null },
      }));
      return { version: 1, jobs };
    } catch (error) {
      if (isNotFound(error)) return { version: 1, jobs: [] };
      if (error instanceof CursorServiceError) throw error;
      throw new CursorServiceError("store_failed", 500);
    }
  }

  async function writeStore(store: StoreFile): Promise<void> {
    const jobs = store.jobs.slice(-MAX_JOBS);
    await fs.mkdir(path.dirname(options.storePath), { recursive: true });
    const temporary = `${options.storePath}.tmp`;
    const body = redactSecrets(JSON.stringify({ version: 1, jobs }), secrets());
    await fs.writeFile(temporary, body);
    await fs.rename(temporary, options.storePath);
  }

  function publicJob(job: AnalysisJob): PublicAnalysisJob {
    return {
      id: job.id,
      status: job.status,
      query: job.query,
      language: job.language,
      provider: "cursor",
      model: { id: PINNED_MODEL_ID, effort: PINNED_EFFORT, fast: false },
      bundleId: job.bundleId,
      errorCode: job.errorCode,
      pollNotice: job.pollNotice,
      createCount: job.createCount,
      followupCount: job.followupCount,
      retryMayBill: job.status === "failed" || job.status === "expired",
      liveCallVerified: false,
      materialScope: "saved_history",
      liveInternetSearch: false,
      evidencePosture: "saved_materials_not_externally_verified",
      sourceCount: job.materials.length,
      selectedOutletCount: new Set(job.materials.map((material) => material.outlet)).size,
      libraryOutletCount: job.library.outletCount,
      materialsCutoff: job.library.cutoff,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  function touch(job: AnalysisJob, patch: Partial<AnalysisJob>): void {
    Object.assign(job, patch, { updatedAt: new Date(now()).toISOString() });
  }

  async function createOnJob(store: StoreFile, job: AnalysisJob): Promise<void> {
    if (!options.getApiKey()) throw new CursorServiceError("config_not_ready", 503);
    if (!options.allowNetwork()) throw new CursorServiceError("network_disabled", 503);
    if (job.createCount >= MAX_CREATES) throw new CursorServiceError("retry_exhausted", 409);
    const running = store.jobs.filter((item) => ACTIVE.has(item.status) && item.id !== job.id).length;
    if (running >= maxRunning) throw new CursorServiceError("too_many_runs", 429);
    touch(job, { status: "queued", errorCode: null, pollNotice: null, createCount: job.createCount + 1 });
    await writeStore(store);
    try {
      const created = await options.client.createNoRepoAgent({
        name: "openframe-analysis",
        promptText: promptFor(job),
      });
      touch(job, { status: "running", agentId: created.agentId, runId: created.runId, deadlineAt: new Date(now() + timeoutMs).toISOString() });
    } catch (error) {
      const code = error instanceof CursorClientError || error instanceof CursorConfigError
        ? error.code
        : "upstream_unavailable";
      touch(job, { status: "failed", errorCode: code, pollNotice: null });
    }
    await writeStore(store);
  }

  async function followOnJob(job: AnalysisJob): Promise<void> {
    if (!job.agentId) throw new CursorServiceError("retry_exhausted", 409);
    if (job.followupCount >= MAX_RETRIES) throw new CursorServiceError("retry_exhausted", 409);
    if (!options.getApiKey()) throw new CursorServiceError("config_not_ready", 503);
    if (!options.allowNetwork()) throw new CursorServiceError("network_disabled", 503);
    const promptText = buildCursorRetryPrompt({
      validationPaths: job.validationPaths || "output rejected",
      previousOutput: job.previousOutput ?? "",
      secrets: secrets(),
      materials: job.materials,
      library: job.library,
      query: job.query,
      language: job.language,
    });
    try {
      const created = await options.client.followUp({ agentId: job.agentId, promptText });
      touch(job, {
        status: "running",
        runId: created.runId,
        followupCount: job.followupCount + 1,
        errorCode: null,
        pollNotice: null,
        pollFailures: 0,
        deadlineAt: new Date(now() + timeoutMs).toISOString(),
        cancelAttempted: false,
      });
    } catch (error) {
      const code = error instanceof CursorClientError ? error.code : "upstream_unavailable";
      touch(job, { status: "failed", errorCode: code });
    }
    const store = await readStore();
    const saved = store.jobs.find((item) => item.id === job.id);
    if (saved) Object.assign(saved, job);
    await writeStore(store);
  }

  async function finishFromResult(job: AnalysisJob, result: string | null): Promise<void> {
    if (!result) {
      touch(job, { status: "failed", errorCode: "incomplete_output", previousOutput: null });
      return;
    }
    try {
      const bundle = acceptSavedMaterialOutput({
        text: result,
        query: job.query,
        language: job.language,
        nowIso: new Date(now()).toISOString(),
        bundleId: `bnd_${randomUUID()}`,
        secrets: secrets(),
        materials: job.materials,
        library: job.library,
      });
      await options.persistBundle(bundle);
      touch(job, {
        status: "ready",
        bundleId: bundle.bundle_id,
        errorCode: null,
        pollNotice: null,
        previousOutput: null,
        validationPaths: "",
      });
    } catch (error) {
      const safePrevious = error instanceof OutputRejected && error.code === "sensitive_echo"
        ? null
        : redactSecrets(result, secrets()).slice(0, 6_000);
      if (error instanceof OutputRejected) {
        touch(job, {
          status: "failed",
          errorCode: error.code,
          validationPaths: error.paths.join(","),
          previousOutput: safePrevious,
        });
        return;
      }
      touch(job, { status: "failed", errorCode: "store_failed", previousOutput: safePrevious });
    }
  }

  async function applyRun(job: AnalysisJob): Promise<void> {
    if (!job.agentId || !job.runId) return;
    let snapshot;
    try {
      snapshot = await options.client.getRun({ agentId: job.agentId, runId: job.runId });
      job.pollFailures = 0;
    } catch (error) {
      const code = error instanceof CursorClientError ? error.code : "upstream_unavailable";
      if (code === "auth_failed" || code === "network_disabled" || code === "config_not_ready") {
        touch(job, { status: "failed", errorCode: code, pollNotice: null });
        return;
      }
      job.pollFailures += 1;
      if (job.pollFailures >= 5) {
        touch(job, { status: "failed", errorCode: code, pollNotice: null });
        return;
      }
      touch(job, { pollNotice: code });
      return;
    }
    if (snapshot.status === "CREATING" || snapshot.status === "RUNNING" || snapshot.status === "WAITING_FOR_BACKGROUND_WORK") {
      touch(job, { status: "running", pollNotice: null });
      return;
    }
    if (snapshot.status === "FINISHED") {
      await finishFromResult(job, snapshot.result);
      return;
    }
    if (snapshot.status === "CANCELLED") {
      touch(job, { status: "cancelled", errorCode: "cancelled", pollNotice: null });
      return;
    }
    if (snapshot.status === "EXPIRED") {
      touch(job, { status: "expired", errorCode: "expired", pollNotice: null });
      return;
    }
    if (snapshot.status === "ERROR") {
      touch(job, { status: "failed", errorCode: "upstream_run", pollNotice: null });
      return;
    }
    touch(job, { pollNotice: "unknown_status" });
  }

  async function expireIfNeeded(job: AnalysisJob): Promise<boolean> {
    if (!ACTIVE.has(job.status)) return false;
    if (now() < Date.parse(job.deadlineAt)) return false;
    if (job.agentId && job.runId && !job.cancelAttempted) {
      job.cancelAttempted = true;
      try {
        await options.client.cancelRun({ agentId: job.agentId, runId: job.runId });
      } catch (error) {
        if (error instanceof CursorClientError && error.code === "run_not_cancellable") {
          await applyRun(job);
          if (!ACTIVE.has(job.status)) return true;
        }
      }
    }
    if (ACTIVE.has(job.status)) {
      touch(job, { status: "expired", errorCode: "expired", pollNotice: null });
    }
    return true;
  }

  return {
    async start({ query, language, idempotencyKey, sourceIds }) {
      return withLock(async () => {
        const store = await readStore();
        let resolved: ResolvedSelection;
        try {
          resolved = await options.resolveSources(sourceIds);
        } catch (error) {
          if (error instanceof CorpusError) throw new CursorServiceError(error.code, error.code === "store_failed" ? 500 : 422);
          throw error;
        }
        const fingerprint = fingerprintFor(language, query, resolved.items);
        if (idempotencyKey) {
          const byKey = store.jobs.find((job) => job.idempotencyKey === idempotencyKey);
          if (byKey && byKey.fingerprint !== fingerprint) throw new CursorServiceError("idempotency_conflict", 409);
          if (byKey) return publicJob(byKey);
        }
        const reusable = [...store.jobs].reverse().find((job) => job.fingerprint === fingerprint && job.status !== "cancelled" && job.status !== "expired");
        if (reusable) return publicJob(reusable);
        if (!options.getApiKey()) throw new CursorServiceError("config_not_ready", 503);
        if (!options.allowNetwork()) throw new CursorServiceError("network_disabled", 503);
        options.assertReady?.();
        const running = store.jobs.filter((job) => ACTIVE.has(job.status)).length;
        if (running >= maxRunning) throw new CursorServiceError("too_many_runs", 429);
        const stamp = new Date(now()).toISOString();
        const job: AnalysisJob = {
          id: `job_${randomUUID()}`,
          idempotencyKey: idempotencyKey ?? fingerprint,
          fingerprint,
          query,
          language,
          status: "queued",
          agentId: null,
          runId: null,
          createCount: 0,
          followupCount: 0,
          bundleId: null,
          errorCode: null,
          pollNotice: null,
          validationPaths: "",
          previousOutput: null,
          createdAt: stamp,
          updatedAt: stamp,
          deadlineAt: new Date(now() + timeoutMs).toISOString(),
          pollFailures: 0,
          cancelAttempted: false,
          materials: resolved.items,
          library: resolved.library,
        };
        store.jobs.push(job);
        await createOnJob(store, job);
        return publicJob(job);
      });
    },

    async poll(id) {
      return withLock(async () => {
        const store = await readStore();
        const job = store.jobs.find((item) => item.id === id);
        if (!job) return null;
        if (!ACTIVE.has(job.status)) return publicJob(job);
        const expired = await expireIfNeeded(job);
        if (expired) {
          await writeStore(store);
          return publicJob(job);
        }
        const previous = lastPoll.get(job.id) ?? 0;
        if (now() - previous < pollIntervalMs) return publicJob(job);
        lastPoll.set(job.id, now());
        await applyRun(job);
        await writeStore(store);
        return publicJob(job);
      });
    },

    async retry(id, confirmNewRun) {
      return withLock(async () => {
        const store = await readStore();
        const job = store.jobs.find((item) => item.id === id);
        if (!job) throw new CursorServiceError("not_found", 404);
        if (job.status === "queued" || job.status === "running" || job.status === "ready") return publicJob(job);
        if (job.status === "cancelled") throw new CursorServiceError("cancelled", 409);
        if (!confirmNewRun) throw new CursorServiceError("confirmation_required", 409);
        if (job.errorCode === "store_failed" && job.previousOutput) {
          await finishFromResult(job, job.previousOutput);
          await writeStore(store);
          return publicJob(job);
        }
        if (job.agentId) await followOnJob(job);
        else await createOnJob(store, job);
        return publicJob(job);
      });
    },

    async cancel(id) {
      return withLock(async () => {
        const store = await readStore();
        const job = store.jobs.find((item) => item.id === id);
        if (!job) throw new CursorServiceError("not_found", 404);
        if (!ACTIVE.has(job.status)) return publicJob(job);
        if (job.agentId && job.runId) {
          try {
            await options.client.cancelRun({ agentId: job.agentId, runId: job.runId });
          } catch (error) {
            if (!(error instanceof CursorClientError && error.code === "run_not_cancellable")) {
              touch(job, { pollNotice: error instanceof CursorClientError ? error.code : "upstream_unavailable" });
              await writeStore(store);
              return publicJob(job);
            }
          }
        }
        touch(job, { status: "cancelled", errorCode: "cancelled", pollNotice: null, cancelAttempted: true });
        await writeStore(store);
        return publicJob(job);
      });
    },
  };
}

function fingerprintFor(language: string, query: string, materials: SavedMaterial[]): string {
  const canon = materials.map((material) => `${material.id}:${material.contentHash}`).sort().join("\n");
  return createHash("sha256").update(`${language}\n${query}\n${canon}`).digest("hex");
}

function promptFor(job: AnalysisJob): string {
  return buildCursorBundlePrompt({
    query: job.query,
    language: job.language,
    materials: job.materials,
    library: job.library,
  });
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
