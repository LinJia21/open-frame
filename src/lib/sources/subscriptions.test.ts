import assert from "node:assert/strict";
import test from "node:test";
import { NEWS_SOURCES, SOURCE_CATEGORIES, sourceTitle } from "./catalog";
import {
  SUBSCRIPTION_STORAGE_KEY,
  defaultSourceIds,
  normalizeSourceIds,
  readSourceIds,
  writeSourceIds,
} from "./subscriptions";

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    read: (key: string) => data.get(key) ?? null,
  };
}

test("every source has a logo and belongs to exactly one visible category", () => {
  const categoryIds = new Set(SOURCE_CATEGORIES.map((category) => category.id));
  assert.equal(categoryIds.size, SOURCE_CATEGORIES.length);
  assert.equal(new Set(NEWS_SOURCES.map((source) => source.logo)).size, NEWS_SOURCES.length);
  for (const source of NEWS_SOURCES) {
    assert.ok(categoryIds.has(source.category), `${source.id} has unknown category`);
    assert.match(source.logo, new RegExp(`^/sources/${source.id}\\.png$`));
  }
  const grouped = SOURCE_CATEGORIES.flatMap((category) => NEWS_SOURCES.filter((source) => source.category === category.id));
  assert.equal(grouped.length, NEWS_SOURCES.length);
});

test("source titles follow the interface language", () => {
  const ap = NEWS_SOURCES.find((source) => source.id === "ap");
  const bbc = NEWS_SOURCES.find((source) => source.id === "bbc");
  assert.ok(ap && bbc);
  assert.equal(sourceTitle(ap, "zh"), "AP 美联社");
  assert.equal(sourceTitle(ap, "zh-Hant"), "AP 美聯社");
  assert.equal(sourceTitle(ap, "en"), "AP");
  assert.equal(sourceTitle(bbc, "zh-Hant"), "BBC");
  assert.equal(sourceTitle(bbc, "en"), "BBC");
});

test("no stored choice means every source is subscribed", () => {
  assert.deepEqual(readSourceIds(storage()), NEWS_SOURCES.map((source) => source.id));
  assert.deepEqual(readSourceIds(null), defaultSourceIds());
});

test("stored choices keep known ids, drop duplicates and unknown ids, and an empty list stays empty", () => {
  const store = storage({ [SUBSCRIPTION_STORAGE_KEY]: JSON.stringify(["bbc", "bbc", "unknown", 3, "iaea"]) });
  assert.deepEqual(readSourceIds(store), ["bbc", "iaea"]);
  assert.deepEqual(readSourceIds(storage({ [SUBSCRIPTION_STORAGE_KEY]: "[]" })), []);
  assert.deepEqual(readSourceIds(storage({ [SUBSCRIPTION_STORAGE_KEY]: "not json" })), defaultSourceIds());
  assert.deepEqual(readSourceIds(storage({ [SUBSCRIPTION_STORAGE_KEY]: "{}" })), defaultSourceIds());
  assert.deepEqual(normalizeSourceIds("bbc"), defaultSourceIds());
});

test("writing normalizes before saving", () => {
  const store = storage();
  writeSourceIds(store, ["reuters", "evil", "reuters"]);
  assert.equal(store.read(SUBSCRIPTION_STORAGE_KEY), JSON.stringify(["reuters"]));
  writeSourceIds(null, ["bbc"]);
});
