/**
 * Pre-demo check. Reads the same env the app reads, prints presence only (never the key),
 * and exits non-zero when Cursor mode cannot actually run.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import {
  CursorConfigError,
  pinnedModelSelection,
  readAllowNetwork,
  readCursorApiKey,
  readModelPinFromEnv,
} from "../src/lib/analysis/cursor-config";

loadEnvConfig(process.cwd());

type CorpusItem = { completeness?: string; outlet?: string };

function providerName(): string {
  const raw = (process.env.ANALYSIS_PROVIDER ?? "demo").trim().toLowerCase();
  return raw === "" ? "demo" : raw;
}

async function corpusSummary(): Promise<{ count: number; outlets: number; complete: number } | null> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "corpus", "items.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: unknown[] }).items)
        : [];
    const records = items.filter((item): item is CorpusItem => Boolean(item) && typeof item === "object");
    return {
      count: records.length,
      outlets: new Set(records.map((item) => item.outlet).filter(Boolean)).size,
      complete: records.filter((item) => item.completeness === "full_text").length,
    };
  } catch {
    return null;
  }
}

function modelPinError(): string | null {
  try {
    pinnedModelSelection(readModelPinFromEnv(process.env));
    return null;
  } catch (error) {
    if (error instanceof CursorConfigError) return error.code;
    return "model_pin_error";
  }
}

async function main(): Promise<number> {
  const provider = providerName();
  const keyPresent = Boolean(readCursorApiKey(process.env));
  const networkEnabled = readAllowNetwork(process.env);
  const pinError = modelPinError();
  const corpus = await corpusSummary();

  const lines = ["OpenFrame pre-demo check", ""];
  lines.push(`provider:        ${provider}`);
  lines.push(`api key:         ${keyPresent ? "present" : "absent"}`);
  lines.push(`network allowed: ${networkEnabled ? "yes" : "no"}`);
  lines.push(`model pin:       ${pinError ?? "grok-4.5 / medium / fast=false"}`);
  lines.push(`saved library:   ${corpus ? `${corpus.count} item(s), ${corpus.outlets} outlet(s), ${corpus.complete} full_text` : "file missing"}`);
  lines.push("");

  const blockers: string[] = [];
  if (provider === "retired") blockers.push("ANALYSIS_PROVIDER=grok is retired. Use demo or cursor.");
  else if (provider !== "demo" && provider !== "cursor") blockers.push(`ANALYSIS_PROVIDER='${provider}' is invalid. Use demo or cursor.`);
  else if (provider === "cursor") {
    if (!keyPresent) blockers.push("CURSOR_API_KEY is absent.");
    if (!networkEnabled) blockers.push("CURSOR_ANALYSIS_ALLOW_NETWORK is not 1.");
    if (pinError) blockers.push(`Model pin is invalid (${pinError}).`);
    if (!corpus || corpus.count === 0) blockers.push("Saved library is empty; saved analysis cannot start.");
  }

  if (blockers.length > 0) {
    lines.push("LIVE NOT READY");
    for (const blocker of blockers) lines.push(`  - ${blocker}`);
    lines.push("", "The prepared demonstration briefings still work without a key.");
    process.stdout.write(`${lines.join("\n")}\n`);
    return provider === "cursor" ? 1 : 0;
  }

  if (provider === "demo") {
    lines.push("DEMO READY  Prepared briefings work with no key. Saved analysis needs Cursor mode.");
  } else {
    lines.push("LIVE READY  Saved material analysis will call Cursor. This is not proof of a successful live call.");
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  },
);
