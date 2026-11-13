import assert from "node:assert/strict";
import { test } from "node:test";
import { PREPARED_REPORT_HREF, matchPreparedTopic } from "@/lib/demo/topic-match";

test("sample keywords route to the prepared sample report", () => {
  assert.equal(matchPreparedTopic("Is AI-generated animation disrupting film?"), "sample");
  assert.equal(matchPreparedTopic("  AI GENERATED ANIMATION  "), "sample");
  assert.equal(matchPreparedTopic("Critterz first look"), "sample");
  assert.equal(matchPreparedTopic("人工智能生成的动画"), "sample");
  assert.equal(PREPARED_REPORT_HREF.sample, "/analysis/bnd_ai_animation_2026/perspectives");
});

test("demo keywords route to the fictional demonstration report", () => {
  assert.equal(matchPreparedTopic("Plumvale Toonworks"), "demo");
  assert.equal(matchPreparedTopic("harbor trade talks"), "demo");
  assert.equal(matchPreparedTopic("fictional demonstration"), "demo");
  assert.equal(PREPARED_REPORT_HREF.demo, "/analysis/bnd_demo_ai_animation/perspectives");
});

test("unmatched queries do not jump anywhere", () => {
  assert.equal(matchPreparedTopic("central bank rates"), null);
  assert.equal(matchPreparedTopic(""), null);
});
