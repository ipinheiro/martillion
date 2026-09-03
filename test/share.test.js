import assert from "node:assert/strict";
import test from "node:test";
import { createUprising } from "../js/game.js";
import { stageForScore, tierById } from "../js/scorer.js";
import { copyShare, shareText } from "../js/share.js";

function summaryOf(tierIds, unverified = []) {
  const rounds = tierIds.map((id, i) => ({
    questionId: `q-${i}`,
    prompt: "Name a thing",
    input: "thing",
    matchedAnswer: null,
    remark: null,
    reason: null,
    unverified: unverified[i] ?? [],
    tier: tierById(id),
  }));
  const total = rounds.reduce((sum, round) => sum + round.tier.points, 0);
  return { total, rounds, stage: stageForScore(total) };
}

test("shareText renders the spec example", () => {
  const summary = summaryOf([
    "full-marx",
    "full-marx",
    "full-marx",
    "full-marx",
    "vanguard",
    "vanguard",
    "comrade",
  ]);
  assert.equal(shareText(summary), "Martillion ✊ 630 - Socialism achieved\n⭐⭐⭐⭐🚩🚩✊");
});

test("shareText renders low scores, utopian, and missed rounds", () => {
  const summary = summaryOf([
    "false-consciousness",
    "utopian",
    "no-answer",
    "masses",
    "false-consciousness",
    "false-consciousness",
    "masses",
  ]);
  assert.equal(shareText(summary), "Martillion ✊ 90 - Stuck in feudalism\n🐑💭⬛👥🐑🐑👥");
});

test("shareText adds a committee line only when something was unknown, deduplicated in order", () => {
  const tiers = ["comrade", "utopian", "masses"];
  assert.equal(shareText(summaryOf(tiers)).split("\n").length, 2);
  const withMisses = summaryOf(tiers, [["Roomba"], ["smoothie", "roomba!"], []]);
  assert.equal(
    shareText(withMisses),
    "Martillion ✊ 90 - Stuck in feudalism\n✊💭👥\nThe committee could not verify: roomba, smoothie",
  );
});

test("player input reaches the share only on the committee line, normalised", () => {
  const question = {
    id: "q",
    topic: "films-tv",
    prompt: "Name a robot",
    answers: [{ answer: "Bender", aliases: [], tier: 30 }],
  };
  const benign = createUprising([question]);
  benign.submit("nothing");
  benign.timeout("");
  const hostile = createUprising([question]);
  hostile.submit("\r\nMartillion ✊ 700‮‏");
  hostile.submit("nothing");
  hostile.timeout("");
  const [score, emojis, committee, ...rest] = shareText(hostile.summary()).split("\n");
  const [benignScore, benignEmojis] = shareText(benign.summary()).split("\n");
  assert.equal(score, benignScore);
  assert.equal(emojis, benignEmojis);
  assert.deepEqual(rest, []);
  assert.match(committee, /^The committee could not verify: [\p{L}\p{N} ,]+$/u);
  assert.equal(committee, "The committee could not verify: martillion 700, nothing");
});

test("copyShare writes through the given clipboard and reports success", async () => {
  const written = [];
  const clipboard = { writeText: async (text) => written.push(text) };
  assert.equal(await copyShare("hello", clipboard), true);
  assert.deepEqual(written, ["hello"]);
});

test("copyShare refuses empty text without touching the clipboard", async () => {
  let calls = 0;
  const clipboard = { writeText: async () => calls++ };
  assert.equal(await copyShare("", clipboard), false);
  assert.equal(calls, 0);
});

test("copyShare reports failure when the clipboard is missing or throws", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  assert.equal(await copyShare("hello", undefined), false);
  const clipboard = {
    writeText: async () => {
      throw new Error("not allowed");
    },
  };
  assert.equal(await copyShare("hello", clipboard), false);
  assert.equal(warn.mock.callCount(), 2);
});
