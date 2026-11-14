import assert from "node:assert/strict";
import { test } from "node:test";
import { homeEventCards } from "@/lib/home/feed";
import { LAYOUT_STORY_ID, storyById, storyRecords, storiesForSource } from "@/lib/home/stories";

test("every home card opens a story, and the layout sample has no briefing", () => {
  const cards = homeEventCards();
  assert.equal(cards.length, 3);
  for (const card of cards) {
    const id = card.storyHref.split("/").pop() ?? "";
    const story = storyById(id);
    assert.ok(story, card.storyHref);
    assert.equal(story?.title, card.title);
  }
  const layout = storyById(LAYOUT_STORY_ID);
  assert.equal(layout?.perspectivesHref, null);
  assert.equal(layout?.evidenceHref, null);
  assert.equal(layout?.reportHref, null);
  assert.match(layout?.summary ?? "", /没有分析/);
  assert.equal(layout?.sourceName, null);
});

test("fixture stories keep their own text and only bloomberg matches the source catalog", () => {
  const stories = storyRecords();
  const ids = stories.map((story) => story.id);
  assert.equal(new Set(ids).size, ids.length);
  const bloomberg = storiesForSource("bloomberg");
  assert.ok(bloomberg.length > 0);
  assert.ok(bloomberg.every((story) => story.sampleKind === "saved-fixture-links"));
  assert.ok(bloomberg.every((story) => story.summary.length > 0));
  assert.equal(storiesForSource("bbc").length, 0);
  assert.equal(stories.some((story) => story.catalogSourceId === "variety"), false);
  assert.equal(JSON.stringify(stories).includes("heatScore"), false);
});
