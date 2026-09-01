import test from "node:test";
import assert from "node:assert/strict";
import { tierInfo, stageForScore, fiveYearPlans } from "../js/scorer.js";

test("tierInfo returns name and emoji for every tier", () => {
  assert.deepEqual(tierInfo(100), { name: "Full Marx", emoji: "⭐" });
  assert.deepEqual(tierInfo(85), { name: "Vanguard", emoji: "🚩" });
  assert.deepEqual(tierInfo(60), { name: "Comrade", emoji: "✊" });
  assert.deepEqual(tierInfo(30), { name: "The Masses", emoji: "👥" });
  assert.deepEqual(tierInfo(15), { name: "Utopian", emoji: "💭" });
  assert.deepEqual(tierInfo(10), { name: "False Consciousness", emoji: "🐑" });
  assert.deepEqual(tierInfo(0), { name: "No answer", emoji: "⬛" });
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
