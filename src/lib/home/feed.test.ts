import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { homeEventCards } from "@/lib/home/feed";
import { isLanguage } from "@/lib/i18n/languages";
import { parseUiLanguage, toAnalysisLanguage } from "@/lib/i18n/ui-language";

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

test("interface language keeps the existing cookie and does not send traditional as an analysis language", () => {
  assert.equal(parseUiLanguage(undefined), "zh");
  assert.equal(parseUiLanguage("zh"), "zh");
  assert.equal(parseUiLanguage("en"), "en");
  assert.equal(parseUiLanguage("es"), "es");
  assert.equal(parseUiLanguage("zh-Hant"), "zh-Hant");
  assert.equal(parseUiLanguage("nope"), "zh");
  assert.equal(toAnalysisLanguage("zh-Hant"), "zh");
  assert.equal(toAnalysisLanguage("en"), "en");
  assert.equal(isLanguage("zh-Hant"), false);
});

test("subscribe and me stay unpaid demos, and the language switch names the three scripts", async () => {
  const subscribe = await readFile("src/app/subscribe/page.tsx", "utf8");
  const me = await readFile("src/app/me/page.tsx", "utf8");
  const copy = await readFile("src/lib/i18n/app-pages.ts", "utf8");
  const switcher = await readFile("src/components/layout/language-switch.tsx", "utf8");
  const frame = await readFile("src/components/layout/paper-frame.tsx", "utf8");
  assert.match(subscribe, /SubscribePlans/);
  assert.match(subscribe, /PaperFrame/);
  assert.match(me, /MePanel/);
  assert.match(me, /PaperFrame/);
  assert.match(await readFile("src/components/home/me-panel.tsx", "utf8"), /href="\/settings"/);
  assert.match(copy, /这不是登录成功/);
  assert.match(copy, /這不是登入成功/);
  assert.match(copy, /not a successful sign-in/);
  assert.match(await readFile("src/components/home/subscribe-plans.tsx", "utf8"), /demoBody|noCharge|demoTitle/);
  assert.match(copy, /方案演示/);
  assert.match(copy, /登录演示/);
  assert.match(copy, /登入演示/);
  assert.match(copy, /Plan demo/);
  assert.match(copy, /Sign-in demo/);
  assert.match(copy, /不会出现购买成功/);
  assert.match(copy, /不會出現購買成功/);
  assert.doesNotMatch(copy, /尚未开通/);
  assert.doesNotMatch(copy, /尚未開通/);
  assert.doesNotMatch(copy, /Not open/);
  assert.doesNotMatch(copy, /¥|\$\d|checkout|stripe/i);
  assert.match(switcher, /简体/);
  assert.match(switcher, /繁體/);
  assert.match(switcher, /English/);
  assert.match(switcher, /rememberLanguage/);
  assert.match(frame, /LanguageSwitch/);
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
  assert.match(home, /For You 尚未开通/);
  assert.match(home, /不会扣款/);
  assert.doesNotMatch(home, /方案和登录尚未开通/);
  assert.doesNotMatch(home, /Partially Supported|statusCounts|generatedAt/);
});
