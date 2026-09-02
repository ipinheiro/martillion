import assert from "node:assert/strict";
import test from "node:test";
import { TOPIC_LABELS, TOPICS, topicLabel } from "../js/topics.js";

test("TOPICS lists the six slugs in display order", () => {
  assert.deepEqual(
    [...TOPICS],
    ["animals-nature", "films-tv", "books-stories", "the-world", "psychology", "theory-revolution"],
  );
});

test("every topic has a label and the labels are unique", () => {
  assert.deepEqual([...TOPIC_LABELS.keys()], [...TOPICS]);
  assert.equal(new Set(TOPIC_LABELS.values()).size, TOPICS.length);
});

test("topicLabel returns the label and throws on an unknown slug", () => {
  assert.equal(topicLabel("films-tv"), "Films & TV");
  assert.throws(() => topicLabel("constructor"), /Unknown topic/);
});
