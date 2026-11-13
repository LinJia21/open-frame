import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { homeEventCards } from "@/lib/home/feed";

test("homepage cards keep fixture dates and do not invent heat or share one analysis id", () => {
  const cards = homeEventCards();
  assert.equal(cards.length, 3);
  const [sample, demo, layout] = cards;
  assert.equal(sample?.perspectivesHref, "/analysis/bnd_ai_animation_2026/perspectives");
  assert.equal(demo?.perspectivesHref, "/analysis/bnd_demo_ai_animation/perspectives");
  assert.equal(layout?.perspectivesHref, null);
  assert.equal(layout?.evidenceHref, null);
  assert.notEqual(sample?.bundleId, demo?.bundleId);
  assert.equal(sample?.sampleKind, "saved-fixture-links");
  assert.equal(demo?.sampleKind, "fictional-demo");
  assert.equal(layout?.sampleKind, "layout-sample");
  assert.equal(sample?.generatedAt, "2026-11-12T15:00:00+08:00");
  assert.equal(demo?.generatedAt, "2026-11-12T15:02:00+08:00");
  assert.equal(sample?.sourceName, "Variety");
  assert.equal(sample?.sourceDate, "2026-05-15");
  assert.equal(demo?.sourceDate, "2026-04-15");
  assert.match(demo?.sourceName ?? "", /fictional/i);
  assert.equal(layout?.sourceName, null);
  assert.equal(layout?.sourceDate, null);
  assert.ok((sample?.articleCount ?? 0) > 1);
  assert.ok((sample?.outletCount ?? 0) > 1);
  assert.ok((sample?.outletCount ?? 0) < (sample?.articleCount ?? 0));
  assert.equal(sample?.datedFrom, "2023-11-09");
  assert.equal(JSON.stringify(cards).includes("heatScore"), false);
  assert.ok(sample?.statusCounts.some((item) => item.status === "Unverified"));
  assert.ok((sample?.title.length ?? 0) > 60);
  assert.notEqual(sample?.title, demo?.title);
  assert.match(sample?.title ?? "", /Cannes Buzz/);
  assert.match(demo?.title ?? "", /Employment Bulletin/);
  assert.doesNotMatch(demo?.title ?? "", /\[DEMO — fictional\]/);
  assert.match(layout?.title ?? "", /虚构/);
});

test("the app menu names home, library, subscribe, and me", async () => {
  const dock = await readFile("src/components/layout/page-dock.tsx", "utf8");
  assert.match(dock, /首页/);
  assert.match(dock, /资料库/);
  assert.match(dock, /订阅/);
  assert.match(dock, /我的/);
  assert.doesNotMatch(dock, /没有名称/);
});

test("the news home does not request geolocation or put fixture counts on the cards", async () => {
  const files = ["src/components/home/news-home.tsx", "src/app/page.tsx", "src/app/settings/page.tsx"];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.equal(/geolocation|navigator\.geolocation/i.test(text), false, file);
  }
  const home = await readFile("src/components/home/news-home.tsx", "utf8");
  assert.match(home, /暂无数据/);
  assert.match(home, /演示示例 · 非实时/);
  assert.doesNotMatch(home, /Partially Supported|statusCounts|generatedAt/);
});
