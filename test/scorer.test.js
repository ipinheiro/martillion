import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORED_POINTS,
  fiveYearPlans,
  NO_ANSWER,
  stageForScore,
  TIERS,
  TOP_TIER,
  tierById,
  tierForAuthored,
  UTOPIAN,
} from "../js/scorer.js";

test("TIERS carries the full vocabulary, rarest first", () => {
  assert.deepEqual(
    TIERS.map((tier) => [tier.id, tier.name, tier.points, tier.emoji]),
    [
      ["full-marx", "Full Marx", 100, "⭐"],
      ["vanguard", "Vanguard", 85, "🚩"],
      ["comrade", "Comrade", 60, "✊"],
      ["masses", "The Masses", 30, "👥"],
      ["false-consciousness", "False Consciousness", 10, "🐑"],
      ["utopian", "Utopian", 0, "💭"],
      ["no-answer", "No answer", 0, "⬛"],
    ],
  );
});

test("the vocabulary is frozen", () => {
  assert.throws(() => {
    TIERS[0].name = "Mutated";
  }, TypeError);
  assert.throws(() => {
    TIERS.push(TIERS[0]);
  }, TypeError);
});

test("named tiers point into the vocabulary", () => {
  assert.equal(TOP_TIER, TIERS[0]);
  assert.equal(UTOPIAN.id, "utopian");
  assert.equal(NO_ANSWER.id, "no-answer");
  assert.equal(UTOPIAN.points, 0);
  assert.equal(NO_ANSWER.points, 0);
});

test("tierById finds every tier and throws otherwise", () => {
  for (const tier of TIERS) assert.equal(tierById(tier.id), tier);
  assert.throws(() => tierById("constructor"), /Unknown tier id/);
});

test("AUTHORED_POINTS are the positive tiers and tierForAuthored maps each one", () => {
  assert.deepEqual([...AUTHORED_POINTS], [100, 85, 60, 30, 10]);
  for (const points of AUTHORED_POINTS) assert.equal(tierForAuthored(points).points, points);
  assert.throws(() => tierForAuthored(15), /Unknown authored tier/);
  assert.throws(() => tierForAuthored(0), /Unknown authored tier/);
  assert.throws(() => tierForAuthored(Number.NaN), /Unknown authored tier/);
});

test("stageForScore maps boundary scores to stages", () => {
  assert.equal(stageForScore(0).name, "Feudalism");
  assert.equal(stageForScore(199).name, "Feudalism");
  assert.equal(stageForScore(200).name, "Capitalism");
  assert.equal(stageForScore(349).name, "Capitalism");
  assert.equal(stageForScore(350).name, "Revolution brewing");
  assert.equal(stageForScore(499).name, "Revolution brewing");
  assert.equal(stageForScore(500).name, "Socialism");
  assert.equal(stageForScore(649).name, "Socialism");
  assert.equal(stageForScore(650).name, "Full communism");
  assert.equal(stageForScore(700).name, "Full communism");
});

test("stageForScore throws on scores that are not a non-negative finite number", () => {
  assert.throws(() => stageForScore(-1), /Invalid score/);
  assert.throws(() => stageForScore(Number.NaN), /Invalid score/);
});

test("stages carry verdict and flavour text", () => {
  assert.equal(stageForScore(630).verdict, "Socialism achieved");
  assert.equal(stageForScore(100).flavour, "The material conditions were not yet ripe.");
});

test("fiveYearPlans counts completed plans and progress", () => {
  assert.deepEqual(fiveYearPlans(0), { completed: 0, progress: 0, target: 2000 });
  assert.deepEqual(fiveYearPlans(1999), { completed: 0, progress: 1999, target: 2000 });
  assert.deepEqual(fiveYearPlans(2000), { completed: 1, progress: 0, target: 2000 });
  assert.deepEqual(fiveYearPlans(4001), { completed: 2, progress: 1, target: 2000 });
});
