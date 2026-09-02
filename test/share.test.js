import assert from "node:assert/strict";
import test from "node:test";
import { shareText } from "../js/share.js";

test("shareText renders the spec example", () => {
  const rounds = [100, 100, 100, 100, 85, 85, 60];
  assert.equal(shareText(rounds, 630), "Martillion ✊ 630 - Socialism achieved\n⭐⭐⭐⭐🚩🚩✊");
});

test("shareText renders low scores and missed rounds", () => {
  const rounds = [10, 15, 0, 30, 10, 10, 30];
  assert.equal(shareText(rounds, 105), "Martillion ✊ 105 - Stuck in feudalism\n🐑💭⬛👥🐑🐑👥");
});
