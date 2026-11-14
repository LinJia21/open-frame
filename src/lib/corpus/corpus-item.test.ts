import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { handleCorpusGet, handleCorpusImport } from "@/lib/corpus/corpus-http";
import { createCorpusStore } from "@/lib/corpus/store";
import { harborPayload } from "@/lib/corpus/test-fixture";

test("a library item can be read in full, and the list still omits the body", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openframe-corpus-item-"));
  try {
    const store = createCorpusStore(path.join(dir, "items.json"));
    const deps = { store, allowRequest: () => true };
    const imported = await handleCorpusImport(new Request("http://local/api/corpus", { method: "POST", body: JSON.stringify(harborPayload()) }), deps);
    assert.equal(imported.status, 201);
    const listed = await handleCorpusGet(new Request("http://local/api/corpus"), deps);
    const listedBody = (await listed.json()) as { data: { items: Array<{ id: string; body?: string }> } };
    const id = listedBody.data.items[0]?.id ?? "";
    assert.match(id, /^art_[a-z0-9]{12}$/);
    assert.equal(JSON.stringify(listedBody).includes("gives no checked figures"), false);

    const one = await handleCorpusGet(new Request(`http://local/api/corpus?id=${id}`), deps);
    assert.equal(one.status, 200);
    const detail = (await one.json()) as { data: { liveInternetSearch: boolean; item: { body: string; summary: string } } };
    assert.equal(detail.data.liveInternetSearch, false);
    assert.match(detail.data.item.body, /gives no checked figures/);
    assert.match(detail.data.item.summary, /test fixture summary/i);

    const missing = await handleCorpusGet(new Request("http://local/api/corpus?id=art_missing0000"), deps);
    assert.equal(missing.status, 404);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
