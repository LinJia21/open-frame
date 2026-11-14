import assert from "node:assert/strict";
import { test } from "node:test";
import { leadStoryHref, parseLeadQuery } from "@/lib/home/lead-story";

const STORIES = [
  { id: "art_bloomberg_one", title: "Bloomberg charts the cost of an animated feature", sourceDomain: "bloomberg.com" },
];

test("a lead query only accepts a known source and a real title", () => {
  assert.equal(parseLeadQuery({ source: "nope", title: "Hello there" }), null);
  assert.equal(parseLeadQuery({ source: "bbc", title: " " }), null);
  assert.equal(parseLeadQuery({ source: "bbc", title: "x".repeat(301) }), null);
  const lead = parseLeadQuery({ source: "bbc", title: "  Ports  and  queues ", date: "2026-11-01", url: "https://www.bbc.com/news/story" });
  assert.equal(lead?.sourceId, "bbc");
  assert.equal(lead?.title, "Ports and queues");
  assert.equal(lead?.date, "2026-11-01");
  assert.equal(lead?.url, "https://www.bbc.com/news/story");
  assert.equal(parseLeadQuery({ source: "bbc", title: "Ports", date: "yesterday", url: "javascript:alert(1)" })?.url, null);
});

test("search cards open a fixture story only when the title and catalog domain match", () => {
  const href = leadStoryHref(
    {
      sourceId: "bloomberg",
      title: "Bloomberg charts the cost of an animated feature",
      publishedAt: "2026-05-01T00:00:00Z",
      url: "https://www.bloomberg.com/news/story",
    },
    STORIES,
  );
  assert.equal(href, "/stories/art_bloomberg_one");
  const miss = leadStoryHref(
    { sourceId: "bbc", title: "zzzz-not-a-title", publishedAt: null, url: "https://www.bbc.com/news/zzzz" },
    STORIES,
  );
  assert.match(miss, /^\/stories\/lead\?/);
  assert.match(miss, /source=bbc/);
  assert.doesNotMatch(miss, /art_bloomberg_one/);
});
